import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { UnitOfWorkService } from '../../infrastructure/persistence/unit-of-work/unit-of-work.service';
import { PartyOrmEntity } from '../../infrastructure/persistence/entities/party.orm-entity';
import { PartyRegistrationOrmEntity } from '../../infrastructure/persistence/entities/party-registration.orm-entity';
import { PartyAddressOrmEntity } from '../../infrastructure/persistence/entities/party-address.orm-entity';
import { PartyLedgerLinkOrmEntity } from '../../infrastructure/persistence/entities/party-ledger-link.orm-entity';
import { LedgerOrmEntity } from '../../infrastructure/persistence/entities/ledger.orm-entity';
import { InvoiceOrmEntity } from '../../infrastructure/persistence/entities/invoice.orm-entity';
import {
  PartyType,
  PartyRegistrationType,
  RegistrationStatus,
  AddressType,
  PartyLedgerLinkType,
  PartyDto,
} from '@platform/shared-types';
import { validatePartyRegistrationData } from '@platform/gst-rules';
import { NumberingService } from '../numbering/numbering.service';
import { Decimal } from 'decimal.js';

@Injectable()
export class PartyService {
  constructor(
    private readonly uow: UnitOfWorkService,
    @Optional() private readonly numberingService?: NumberingService,
  ) {}

  async listParties(
    tenantId: string,
    companyId: string,
    partyType?: PartyType,
  ): Promise<PartyDto[]> {
    return this.uow.executeInTransaction(async (qr) => {
      const qb = qr.manager
        .createQueryBuilder(PartyOrmEntity, 'party')
        .leftJoinAndSelect('party.ledger', 'ledger')
        .leftJoinAndSelect('party.registrations', 'registrations')
        .leftJoinAndSelect('party.addresses', 'addresses')
        .where('party.tenant_id = :tenantId', { tenantId })
        .andWhere('party.company_id = :companyId', { companyId })
        .andWhere('party.is_active = true');

      if (partyType) {
        qb.andWhere('(party.party_type = :partyType OR party.party_type = :bothType)', {
          partyType,
          bothType: PartyType.BOTH,
        });
      }

      qb.orderBy('party.name', 'ASC');
      const entities = await qb.getMany();

      return entities.map((p) => this.toDto(p));
    });
  }

  async getParty(
    tenantId: string,
    companyId: string,
    partyId: string,
  ): Promise<PartyDto> {
    return this.uow.executeInTransaction(async (qr) => {
      const party = await qr.manager.findOne(PartyOrmEntity, {
        where: { id: partyId, tenantId, companyId },
        relations: ['ledger', 'registrations', 'addresses'],
      });

      if (!party) {
        throw new NotFoundException(`Party with ID '${partyId}' not found.`);
      }

      return this.toDto(party);
    });
  }

  async createParty(
    tenantId: string,
    companyId: string,
    dto: PartyDto,
  ): Promise<PartyDto> {
    const regType = dto.registrationType || (dto.gstin ? PartyRegistrationType.REGULAR : PartyRegistrationType.UNREGISTERED);

    // 1. Strict Statutory Registration Validation
    const validation = validatePartyRegistrationData({
      registrationType: regType,
      gstin: dto.gstin,
      stateCode: dto.billingStateCode,
      pan: dto.pan,
    });

    if (!validation.isValid) {
      throw new BadRequestException(`Party registration validation failed: ${validation.errors.join('; ')}`);
    }

    const cleanGstin = validation.normalizedGstin || null;
    const resolvedStateCode = validation.stateCode || dto.billingStateCode || '27';
    const resolvedPan = validation.pan || dto.pan?.trim().toUpperCase() || null;

    return this.uow.executeInTransaction(async (qr) => {
      // 2. Duplicate Detection
      if (cleanGstin) {
        const existingWithGstin = await qr.manager.findOne(PartyOrmEntity, {
          where: { companyId, gstin: cleanGstin, isActive: true },
        });
        if (existingWithGstin) {
          throw new BadRequestException(
            `A counterparty with GSTIN '${cleanGstin}' already exists in this company: ${existingWithGstin.name} (${existingWithGstin.partyCode || existingWithGstin.id}).`,
          );
        }
      }

      // 3. Allocate party code if not supplied
      let partyCode = dto.partyCode?.trim();
      if (!partyCode) {
        const prefix = dto.partyType === PartyType.VENDOR ? 'VEND' : dto.partyType === PartyType.CUSTOMER ? 'CUST' : 'PRTY';
        const count = await qr.manager.count(PartyOrmEntity, { where: { companyId } });
        partyCode = `${prefix}-${String(count + 1).padStart(4, '0')}`;
      }

      // 4. Ledger Association
      let ledgerId = dto.ledgerId;
      if (!ledgerId) {
        const groupPattern = dto.partyType === PartyType.VENDOR ? '%Creditor%' : '%Debtor%';
        const defaultLedger = await qr.manager
          .createQueryBuilder(LedgerOrmEntity, 'ledger')
          .innerJoin('ledger.group', 'grp')
          .where('ledger.tenant_id = :tenantId', { tenantId })
          .andWhere('ledger.company_id = :companyId', { companyId })
          .andWhere('grp.name ILIKE :groupPattern', { groupPattern })
          .getOne();

        if (defaultLedger) {
          ledgerId = defaultLedger.id;
        }
      }

      // 5. Persist Party Master Entity
      const party = qr.manager.create(PartyOrmEntity, {
        tenantId,
        companyId,
        partyCode,
        name: dto.name.trim(),
        tradeName: dto.tradeName?.trim() || undefined,
        partyType: dto.partyType || PartyType.CUSTOMER,
        registrationType: regType,
        currency: dto.currency || 'INR',
        gstin: cleanGstin || undefined,
        pan: resolvedPan || undefined,
        email: dto.email?.trim() || undefined,
        phone: dto.phone?.trim() || undefined,
        billingAddressLine1: dto.billingAddressLine1?.trim() || undefined,
        billingAddressLine2: dto.billingAddressLine2?.trim() || undefined,
        billingCity: dto.billingCity?.trim() || undefined,
        billingState: dto.billingState?.trim() || undefined,
        billingStateCode: resolvedStateCode,
        billingPincode: dto.billingPincode?.trim() || undefined,
        shippingAddressLine1: dto.shippingAddressLine1?.trim() || dto.billingAddressLine1?.trim() || undefined,
        shippingCity: dto.shippingCity?.trim() || dto.billingCity?.trim() || undefined,
        shippingStateCode: dto.shippingStateCode || resolvedStateCode,
        shippingPincode: dto.shippingPincode?.trim() || dto.billingPincode?.trim() || undefined,
        creditLimit: new Decimal(dto.creditLimit || 0),
        paymentTermsDays:
          dto.paymentTermsDays !== undefined &&
          dto.paymentTermsDays !== null &&
          dto.paymentTermsDays !== ('' as any)
            ? Number(dto.paymentTermsDays)
            : 0,
        ledgerId,
        isActive: true,
      });

      const savedParty = await qr.manager.save(party);

      // 6. Create Party Registration Entry
      const registration = qr.manager.create(PartyRegistrationOrmEntity, {
        tenantId,
        companyId,
        partyId: savedParty.id,
        registrationType: regType,
        gstin: cleanGstin,
        stateCode: resolvedStateCode,
        legalName: savedParty.name,
        tradeName: savedParty.tradeName || null,
        status: RegistrationStatus.ACTIVE,
      });
      await qr.manager.save(registration);

      // 7. Create Default Billing & Shipping Address Entries
      if (dto.billingAddressLine1) {
        const billingAddress = qr.manager.create(PartyAddressOrmEntity, {
          tenantId,
          companyId,
          partyId: savedParty.id,
          registrationId: registration.id,
          addressType: AddressType.BILLING,
          label: 'Primary Billing Office',
          addressLine1: dto.billingAddressLine1.trim(),
          addressLine2: dto.billingAddressLine2?.trim() || null,
          city: dto.billingCity?.trim() || 'City',
          stateCode: resolvedStateCode,
          pincode: dto.billingPincode?.trim() || '000000',
          country: 'IND',
          isDefaultBilling: true,
          isDefaultShipping: !dto.shippingAddressLine1,
        });
        await qr.manager.save(billingAddress);
      }

      if (dto.shippingAddressLine1) {
        const shippingAddress = qr.manager.create(PartyAddressOrmEntity, {
          tenantId,
          companyId,
          partyId: savedParty.id,
          registrationId: registration.id,
          addressType: AddressType.SHIPPING,
          label: 'Primary Shipping Delivery',
          addressLine1: dto.shippingAddressLine1.trim(),
          city: dto.shippingCity?.trim() || 'City',
          stateCode: dto.shippingStateCode || resolvedStateCode,
          pincode: dto.shippingPincode?.trim() || '000000',
          country: 'IND',
          isDefaultBilling: false,
          isDefaultShipping: true,
        });
        await qr.manager.save(shippingAddress);
      }

      // 8. Create Party Ledger Link
      if (ledgerId) {
        const linkType =
          dto.partyType === PartyType.VENDOR
            ? PartyLedgerLinkType.PAYABLE_CREDITOR
            : PartyLedgerLinkType.RECEIVABLE_DEBTOR;
        const link = qr.manager.create(PartyLedgerLinkOrmEntity, {
          tenantId,
          companyId,
          partyId: savedParty.id,
          ledgerId,
          linkType,
        });
        await qr.manager.save(link);
      }

      return this.toDto(savedParty);
    });
  }

  async updateParty(
    tenantId: string,
    companyId: string,
    partyId: string,
    dto: Partial<PartyDto>,
  ): Promise<PartyDto> {
    return this.uow.executeInTransaction(async (qr) => {
      const party = await qr.manager.findOne(PartyOrmEntity, {
        where: { id: partyId, tenantId, companyId },
        relations: ['registrations', 'addresses'],
      });

      if (!party) {
        throw new NotFoundException(`Party with ID '${partyId}' not found.`);
      }

      const nextRegType = dto.registrationType || party.registrationType;
      const nextGstin = dto.gstin !== undefined ? dto.gstin : party.gstin;
      const nextStateCode = dto.billingStateCode || party.billingStateCode;
      const nextPan = dto.pan !== undefined ? dto.pan : party.pan;

      // Validate transition
      const validation = validatePartyRegistrationData({
        registrationType: nextRegType,
        gstin: nextGstin,
        stateCode: nextStateCode,
        pan: nextPan,
      });

      if (!validation.isValid) {
        throw new BadRequestException(`Invalid party update: ${validation.errors.join('; ')}`);
      }

      if (dto.name !== undefined) party.name = dto.name.trim();
      if (dto.tradeName !== undefined) party.tradeName = dto.tradeName?.trim() || undefined;
      if (dto.partyType !== undefined) party.partyType = dto.partyType;
      party.registrationType = nextRegType;
      party.gstin = validation.normalizedGstin || undefined;
      if (dto.pan !== undefined) party.pan = validation.pan || undefined;
      if (dto.email !== undefined) party.email = dto.email.trim();
      if (dto.phone !== undefined) party.phone = dto.phone.trim();
      if (dto.currency !== undefined) party.currency = dto.currency;
      if (dto.billingAddressLine1 !== undefined) party.billingAddressLine1 = dto.billingAddressLine1;
      if (dto.billingAddressLine2 !== undefined) party.billingAddressLine2 = dto.billingAddressLine2;
      if (dto.billingCity !== undefined) party.billingCity = dto.billingCity;
      if (dto.billingState !== undefined) party.billingState = dto.billingState;
      if (dto.billingStateCode !== undefined) party.billingStateCode = dto.billingStateCode;
      if (dto.billingPincode !== undefined) party.billingPincode = dto.billingPincode;
      if (dto.creditLimit !== undefined) party.creditLimit = new Decimal(dto.creditLimit || 0);
      if (dto.paymentTermsDays !== undefined) party.paymentTermsDays = dto.paymentTermsDays ? Number(dto.paymentTermsDays) : 0;
      if (dto.ledgerId !== undefined) party.ledgerId = dto.ledgerId;
      if (dto.isActive !== undefined) party.isActive = dto.isActive;

      const updated = await qr.manager.save(party);
      return this.toDto(updated);
    });
  }

  async deleteParty(
    tenantId: string,
    companyId: string,
    partyId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.uow.executeInTransaction(async (qr) => {
      const party = await qr.manager.findOne(PartyOrmEntity, {
        where: { id: partyId, tenantId, companyId },
      });

      if (!party) {
        throw new NotFoundException(`Party with ID '${partyId}' not found.`);
      }

      // Accounting Protection Invariant: Check if transactions or invoices exist for this counterparty
      const invoiceCount = await qr.manager.count(InvoiceOrmEntity, {
        where: { partyId, companyId },
      });

      if (invoiceCount > 0) {
        throw new BadRequestException(
          `Cannot hard-delete counterparty '${party.name}' because ${invoiceCount} posted invoice(s) exist. In double-entry accounting, counterparties with transactions must not be removed to maintain balanced financial records. You may deactivate this counterparty instead.`,
        );
      }

      // Safe soft-delete / deactivation
      party.isActive = false;
      await qr.manager.save(party);

      return {
        success: true,
        message: `Counterparty '${party.name}' has been successfully removed.`,
      };
    });
  }

  private toDto(p: PartyOrmEntity): PartyDto {
    return {
      id: p.id,
      tenantId: p.tenantId,
      companyId: p.companyId,
      partyCode: p.partyCode,
      name: p.name,
      tradeName: p.tradeName,
      partyType: p.partyType,
      registrationType: p.registrationType,
      currency: p.currency,
      gstin: p.gstin,
      pan: p.pan,
      email: p.email,
      phone: p.phone,
      billingAddressLine1: p.billingAddressLine1,
      billingAddressLine2: p.billingAddressLine2,
      billingCity: p.billingCity,
      billingState: p.billingState,
      billingStateCode: p.billingStateCode,
      billingPincode: p.billingPincode,
      shippingAddressLine1: p.shippingAddressLine1,
      shippingCity: p.shippingCity,
      shippingStateCode: p.shippingStateCode,
      shippingPincode: p.shippingPincode,
      creditLimit: p.creditLimit ? p.creditLimit.toFixed(2) : '0.00',
      paymentTermsDays: p.paymentTermsDays,
      ledgerId: p.ledgerId,
      isActive: p.isActive,
      createdAt: p.createdAt?.toISOString(),
      updatedAt: p.updatedAt?.toISOString(),
    };
  }
}
