export interface ProductAccessoryRelation {
  accessoryId: string;
  qtyPerProduct: number;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  description?: string;
  accessories: ProductAccessoryRelation[];
  createdAt: string;
  updatedAt: string;
}

export interface RawMaterial {
  id: string;
  code: string;
  name: string;
  thickness?: string; // Tebal bahan (contoh: "0,65 mm")
  length?: number; // Panjang bahan (contoh: 120)
  width?: number; // Lebar bahan (contoh: 60)
  dimensionUnit?: string; // Satuan dimensi: 'cm', 'mm', 'm' (default: 'cm')
  totalArea?: number; // Total penampang bahan (perkalian panjang x lebar)
  specification: string;
  unit: string; // e.g. 'Lembar', 'Meter', 'Cones'
  currentStock: number;
  unitPrice?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type AccessoryCategory = 'ready_made' | 'raw_material_based' | 'service';

export interface Accessory {
  id: string;
  code: string;
  name: string;
  unit: string;
  category: AccessoryCategory; // 'ready_made' (Beli Jadi tanpa diolah) | 'raw_material_based' (Olah Bahan Baku) | 'service' (Jasa / Ongkos Pengerjaan)
  purchasePrice?: number; // Harga beli satuan (Rp) jika accessories jadi ATAU tarif jasa (Rp) jika jasa
  defaultRawMaterialId?: string; // ID bahan baku jika olah bahan baku
  defaultConsumptionPerUnit?: number; // Pemakaian bahan per 1 unit accessory (ketepatan 6 desimal, misal 0.002151)
  defaultYieldPerUnit?: number; // Ekuivalen hasil (1 / pemakaian) untuk kemudahan cross-check
  accessoryLength?: number; // Ukuran panjang potong accessory (opsional)
  accessoryWidth?: number; // Ukuran lebar potong accessory (opsional)
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCostingItem {
  accessoryId: string;
  accessoryName: string;
  accessoryCategory: AccessoryCategory;
  rawMaterialName?: string;
  rawMaterialUnitPrice?: number;
  consumptionPerUnit?: number; // Pemakaian bahan dalam 6 desimal
  yieldPerUnit?: number;
  unitPrice: number; // Harga per satuan accessory / tarif jasa (Rp)
  usageQtyPerProduct: number; // Jumlah pemakaian / frekuensi pengerjaan per pcs produk
  totalUsageQty: number; // Total pemakaian untuk seluruh pesanan
  totalCostPerProduct: number; // Biaya per pcs produk (usageQtyPerProduct * unitPrice)
  totalCostBatch: number; // Total biaya batch pesanan (totalUsageQty * unitPrice)
  notes?: string;
}

export interface ProductCostingRecord {
  id: string;
  costingNumber: string;
  title: string;
  companyName?: string; // Nama perusahaan kop surat
  productId: string;
  productName: string;
  productCode: string;
  productCategory?: string;
  orderQuantity: number;
  items: ProductCostingItem[];
  totalCostPerUnit: number; // Total HPP / Biaya per 1 pcs produk (Accessories + Jasa)
  totalBatchCost: number; // Total Biaya untuk seluruh orderQuantity
  totalAccessoriesCostPerUnit?: number; // Subtotal Biaya Aksesoris per pcs
  totalServicesCostPerUnit?: number; // Subtotal Biaya Jasa per pcs
  totalAccessoriesBatchCost?: number; // Subtotal Biaya Aksesoris batch
  totalServicesBatchCost?: number; // Subtotal Biaya Jasa batch
  targetMarkupPercent?: number; // Margin keuntungan (%)
  targetSellingPricePerUnit?: number; // Estimasi harga jual rekomendasi per unit
  calculationDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConsumptionDetail {
  productId?: string;
  productName?: string;
  accessoryId: string;
  accessoryName: string;
  qtyPerProduct: number;
  totalAccessoryNeeded: number;
  rawMaterialId: string;
  rawMaterialName: string;
  rawMaterialThickness?: string;
  rawMaterialDimensions?: string;
  rawMaterialTotalArea?: number;
  rawMaterialSpec: string;
  rawMaterialUnit: string;
  consumptionPerUnit: number; // Pemakaian bahan per 1 pcs accessory (6 desimal)
  yieldPerUnit?: number; // Ekuivalen yield (1 / consumptionPerUnit)
  rawMaterialCalculated: number; // totalAccessoryNeeded * consumptionPerUnit (6 desimal)
  allowancePercent: number; // % waste/afval/tolerance
  rawMaterialWithAllowance: number; // 6 desimal
}

export interface RawMaterialSummary {
  rawMaterialId: string;
  rawMaterialName: string;
  thickness?: string;
  length?: number;
  width?: number;
  dimensionUnit?: string;
  dimensions?: string;
  totalArea?: number;
  specification: string;
  unit: string;
  totalRequired: number; // 6 desimal (contoh: 26.613840)
  roundedRequired: number; // Math.ceil (contoh: 27)
  unitPrice?: number;
  totalEstimatedCost?: number;
  breakdown: Array<{
    productName?: string;
    accessoryName: string;
    accessoryQty: number;
    consumptionPerUnit: number; // 6 desimal
    yieldPerUnit?: number;
    rawMaterialPortion: number; // 6 desimal
  }>;
}

export interface CalculationProductItem {
  productId: string;
  productName: string;
  productCode: string;
  productCategory?: string;
  description?: string;
  orderQuantity: number;
  customOverrides?: Record<string, {
    qtyPerProduct?: number;
    rawMaterialId?: string;
    consumptionPerUnit?: number;
    allowancePercent?: number;
  }>;
}

export interface CalculationRecord {
  id: string;
  calculationNumber: string;
  title: string;
  companyName?: string;
  companyLogo?: string;
  buyerName?: string;
  items?: CalculationProductItem[]; // Multi-product items
  productId: string; // Primary / first product for backward compatibility
  productName: string;
  orderQuantity: number;
  customerOrPoRef?: string;
  calculationDate: string;
  details: ConsumptionDetail[];
  summary: RawMaterialSummary[];
  notes?: string;
  syncStatus: 'synced' | 'pending' | 'failed' | 'local_only';
  syncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GoogleSheetsConfig {
  webAppUrl: string;
  spreadsheetName?: string;
  autoSyncOnSave: boolean;
  lastSyncTimestamp?: string;
}

export interface SyncLog {
  id: string;
  timestamp: string;
  action: string;
  status: 'success' | 'error';
  message: string;
}

export type AppThemeId =
  | 'army-green'
  | 'camo-forest'
  | 'desert-khaki'
  | 'stealth-black'
  | 'navy-blue';

export interface AppThemeConfig {
  id: AppThemeId;
  name: string;
  tagline: string;
  primaryColor: string;
  badgeBg: string;
  headerBg: string;
  accentText: string;
  militaryTone: string;
}
