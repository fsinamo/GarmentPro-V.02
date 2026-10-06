import { Product, RawMaterial, Accessory, CalculationRecord, GoogleSheetsConfig, SyncLog, AppThemeId, ProductCostingRecord } from '../types';
import { INITIAL_PRODUCTS, INITIAL_RAW_MATERIALS, INITIAL_ACCESSORIES, INITIAL_CALCULATIONS } from '../data/defaultData';
import { DEFAULT_THEME_ID } from '../data/themes';

const KEYS = {
  PRODUCTS: 'garment_master_products_v1',
  RAW_MATERIALS: 'garment_master_raw_materials_v1',
  ACCESSORIES: 'garment_master_accessories_v1',
  CALCULATIONS: 'garment_calculations_v1',
  COSTINGS: 'garment_product_costings_v1',
  SHEETS_CONFIG: 'garment_sheets_config_v1',
  SYNC_LOGS: 'garment_sync_logs_v1',
  COMPANY_PROFILE: 'garment_company_profile_v1',
  THEME: 'garment_app_theme_v1',
};

export interface CompanyProfile {
  companyName: string;
  companyLogo?: string;
  defaultBuyerName?: string;
}

export const storageService = {
  // Theme Settings
  getTheme(): AppThemeId {
    const raw = localStorage.getItem(KEYS.THEME) as AppThemeId | null;
    if (raw && ['army-green', 'camo-forest', 'desert-khaki', 'stealth-black', 'navy-blue'].includes(raw)) {
      return raw;
    }
    return DEFAULT_THEME_ID;
  },

  saveTheme(theme: AppThemeId): void {
    localStorage.setItem(KEYS.THEME, theme);
  },

  // Company Profile Settings
  getCompanyProfile(): CompanyProfile {
    const raw = localStorage.getItem(KEYS.COMPANY_PROFILE);
    if (!raw) {
      const defaultProfile: CompanyProfile = {
        companyName: 'CV. RAVINA',
        companyLogo: '',
        defaultBuyerName: '-',
      };
      this.saveCompanyProfile(defaultProfile);
      return defaultProfile;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return {
        companyName: 'CV. RAVINA',
        companyLogo: '',
        defaultBuyerName: '-',
      };
    }
  },

  saveCompanyProfile(profile: CompanyProfile): void {
    localStorage.setItem(KEYS.COMPANY_PROFILE, JSON.stringify(profile));
  },
  // Master Products
  getProducts(): Product[] {
    const raw = localStorage.getItem(KEYS.PRODUCTS);
    if (!raw) {
      this.saveProducts(INITIAL_PRODUCTS);
      return INITIAL_PRODUCTS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_PRODUCTS;
    }
  },

  saveProducts(products: Product[]): void {
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
  },

  // Master Raw Materials
  getRawMaterials(): RawMaterial[] {
    const raw = localStorage.getItem(KEYS.RAW_MATERIALS);
    if (!raw) {
      this.saveRawMaterials(INITIAL_RAW_MATERIALS);
      return INITIAL_RAW_MATERIALS;
    }
    try {
      const parsed: RawMaterial[] = JSON.parse(raw);
      // Ensure all fields from specification: thickness, length, width, totalArea
      const migrated = parsed.map((m) => {
        const length = m.length ?? (m.id === 'bb-kuningan-065' ? 120 : m.id === 'bb-stainless-08' ? 244 : m.id === 'bb-webbing-nylon' ? 5000 : 100);
        const width = m.width ?? (m.id === 'bb-kuningan-065' ? 60 : m.id === 'bb-stainless-08' ? 122 : m.id === 'bb-webbing-nylon' ? 5.5 : 50);
        const totalArea = m.totalArea ?? (length * width);
        const thickness = m.thickness || (m.id === 'bb-kuningan-065' ? '0,65 mm' : m.id === 'bb-stainless-08' ? '0,8 mm' : m.id === 'bb-webbing-nylon' ? '3 mm' : '-');
        return {
          ...m,
          thickness,
          length,
          width,
          dimensionUnit: m.dimensionUnit || 'cm',
          totalArea,
        };
      });
      return migrated;
    } catch {
      return INITIAL_RAW_MATERIALS;
    }
  },

  saveRawMaterials(materials: RawMaterial[]): void {
    const cleaned = materials.map((m) => ({
      ...m,
      totalArea: m.totalArea !== undefined ? m.totalArea : (m.length && m.width ? m.length * m.width : 0),
    }));
    localStorage.setItem(KEYS.RAW_MATERIALS, JSON.stringify(cleaned));
  },

  // Master Accessories
  getAccessories(): Accessory[] {
    const raw = localStorage.getItem(KEYS.ACCESSORIES);
    if (!raw) {
      this.saveAccessories(INITIAL_ACCESSORIES);
      return INITIAL_ACCESSORIES;
    }
    try {
      const parsed: Accessory[] = JSON.parse(raw);
      // Migrate each item to ensure category and 6-decimal consumption
      const migrated: Accessory[] = parsed.map((a) => {
        let defaultConsumption = a.defaultConsumptionPerUnit;
        if (defaultConsumption === undefined && a.defaultYieldPerUnit && a.defaultYieldPerUnit > 0) {
          defaultConsumption = Number((1 / a.defaultYieldPerUnit).toFixed(6));
        }
        return {
          ...a,
          category: a.category || (a.defaultRawMaterialId ? 'raw_material_based' : 'ready_made'),
          defaultConsumptionPerUnit: defaultConsumption,
        };
      });
      // If no ready-made accessory is present, seed the defaults
      const hasReadyMade = migrated.some((a) => a.category === 'ready_made');
      let currentList: Accessory[] = migrated;
      if (!hasReadyMade) {
        const readyDefaults = INITIAL_ACCESSORIES.filter((a) => a.category === 'ready_made');
        currentList = [...currentList, ...readyDefaults];
      }
      // If no service / jasa is present, seed default jasa
      const hasService = currentList.some((a) => a.category === 'service');
      if (!hasService) {
        const serviceDefaults = INITIAL_ACCESSORIES.filter((a) => a.category === 'service');
        if (serviceDefaults.length > 0) {
          currentList = [...currentList, ...serviceDefaults];
        }
      }
      if (currentList.length !== parsed.length) {
        this.saveAccessories(currentList);
      }
      return currentList;
    } catch {
      return INITIAL_ACCESSORIES;
    }
  },

  saveAccessories(accessories: Accessory[]): void {
    const cleaned = accessories.map((a) => {
      let consumption = a.defaultConsumptionPerUnit;
      if (consumption === undefined && a.defaultYieldPerUnit && a.defaultYieldPerUnit > 0) {
        consumption = Number((1 / a.defaultYieldPerUnit).toFixed(6));
      }
      return {
        ...a,
        defaultConsumptionPerUnit: consumption !== undefined ? Number(consumption.toFixed(6)) : undefined,
      };
    });
    localStorage.setItem(KEYS.ACCESSORIES, JSON.stringify(cleaned));
  },

  // Product Costing Records
  getProductCostings(): ProductCostingRecord[] {
    const raw = localStorage.getItem(KEYS.COSTINGS);
    if (!raw) {
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveProductCostings(costings: ProductCostingRecord[]): void {
    localStorage.setItem(KEYS.COSTINGS, JSON.stringify(costings));
  },

  saveSingleProductCosting(costing: ProductCostingRecord): ProductCostingRecord[] {
    const list = this.getProductCostings();
    const existingIndex = list.findIndex((c) => c.id === costing.id);
    let updated: ProductCostingRecord[];
    if (existingIndex >= 0) {
      updated = [...list];
      updated[existingIndex] = costing;
    } else {
      updated = [costing, ...list];
    }
    this.saveProductCostings(updated);
    return updated;
  },

  deleteProductCosting(id: string): ProductCostingRecord[] {
    const list = this.getProductCostings();
    const updated = list.filter((c) => c.id !== id);
    this.saveProductCostings(updated);
    return updated;
  },

  // Calculations
  getCalculations(): CalculationRecord[] {
    const raw = localStorage.getItem(KEYS.CALCULATIONS);
    if (!raw) {
      this.saveCalculations(INITIAL_CALCULATIONS);
      return INITIAL_CALCULATIONS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_CALCULATIONS;
    }
  },

  saveCalculations(calculations: CalculationRecord[]): void {
    localStorage.setItem(KEYS.CALCULATIONS, JSON.stringify(calculations));
  },

  saveSingleCalculation(calculation: CalculationRecord): CalculationRecord[] {
    const list = this.getCalculations();
    const existingIndex = list.findIndex((c) => c.id === calculation.id);
    let updated: CalculationRecord[];
    if (existingIndex >= 0) {
      updated = [...list];
      updated[existingIndex] = calculation;
    } else {
      updated = [calculation, ...list];
    }
    this.saveCalculations(updated);
    return updated;
  },

  deleteCalculation(id: string): CalculationRecord[] {
    const list = this.getCalculations();
    const updated = list.filter((c) => c.id !== id);
    this.saveCalculations(updated);
    return updated;
  },

  // Sheets Config
  getSheetsConfig(): GoogleSheetsConfig {
    const raw = localStorage.getItem(KEYS.SHEETS_CONFIG);
    if (!raw) {
      const defaultConfig: GoogleSheetsConfig = {
        webAppUrl: '',
        spreadsheetName: 'Data_Produksi_Garment_Konsumsi_Bahan',
        autoSyncOnSave: true,
      };
      this.saveSheetsConfig(defaultConfig);
      return defaultConfig;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return {
        webAppUrl: '',
        autoSyncOnSave: true,
      };
    }
  },

  saveSheetsConfig(config: GoogleSheetsConfig): void {
    localStorage.setItem(KEYS.SHEETS_CONFIG, JSON.stringify(config));
  },

  // Sync Logs
  getSyncLogs(): SyncLog[] {
    const raw = localStorage.getItem(KEYS.SYNC_LOGS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  addSyncLog(log: Omit<SyncLog, 'id' | 'timestamp'>): void {
    const logs = this.getSyncLogs();
    const newLog: SyncLog = {
      ...log,
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
    };
    const updated = [newLog, ...logs].slice(0, 50); // keep last 50
    localStorage.setItem(KEYS.SYNC_LOGS, JSON.stringify(updated));
  },

  // Reset to default data
  resetAllToDefault(): void {
    this.saveProducts(INITIAL_PRODUCTS);
    this.saveRawMaterials(INITIAL_RAW_MATERIALS);
    this.saveAccessories(INITIAL_ACCESSORIES);
    this.saveCalculations(INITIAL_CALCULATIONS);
  },
};
