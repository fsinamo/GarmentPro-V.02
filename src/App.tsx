/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Product,
  RawMaterial,
  Accessory,
  CalculationRecord,
  ProductCostingRecord,
  GoogleSheetsConfig,
  AppThemeId
} from './types';
import { storageService } from './services/storageService';
import { sheetsSyncService } from './services/sheetsSyncService';
import { THEME_OPTIONS, applyThemeToDocument, DEFAULT_THEME_ID } from './data/themes';
import { ThemeSelectorModal } from './components/ThemeSelectorModal';
import { ConsumptionCalculator } from './components/ConsumptionCalculator';
import { SavedCalculationsView } from './components/SavedCalculationsView';
import { MasterProductsView } from './components/MasterProductsView';
import { MasterRawMaterialsView } from './components/MasterRawMaterialsView';
import { MasterAccessoriesView } from './components/MasterAccessoriesView';
import { GoogleSheetsSyncView } from './components/GoogleSheetsSyncView';
import { ModularOverviewView } from './components/ModularOverviewView';
import { ProductCostingView } from './components/ProductCostingView';
import { PrintReportModal } from './components/PrintReportModal';
import { NewCalculationModal } from './components/NewCalculationModal';
import { NewCostingModal } from './components/NewCostingModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import {
  Scissors,
  FileText,
  Package,
  Layers,
  Sparkles,
  FileSpreadsheet,
  Boxes,
  Wifi,
  WifiOff,
  CloudCheck,
  RotateCw,
  Factory,
  Palette,
  Coins,
  CheckCircle2,
  PlusCircle
} from 'lucide-react';

export default function App() {
  const isOnline = useOnlineStatus();

  // App primary module state: 'consumption' | 'product_costing'
  const [activeModule, setActiveModule] = useState<'consumption' | 'product_costing'>('consumption');
  const [selectedCostingProductId, setSelectedCostingProductId] = useState<string | undefined>(undefined);

  // App state
  const [activeTab, setActiveTab] = useState<string>('calculator');
  const [products, setProducts] = useState<Product[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [calculations, setCalculations] = useState<CalculationRecord[]>([]);
  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig>(storageService.getSheetsConfig());

  // Theme state (Default: Hijau Army)
  const [currentTheme, setCurrentTheme] = useState<AppThemeId>(() => storageService.getTheme());
  const [isThemeModalOpen, setIsThemeModalOpen] = useState<boolean>(false);

  // Modal untuk membuat perhitungan konsumsi baru (BOM)
  const [isNewCalcModalOpen, setIsNewCalcModalOpen] = useState<boolean>(false);

  // Modal & state untuk membuat perhitungan costing (HPP) baru
  const [isNewCostingModalOpen, setIsNewCostingModalOpen] = useState<boolean>(false);
  const [activeCostingRecord, setActiveCostingRecord] = useState<ProductCostingRecord | null>(null);

  // Active calculation loaded in the calculator
  const [activeCalculation, setActiveCalculation] = useState<CalculationRecord | null>(null);

  // Modal print calculation
  const [calculationToPrint, setCalculationToPrint] = useState<CalculationRecord | null>(null);

  // Sync report-modal-open class on body for clean printer media isolation
  useEffect(() => {
    if (calculationToPrint) {
      document.body.classList.add('report-modal-open');
    } else {
      document.body.classList.remove('report-modal-open');
    }
    return () => {
      document.body.classList.remove('report-modal-open');
    };
  }, [calculationToPrint]);

  // Apply theme on load and change
  useEffect(() => {
    applyThemeToDocument(currentTheme);
  }, [currentTheme]);

  const handleSelectTheme = (themeId: AppThemeId) => {
    setCurrentTheme(themeId);
    storageService.saveTheme(themeId);
    applyThemeToDocument(themeId);
  };

  const activeThemeConfig = THEME_OPTIONS.find((t) => t.id === currentTheme) || THEME_OPTIONS[0];

  const [isPullingSheets, setIsPullingSheets] = useState(false);
  const [sheetsNotice, setSheetsNotice] = useState<string | null>(null);

  // Load initial data from localStorage
  const loadAllData = () => {
    setProducts(storageService.getProducts());
    setRawMaterials(storageService.getRawMaterials());
    setAccessories(storageService.getAccessories());
    const calcs = storageService.getCalculations();
    setCalculations(calcs);
    setSheetsConfig(storageService.getSheetsConfig());

    // If no calculation loaded, set the pre-seeded Kopelriem CN1 calculation
    if (!activeCalculation && calcs.length > 0) {
      setActiveCalculation(calcs[0]);
    }
  };

  // Pull authoritative data from Google Sheets when configured (Catatan 3)
  const pullAuthoritativeData = async (silent: boolean = false) => {
    const config = storageService.getSheetsConfig();
    if (!config.webAppUrl || !config.webAppUrl.startsWith('http')) return;

    setIsPullingSheets(true);
    if (!silent) setSheetsNotice('Sedang menarik data patokan dari Google Sheets...');

    const result = await sheetsSyncService.pullAllFromSheets(config.webAppUrl);
    setIsPullingSheets(false);

    if (result.success && result.data) {
      if (result.data.products && result.data.products.length > 0) {
        storageService.saveProducts(result.data.products);
        setProducts(result.data.products);
      }
      if (result.data.rawMaterials && result.data.rawMaterials.length > 0) {
        storageService.saveRawMaterials(result.data.rawMaterials);
        setRawMaterials(result.data.rawMaterials);
      }
      if (result.data.accessories && result.data.accessories.length > 0) {
        storageService.saveAccessories(result.data.accessories);
        setAccessories(result.data.accessories);
      }
      if (result.data.calculations && result.data.calculations.length > 0) {
        storageService.saveCalculations(result.data.calculations);
        setCalculations(result.data.calculations);
        if (!activeCalculation) {
          setActiveCalculation(result.data.calculations[0]);
        }
      }

      const updatedConfig = {
        ...config,
        lastSyncTimestamp: new Date().toISOString(),
      };
      storageService.saveSheetsConfig(updatedConfig);
      setSheetsConfig(updatedConfig);

      setSheetsNotice('✓ Data patokan berhasil disinkronkan dari Google Sheets!');
      setTimeout(() => setSheetsNotice(null), 4000);
    } else if (!silent) {
      setSheetsNotice(`Catatan: ${result.message}`);
      setTimeout(() => setSheetsNotice(null), 5000);
    }
  };

  useEffect(() => {
    loadAllData();
    // Catatan 3: Apabila sudah disetting, maka data patokan adalah dari Google Sheets
    const config = storageService.getSheetsConfig();
    if (config.webAppUrl && isOnline) {
      pullAuthoritativeData(true);
    }
  }, []);

  // Handlers for calculations
  const handleSaveCalculation = (calc: CalculationRecord) => {
    const updated = storageService.saveSingleCalculation(calc);
    setCalculations(updated);
    setActiveCalculation(calc);
  };

  const handleDeleteCalculation = (id: string) => {
    const updated = storageService.deleteCalculation(id);
    setCalculations(updated);
    if (activeCalculation?.id === id) {
      setActiveCalculation(null);
    }
  };

  const handleLoadCalculation = (calc: CalculationRecord) => {
    setActiveCalculation(calc);
    setActiveTab('calculator');
  };

  const handleDuplicateCalculation = (calc: CalculationRecord) => {
    const newId = `calc-${Date.now()}`;
    const newNum = `${calc.calculationNumber}-COPY`;
    const copy: CalculationRecord = {
      ...calc,
      id: newId,
      calculationNumber: newNum,
      title: `${calc.title || calc.productName} (Salinan)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: 'local_only',
    };
    const updated = storageService.saveSingleCalculation(copy);
    setCalculations(updated);
    setActiveCalculation(copy);
    setActiveTab('calculator');
  };

  // Handlers for master products
  const handleSaveProduct = (p: Product) => {
    const list = storageService.getProducts();
    const idx = list.findIndex((item) => item.id === p.id);
    let updated: Product[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = p;
    } else {
      updated = [p, ...list];
    }
    storageService.saveProducts(updated);
    setProducts(updated);
  };

  const handleDeleteProduct = (id: string) => {
    const list = storageService.getProducts().filter((p) => p.id !== id);
    storageService.saveProducts(list);
    setProducts(list);
  };

  // Handlers for master raw materials
  const handleSaveRawMaterial = (m: RawMaterial) => {
    const list = storageService.getRawMaterials();
    const idx = list.findIndex((item) => item.id === m.id);
    let updated: RawMaterial[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = m;
    } else {
      updated = [m, ...list];
    }
    storageService.saveRawMaterials(updated);
    setRawMaterials(updated);
  };

  const handleDeleteRawMaterial = (id: string) => {
    const list = storageService.getRawMaterials().filter((m) => m.id !== id);
    storageService.saveRawMaterials(list);
    setRawMaterials(list);
  };

  // Handlers for master accessories
  const handleSaveAccessory = (a: Accessory) => {
    const list = storageService.getAccessories();
    const idx = list.findIndex((item) => item.id === a.id);
    let updated: Accessory[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = a;
    } else {
      updated = [a, ...list];
    }
    storageService.saveAccessories(updated);
    setAccessories(updated);
  };

  const handleDeleteAccessory = (id: string) => {
    const list = storageService.getAccessories().filter((a) => a.id !== id);
    storageService.saveAccessories(list);
    setAccessories(list);
  };

  const handleCreateNewCalculation = (targetProduct?: Product) => {
    const prod = targetProduct || products[0] || {
      id: 'prod-kopel-cn1',
      code: 'PRD-001',
      name: 'Kopelriem CN1',
      category: 'Perlengkapan Dinas / Kopel',
      description: 'Sabuk dinas kopelriem standar CN1 dengan 5 komponen accessories',
      unit: 'Pcs',
      accessories: [],
      createdAt: '',
      updatedAt: '',
    };
    const defaultProfile = storageService.getCompanyProfile();
    const newCalc: CalculationRecord = {
      id: `calc-${Date.now()}`,
      calculationNumber: `BOM-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`,
      title: `Perhitungan Konsumsi ${prod.name} (Baru)`,
      companyName: defaultProfile.companyName || 'CV. RAVINA',
      companyLogo: defaultProfile.companyLogo || '',
      buyerName: defaultProfile.defaultBuyerName || 'Kopassus / Mabes TNI',
      items: [
        {
          productId: prod.id,
          productName: prod.name,
          productCode: prod.code,
          productCategory: prod.category,
          description: prod.description,
          orderQuantity: 1000,
        },
      ],
      productId: prod.id,
      productName: prod.name,
      orderQuantity: 1000,
      customerOrPoRef: '',
      calculationDate: new Date().toISOString().split('T')[0],
      details: [],
      summary: [],
      notes: 'Kalkulasi kebutuhan bahan baku dihitung berdasarkan pemakaian per unit (ketepatan 6 desimal).',
      syncStatus: 'local_only',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setActiveCalculation(newCalc);
    setActiveModule('consumption');
    setActiveTab('calculator');
  };

  const handleSelectProductForCalc = (p: Product) => {
    handleCreateNewCalculation(p);
  };

  return (
    <div className="min-h-screen bg-[var(--app-canvas-bg,#f4f7f2)] flex flex-col font-sans transition-colors duration-200">
      {/* Offline Alert Strip */}
      {!isOnline && (
        <div className="bg-amber-600 px-4 py-1.5 text-center text-xs font-semibold text-white flex items-center justify-center gap-2 print:hidden">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Mode Offline — Aplikasi tetap berjalan lancar menggunakan penyimpanan lokal.</span>
        </div>
      )}

      {/* Main App Bar */}
      <header className="sticky top-0 z-40 bg-[var(--app-header-bg,#1a2717)] text-white border-b border-[var(--app-header-border,#2c3f27)] shadow-sm print:hidden transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Logo, Brand & Primary Module Switcher */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-black text-lg shadow-inner">
                  <Factory className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-base font-black tracking-tight text-white">GarmentPro</h1>
                    <span className="rounded bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-300 border border-blue-400/30">
                      Modular Production
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300/80">
                    Sistem Perencanaan Produksi, Konsumsi Bahan Baku & Costing
                  </p>
                </div>
              </div>

              {/* Primary Modules Switcher */}
              <div className="inline-flex rounded-2xl bg-black/40 p-1 border border-white/15 text-xs font-bold shadow-xs">
                <button
                  id="btn-module-consumption"
                  type="button"
                  onClick={() => setActiveModule('consumption')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl transition ${
                    activeModule === 'consumption'
                      ? 'bg-blue-600 text-white shadow-xs ring-1 ring-white/20'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Scissors className="w-3.5 h-3.5 text-blue-200" />
                  <span>Modul Consumption</span>
                  <span className="rounded-full bg-blue-400/25 px-1.5 py-0.2 text-[9px] font-semibold text-blue-200">
                    BOM
                  </span>
                </button>

                <button
                  id="btn-module-product-costing"
                  type="button"
                  onClick={() => setActiveModule('product_costing')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl transition ${
                    activeModule === 'product_costing'
                      ? 'bg-amber-600 text-white shadow-xs ring-1 ring-white/20'
                      : 'text-amber-200 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Coins className="w-3.5 h-3.5 text-amber-200" />
                  <span>Modul Product Costing</span>
                  <span className="rounded-full bg-amber-400/30 px-1.5 py-0.2 text-[9px] font-black uppercase text-amber-300 border border-amber-400/30">
                    HPP
                  </span>
                </button>
              </div>
            </div>

            {/* Quick Badges, Google Sheets Authoritative Status, Theme Selector & PWA Install */}
            <div className="flex items-center gap-2.5">
              {sheetsConfig.webAppUrl ? (
                <div className="flex items-center gap-1.5 bg-emerald-950/70 border border-emerald-500/40 rounded-xl px-2.5 py-1 text-xs">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-bold text-emerald-300 hidden md:inline">
                    Patokan: Google Sheets
                  </span>
                  <button
                    onClick={() => pullAuthoritativeData(false)}
                    disabled={isPullingSheets}
                    className="p-1 text-emerald-200 hover:text-white transition rounded hover:bg-emerald-800/60 cursor-pointer disabled:opacity-50"
                    title="Tarik Data Patokan Terbaru dari Google Sheets"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isPullingSheets ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setActiveModule('consumption');
                    setActiveTab('sheets');
                  }}
                  className="hidden lg:flex items-center gap-1.5 bg-black/25 hover:bg-black/40 border border-white/10 rounded-xl px-2.5 py-1 text-[11px] text-slate-300 cursor-pointer"
                  title="Klik untuk menyambungkan Google Sheets sebagai patokan data"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Sambung Google Sheets</span>
                </button>
              )}

              <div className="hidden xl:flex items-center gap-2 text-xs text-slate-300">
                <span className="flex items-center gap-1 bg-black/20 px-2.5 py-1 rounded-lg border border-white/10">
                  <Package className="w-3.5 h-3.5 text-blue-400" />
                  <span>{products.length} Produk</span>
                </span>
                <span className="flex items-center gap-1 bg-black/20 px-2.5 py-1 rounded-lg border border-white/10">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>{rawMaterials.length} Bahan</span>
                </span>
              </div>

              {/* Theme Selector Button */}
              <button
                id="btn-open-theme-modal"
                type="button"
                onClick={() => setIsThemeModalOpen(true)}
                className="flex items-center gap-2 bg-black/25 hover:bg-black/40 px-3 py-1.5 rounded-xl border border-white/15 text-xs font-semibold text-white transition shadow-xs group"
                title="Pilihan Tema Aplikasi"
              >
                <span
                  className="h-3.5 w-3.5 rounded-full border-2 border-white/80 shadow-xs shrink-0 transition group-hover:scale-110"
                  style={{ backgroundColor: activeThemeConfig.primaryColor }}
                />
                <Palette className="w-3.5 h-3.5 text-white/80 group-hover:text-white" />
                <span className="hidden sm:inline">
                  {activeThemeConfig.name.split(' (')[0]}
                </span>
              </button>

              <PWAInstallButton />

              {/* Tombol Utama Header: Context-aware Perhitungan Baru */}
              {activeModule === 'consumption' ? (
                <button
                  id="header-btn-new-calculation"
                  type="button"
                  onClick={() => setIsNewCalcModalOpen(true)}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-1.5 rounded-xl border border-emerald-400/40 text-xs shadow-xs hover:shadow-md transition cursor-pointer shrink-0"
                  title="Buat Perhitungan Konsumsi Bahan Baru (BOM)"
                >
                  <PlusCircle className="w-4 h-4 text-emerald-100" />
                  <span>+ Perhitungan Konsumsi Baru</span>
                </button>
              ) : (
                <button
                  id="header-btn-new-costing"
                  type="button"
                  onClick={() => setIsNewCostingModalOpen(true)}
                  className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold px-3.5 py-1.5 rounded-xl border border-amber-400/40 text-xs shadow-xs hover:shadow-md transition cursor-pointer shrink-0"
                  title="Buat Perhitungan Costing (HPP) Baru"
                >
                  <Coins className="w-4 h-4 text-amber-100" />
                  <span>+ Perhitungan Costing Baru</span>
                </button>
              )}
            </div>
          </div>

          {/* Sub Navigation Bar according to Active Primary Module */}
          {activeModule === 'consumption' ? (
            <nav className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1 text-xs scrollbar-none">
              {/* Tombol Buat Perhitungan Baru */}
              <button
                id="nav-btn-new-calculation"
                type="button"
                onClick={() => setIsNewCalcModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition shrink-0 cursor-pointer border border-emerald-400/40"
                title="Buka Menu untuk Membuat Perhitungan Konsumsi Baru"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Buat Perhitungan Baru</span>
              </button>

              <button
                id="nav-tab-calculator"
                onClick={() => setActiveTab('calculator')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition shrink-0 ${
                  activeTab === 'calculator'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Konsumsi Bahan</span>
              </button>

              <button
                id="nav-tab-saved"
                onClick={() => setActiveTab('saved')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition shrink-0 ${
                  activeTab === 'saved'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Riwayat Perhitungan</span>
                {calculations.length > 0 && (
                  <span className="ml-1 rounded-full bg-black/30 px-1.5 py-0.2 text-[10px] text-slate-200">
                    {calculations.length}
                  </span>
                )}
              </button>

              <button
                id="nav-tab-products"
                onClick={() => setActiveTab('products')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition shrink-0 ${
                  activeTab === 'products'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Master Produk</span>
              </button>

              <button
                id="nav-tab-materials"
                onClick={() => setActiveTab('materials')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition shrink-0 ${
                  activeTab === 'materials'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Master Bahan Baku</span>
              </button>

              <button
                id="nav-tab-accessories"
                onClick={() => setActiveTab('accessories')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition shrink-0 ${
                  activeTab === 'accessories'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Master Accessories & Jasa</span>
              </button>

              <button
                id="nav-tab-sheets"
                onClick={() => setActiveTab('sheets')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition shrink-0 ${
                  activeTab === 'sheets'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-emerald-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Sinkronisasi Sheets</span>
                {sheetsConfig.webAppUrl && (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                )}
              </button>

              <button
                id="nav-tab-modular"
                onClick={() => setActiveTab('modular')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition shrink-0 ${
                  activeTab === 'modular'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>Arsitektur Modular</span>
              </button>
            </nav>
          ) : (
            <div className="flex items-center justify-between gap-3 mt-3 pt-1 text-xs">
              <div className="flex items-center gap-2 text-slate-200">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/30 font-bold">
                  <Coins className="w-3.5 h-3.5" />
                  <span>Modul Aktif: Product Costing (HPP)</span>
                </span>
                <span className="hidden md:inline text-slate-300 text-[11px]">
                  Kalkulasi HPP & Biaya Accessories berdasarkan Master Produk & Master Accessories dari Modul Consumption.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  id="btn-costing-create-new-costing"
                  type="button"
                  onClick={() => setIsNewCostingModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-xs transition cursor-pointer border border-amber-400/40"
                  title="Buat Perhitungan Product Costing (HPP) Baru"
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>+ Perhitungan Costing Baru</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModule('consumption')}
                  className="inline-flex items-center gap-1 text-[11px] text-blue-200 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg transition cursor-pointer"
                >
                  <Scissors className="w-3 h-3" />
                  <span>Beralih ke Modul Consumption</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Body */}
      <main className={`flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 ${calculationToPrint ? 'print:hidden' : ''}`}>
        {sheetsNotice && (
          <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-300 p-3 text-xs text-emerald-900 flex items-center justify-between shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{sheetsNotice}</span>
            </div>
            <button
              onClick={() => setSheetsNotice(null)}
              className="text-emerald-500 hover:text-emerald-700 font-bold ml-2 cursor-pointer"
            >
              ×
            </button>
          </div>
        )}

        {/* Render Primary Module: Product Costing */}
        {activeModule === 'product_costing' && (
          <ProductCostingView
            products={products}
            accessories={accessories}
            rawMaterials={rawMaterials}
            initialProductId={selectedCostingProductId}
            initialCostingRecord={activeCostingRecord}
            onNavigateToConsumption={() => setActiveModule('consumption')}
            onOpenNewCostingModal={() => setIsNewCostingModalOpen(true)}
          />
        )}

        {/* Render Primary Module: Consumption */}
        {activeModule === 'consumption' && (
          <>
            {activeTab === 'calculator' && (
              <ConsumptionCalculator
                key={activeCalculation?.id || 'new-calc'}
                products={products}
                rawMaterials={rawMaterials}
                accessories={accessories}
                sheetsConfig={sheetsConfig}
                initialCalculation={activeCalculation}
                onSaveCalculation={handleSaveCalculation}
                onPrintCalculation={(calc) => setCalculationToPrint(calc)}
                onResetActiveCalculation={() => setActiveCalculation(null)}
                onOpenNewModal={() => setIsNewCalcModalOpen(true)}
              />
            )}

            {activeTab === 'saved' && (
              <SavedCalculationsView
                calculations={calculations}
                sheetsConfig={sheetsConfig}
                onLoadCalculation={handleLoadCalculation}
                onDuplicateCalculation={handleDuplicateCalculation}
                onPrintCalculation={(calc) => setCalculationToPrint(calc)}
                onDeleteCalculation={handleDeleteCalculation}
                onDataUpdated={loadAllData}
                onStartNewCalculation={() => setIsNewCalcModalOpen(true)}
              />
            )}

            {activeTab === 'products' && (
              <MasterProductsView
                products={products}
                accessories={accessories}
                onSaveProduct={handleSaveProduct}
                onDeleteProduct={handleDeleteProduct}
                onSelectForCalculation={handleSelectProductForCalc}
                onNavigateToCosting={(prod) => {
                  setSelectedCostingProductId(prod.id);
                  setActiveModule('product_costing');
                }}
              />
            )}

            {activeTab === 'materials' && (
              <MasterRawMaterialsView
                rawMaterials={rawMaterials}
                onSaveRawMaterial={handleSaveRawMaterial}
                onDeleteRawMaterial={handleDeleteRawMaterial}
              />
            )}

            {activeTab === 'accessories' && (
              <MasterAccessoriesView
                accessories={accessories}
                rawMaterials={rawMaterials}
                onSaveAccessory={handleSaveAccessory}
                onDeleteAccessory={handleDeleteAccessory}
              />
            )}

            {activeTab === 'sheets' && (
              <GoogleSheetsSyncView
                config={sheetsConfig}
                onUpdateConfig={(cfg) => setSheetsConfig(cfg)}
                calculations={calculations}
                products={products}
                rawMaterials={rawMaterials}
                accessories={accessories}
                onDataRefreshed={loadAllData}
              />
            )}

            {activeTab === 'modular' && (
              <ModularOverviewView
                onNavigateTab={(tab) => setActiveTab(tab)}
                onNavigateModule={(mod, tab) => {
                  setActiveModule(mod);
                  if (tab) setActiveTab(tab);
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Print / Save PDF Modal */}
      {calculationToPrint && (
        <PrintReportModal
          calculation={calculationToPrint}
          onClose={() => setCalculationToPrint(null)}
          onReturnHome={() => {
            setCalculationToPrint(null);
            setActiveTab('calculator');
          }}
          onUpdateCalculation={(updated) => {
            handleSaveCalculation(updated);
            setCalculationToPrint(updated);
          }}
        />
      )}

      {/* Theme Selector Modal */}
      {isThemeModalOpen && (
        <ThemeSelectorModal
          currentTheme={currentTheme}
          onSelectTheme={handleSelectTheme}
          onClose={() => setIsThemeModalOpen(false)}
        />
      )}

      {/* Modal Buat Perhitungan Baru (Konsumsi BOM) */}
      <NewCalculationModal
        isOpen={isNewCalcModalOpen}
        onClose={() => setIsNewCalcModalOpen(false)}
        products={products}
        onCreateCalculation={(newCalc) => {
          handleSaveCalculation(newCalc);
          setActiveCalculation(newCalc);
          setActiveModule('consumption');
          setActiveTab('calculator');
        }}
      />

      {/* Modal Buat Perhitungan Costing Baru (HPP) */}
      <NewCostingModal
        isOpen={isNewCostingModalOpen}
        onClose={() => setIsNewCostingModalOpen(false)}
        products={products}
        accessories={accessories}
        rawMaterials={rawMaterials}
        onCreateCosting={(newCosting) => {
          storageService.saveSingleProductCosting(newCosting);
          setActiveCostingRecord(newCosting);
          setSelectedCostingProductId(newCosting.productId);
          setActiveModule('product_costing');
        }}
      />

      {/* App Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500 print:hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            GarmentPro Modular Production System • Modul Consumption (BOM) & Modul Product Costing (HPP)
          </p>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span>PWA Offline-Ready</span>
            <span>•</span>
            <span>Google Sheets Connected</span>
            <span>•</span>
            <span>Kopelriem CN1 Standardized</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
