import { ImportMastersService } from './import-masters.service';
import { UnitOfWorkService } from '../../infrastructure/persistence/unit-of-work/unit-of-work.service';
import { PartyType, ItemType, PartyRegistrationType } from '@platform/shared-types';

describe('ImportMastersService - Pre-Flight Missing Masters Scanner', () => {
  let service: ImportMastersService;
  let mockUow: Partial<UnitOfWorkService>;

  beforeEach(() => {
    mockUow = {
      executeInTransaction: jest.fn().mockImplementation(async (cb) => {
        const mockQr = {
          manager: {
            find: jest.fn().mockImplementation((entity: any) => {
              if (entity.name === 'PartyOrmEntity') {
                return Promise.resolve([
                  { id: 'p1', name: 'Existing Customer Ltd', gstin: '27AAACT2727Q1ZW' },
                ]);
              }
              if (entity.name === 'ItemOrmEntity') {
                return Promise.resolve([
                  { id: 'i1', name: 'Existing Widget', itemCode: 'ITEM-0001' },
                ]);
              }
              return Promise.resolve([]);
            }),
            count: jest.fn().mockResolvedValue(1),
            create: jest.fn().mockImplementation((entity, data) => ({ ...data, id: 'mock-id' })),
            save: jest.fn().mockImplementation((entity, data) => Promise.resolve(data)),
            createQueryBuilder: jest.fn().mockReturnValue({
              innerJoin: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getOne: jest.fn().mockResolvedValue({ id: 'led-1', name: 'Default Ledger' }),
            }),
          },
        };
        return cb(mockQr);
      }),
    };

    service = new ImportMastersService(mockUow as UnitOfWorkService);
  });

  it('should scan rows and accurately detect missing parties and items vs existing ones', async () => {
    const rawRows = [
      {
        'Customer Name': 'Existing Customer Ltd',
        'Customer GSTIN': '27AAACT2727Q1ZW',
        'Item Name': 'Existing Widget',
        'Unit (UQC)': 'NOS',
        'Tax Rate %': '18',
      },
      {
        'Customer Name': 'Brand New Tech Solutions',
        'Customer GSTIN': '29AAACI4567M1Z3', // Karnataka GSTIN
        'Item Name': 'Server Rack 42U',
        'HSN / SAC Code': '8471',
        'Unit (UQC)': 'NOS',
        'Tax Rate %': '18',
        'Unit Price / Rate': '85000',
      },
      {
        'Customer Name': 'Unregistered Retail Buyer',
        'Place of Supply': '27',
        'Item Name': 'Consulting Retainer',
        'HSN / SAC Code': '998311',
        'Unit (UQC)': 'HRS',
        'Tax Rate %': '18',
      },
    ];

    const scan = await service.scanMissingMasters(
      'tenant-1',
      'company-1',
      rawRows,
      'SALES',
    );

    expect(scan.hasMissingMasters).toBe(true);
    expect(scan.existingPartiesCount).toBe(1);
    expect(scan.existingItemsCount).toBe(1);

    // Missing Parties verification
    expect(scan.missingParties.length).toBe(2);

    const newTech = scan.missingParties.find((p) => p.name === 'Brand New Tech Solutions');
    expect(newTech).toBeDefined();
    expect(newTech?.stateCode).toBe('29'); // Inferred from GSTIN 29AAACI4567M1Z3
    expect(newTech?.registrationType).toBe(PartyRegistrationType.REGULAR);

    const unreg = scan.missingParties.find((p) => p.name === 'Unregistered Retail Buyer');
    expect(unreg).toBeDefined();
    expect(unreg?.registrationType).toBe(PartyRegistrationType.UNREGISTERED);
    expect(unreg?.stateCode).toBe('27');

    // Missing Items verification
    expect(scan.missingItems.length).toBe(2);

    const goodsItem = scan.missingItems.find((i) => i.name === 'Server Rack 42U');
    expect(goodsItem).toBeDefined();
    expect(goodsItem?.itemType).toBe(ItemType.GOODS);
    expect(goodsItem?.uqc).toBe('NOS');

    const serviceItem = scan.missingItems.find((i) => i.name === 'Consulting Retainer');
    expect(serviceItem).toBeDefined();
    expect(serviceItem?.itemType).toBe(ItemType.SERVICES);
    expect(serviceItem?.uqc).toBe('HRS');
  });

  it('should bulk resolve and create missing masters with pre-filled defaults', async () => {
    const result = await service.bulkResolveMasters('tenant-1', 'company-1', {
      parties: [
        {
          name: 'New Client Inc',
          partyType: PartyType.CUSTOMER,
          gstin: '27AAPFU0939F1ZV',
          stateCode: '27',
        },
      ],
      items: [
        {
          name: 'Custom Fabricated Sheet',
          itemType: ItemType.GOODS,
          hsnSac: '7210',
          uqc: 'KGS',
          taxRate: 18,
          price: 450,
        },
      ],
    });

    expect(result.createdParties).toBe(1);
    expect(result.createdItems).toBe(1);
  });
});
