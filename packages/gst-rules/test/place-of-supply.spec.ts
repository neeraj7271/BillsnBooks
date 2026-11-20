import { resolvePlaceOfSupply } from '../src/place-of-supply';
import { SupplyType } from '@platform/shared-types';

describe('Place of Supply Resolver', () => {
  it('should identify intra-state supply for same state code', () => {
    const res = resolvePlaceOfSupply({
      supplierStateCode: '27', // Maharashtra
      placeOfSupplyStateCode: '27',
    });

    expect(res.supplyType).toBe(SupplyType.INTRA_STATE);
    expect(res.requiresIgst).toBe(false);
    expect(res.isUtgst).toBe(false);
  });

  it('should identify UTGST for Union Territory without legislature', () => {
    const res = resolvePlaceOfSupply({
      supplierStateCode: '04', // Chandigarh
      placeOfSupplyStateCode: '04',
    });

    expect(res.supplyType).toBe(SupplyType.INTRA_STATE);
    expect(res.requiresIgst).toBe(false);
    expect(res.isUtgst).toBe(true);
  });

  it('should identify inter-state supply for different state codes', () => {
    const res = resolvePlaceOfSupply({
      supplierStateCode: '27', // Maharashtra
      placeOfSupplyStateCode: '29', // Karnataka
    });

    expect(res.supplyType).toBe(SupplyType.INTER_STATE);
    expect(res.requiresIgst).toBe(true);
  });

  it('should treat SEZ supply as inter-state IGST regardless of state code', () => {
    const res = resolvePlaceOfSupply({
      supplierStateCode: '27',
      placeOfSupplyStateCode: '27',
      isSez: true,
    });

    expect(res.supplyType).toBe(SupplyType.SEZ);
    expect(res.requiresIgst).toBe(true);
  });

  it('should treat exports as zero-rated inter-state supply', () => {
    const res = resolvePlaceOfSupply({
      supplierStateCode: '27',
      placeOfSupplyStateCode: '97',
      isExport: true,
    });

    expect(res.supplyType).toBe(SupplyType.EXPORT);
    expect(res.requiresIgst).toBe(true);
  });

  it('should treat deemed export as inter-state IGST', () => {
    const res = resolvePlaceOfSupply({
      supplierStateCode: '27',
      placeOfSupplyStateCode: '27',
      isDeemedExport: true,
    });

    expect(res.supplyType).toBe(SupplyType.DEEMED_EXPORT);
    expect(res.requiresIgst).toBe(true);
  });

  it('should throw error when supplier state code is invalid', () => {
    expect(() =>
      resolvePlaceOfSupply({
        supplierStateCode: '99',
        placeOfSupplyStateCode: '27',
      }),
    ).toThrow('Invalid supplier state code: 99');
  });

  it('should throw error when place of supply state code is invalid', () => {
    expect(() =>
      resolvePlaceOfSupply({
        supplierStateCode: '27',
        placeOfSupplyStateCode: '99',
      }),
    ).toThrow('Invalid place of supply state code: 99');
  });
});
