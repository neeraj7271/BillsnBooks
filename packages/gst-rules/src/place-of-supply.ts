import { SupplyType } from '@platform/shared-types';
import { isValidStateCode, INDIAN_GST_STATES } from './state-codes.js';

export interface PosResolutionInput {
  supplierStateCode: string;
  recipientStateCode?: string;
  placeOfSupplyStateCode: string;
  isSez?: boolean;
  isExport?: boolean;
  isDeemedExport?: boolean;
}

export interface PosResolutionResult {
  supplyType: SupplyType;
  isUtgst: boolean; // True if intra-state supply within a UT without legislature
  requiresIgst: boolean;
  explanation: string;
}

export function resolvePlaceOfSupply(input: PosResolutionInput): PosResolutionResult {
  const { supplierStateCode, placeOfSupplyStateCode, isSez, isExport, isDeemedExport } = input;

  if (!isValidStateCode(supplierStateCode)) {
    throw new Error(`Invalid supplier state code: ${supplierStateCode}`);
  }

  // Exports are treated as inter-state supplies
  if (isExport) {
    return {
      supplyType: SupplyType.EXPORT,
      isUtgst: false,
      requiresIgst: true,
      explanation: 'Export of goods/services is treated as zero-rated inter-state supply.',
    };
  }

  // Supplies to / by SEZ units are treated as inter-state under Section 7(5)(b) IGST Act
  if (isSez) {
    return {
      supplyType: SupplyType.SEZ,
      isUtgst: false,
      requiresIgst: true,
      explanation: 'Supply to or by SEZ unit/developer is deemed inter-state under Section 7(5)(b) IGST Act.',
    };
  }

  if (isDeemedExport) {
    return {
      supplyType: SupplyType.DEEMED_EXPORT,
      isUtgst: false,
      requiresIgst: true,
      explanation: 'Deemed export supplies require IGST treatment.',
    };
  }

  if (!isValidStateCode(placeOfSupplyStateCode)) {
    throw new Error(`Invalid place of supply state code: ${placeOfSupplyStateCode}`);
  }

  // Intra-State vs Inter-State
  if (supplierStateCode === placeOfSupplyStateCode) {
    const stateInfo = INDIAN_GST_STATES[supplierStateCode];
    const isUtgst = stateInfo ? stateInfo.isUnionTerritoryWithoutLegislature : false;
    return {
      supplyType: SupplyType.INTRA_STATE,
      isUtgst,
      requiresIgst: false,
      explanation: `Intra-state supply within ${stateInfo?.name ?? supplierStateCode}. Requires CGST + ${isUtgst ? 'UTGST' : 'SGST'}.`,
    };
  } else {
    return {
      supplyType: SupplyType.INTER_STATE,
      isUtgst: false,
      requiresIgst: true,
      explanation: `Inter-state supply from ${supplierStateCode} to ${placeOfSupplyStateCode}. Requires IGST.`,
    };
  }
}

