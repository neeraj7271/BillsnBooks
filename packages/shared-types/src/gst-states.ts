export interface StateInfo {
  code: string;
  name: string;
  isUnionTerritoryWithoutLegislature: boolean;
}

export const INDIAN_GST_STATES: Record<string, StateInfo> = {
  '01': { code: '01', name: 'Jammu and Kashmir', isUnionTerritoryWithoutLegislature: false },
  '02': { code: '02', name: 'Himachal Pradesh', isUnionTerritoryWithoutLegislature: false },
  '03': { code: '03', name: 'Punjab', isUnionTerritoryWithoutLegislature: false },
  '04': { code: '04', name: 'Chandigarh', isUnionTerritoryWithoutLegislature: true },
  '05': { code: '05', name: 'Uttarakhand', isUnionTerritoryWithoutLegislature: false },
  '06': { code: '06', name: 'Haryana', isUnionTerritoryWithoutLegislature: false },
  '07': { code: '07', name: 'Delhi', isUnionTerritoryWithoutLegislature: false },
  '08': { code: '08', name: 'Rajasthan', isUnionTerritoryWithoutLegislature: false },
  '09': { code: '09', name: 'Uttar Pradesh', isUnionTerritoryWithoutLegislature: false },
  '10': { code: '10', name: 'Bihar', isUnionTerritoryWithoutLegislature: false },
  '11': { code: '11', name: 'Sikkim', isUnionTerritoryWithoutLegislature: false },
  '12': { code: '12', name: 'Arunachal Pradesh', isUnionTerritoryWithoutLegislature: false },
  '13': { code: '13', name: 'Nagaland', isUnionTerritoryWithoutLegislature: false },
  '14': { code: '14', name: 'Manipur', isUnionTerritoryWithoutLegislature: false },
  '15': { code: '15', name: 'Mizoram', isUnionTerritoryWithoutLegislature: false },
  '16': { code: '16', name: 'Tripura', isUnionTerritoryWithoutLegislature: false },
  '17': { code: '17', name: 'Meghalaya', isUnionTerritoryWithoutLegislature: false },
  '18': { code: '18', name: 'Assam', isUnionTerritoryWithoutLegislature: false },
  '19': { code: '19', name: 'West Bengal', isUnionTerritoryWithoutLegislature: false },
  '20': { code: '20', name: 'Jharkhand', isUnionTerritoryWithoutLegislature: false },
  '21': { code: '21', name: 'Odisha', isUnionTerritoryWithoutLegislature: false },
  '22': { code: '22', name: 'Chhattisgarh', isUnionTerritoryWithoutLegislature: false },
  '23': { code: '23', name: 'Madhya Pradesh', isUnionTerritoryWithoutLegislature: false },
  '24': { code: '24', name: 'Gujarat', isUnionTerritoryWithoutLegislature: false },
  '26': { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu', isUnionTerritoryWithoutLegislature: true },
  '27': { code: '27', name: 'Maharashtra', isUnionTerritoryWithoutLegislature: false },
  '29': { code: '29', name: 'Karnataka', isUnionTerritoryWithoutLegislature: false },
  '30': { code: '30', name: 'Goa', isUnionTerritoryWithoutLegislature: false },
  '31': { code: '31', name: 'Lakshadweep', isUnionTerritoryWithoutLegislature: true },
  '32': { code: '32', name: 'Kerala', isUnionTerritoryWithoutLegislature: false },
  '33': { code: '33', name: 'Tamil Nadu', isUnionTerritoryWithoutLegislature: false },
  '34': { code: '34', name: 'Puducherry', isUnionTerritoryWithoutLegislature: false },
  '35': { code: '35', name: 'Andaman and Nicobar Islands', isUnionTerritoryWithoutLegislature: true },
  '36': { code: '36', name: 'Telangana', isUnionTerritoryWithoutLegislature: false },
  '37': { code: '37', name: 'Andhra Pradesh', isUnionTerritoryWithoutLegislature: false },
  '38': { code: '38', name: 'Ladakh', isUnionTerritoryWithoutLegislature: true },
  '96': { code: '96', name: 'Foreign / Other Country (Cross-Border)', isUnionTerritoryWithoutLegislature: false },
  '97': { code: '97', name: 'Other Territory', isUnionTerritoryWithoutLegislature: true },
  '99': { code: '99', name: 'Centre Jurisdiction / SEZ', isUnionTerritoryWithoutLegislature: false },
};

export const INDIAN_GST_STATES_LIST: Array<{ code: string; name: string; label: string }> =
  Object.values(INDIAN_GST_STATES)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((s) => ({
      code: s.code,
      name: s.name,
      label: `${s.name} (${s.code})`,
    }));

