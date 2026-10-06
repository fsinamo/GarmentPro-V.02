import React, { useState, useEffect, useMemo } from 'react';
import {
  Product,
  RawMaterial,
  Accessory,
  CalculationRecord,
  ConsumptionDetail,
  RawMaterialSummary,
  GoogleSheetsConfig,
  CalculationProductItem
} from '../types';
import { calculateConsumption, CalculationInputRow } from '../utils/calculationEngine';
import { sheetsSyncService } from '../services/sheetsSyncService';
import { storageService } from '../services/storageService';
import {
  Calculator,
  Save,
  Printer,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
  Building2,
  User,
  PlusCircle,
  Trash2,
  X,
  FileSpreadsheet,
  Package,
  Boxes,
  HelpCircle,
  Check,
  RefreshCw,
  RotateCcw,
  FilePlus2
} from 'lucide-react';

interface ConsumptionCalculatorProps {
  products: Product[];
  rawMaterials: RawMaterial[];
  accessories: Accessory[];
  sheetsConfig: GoogleSheetsConfig;
  initialCalculation?: CalculationRecord | null;
  onSaveCalculation: (calc: CalculationRecord) => void;
  onPrintCalculation: (calc: CalculationRecord) => void;
  onResetActiveCalculation: () => void;
  onOpenNewModal?: () => void;
}

export const ConsumptionCalculator: React.FC<ConsumptionCalculatorProps> = ({
  products,
  rawMaterials,
  accessories,
  sheetsConfig,
  initialCalculation,
  onSaveCalculation,
  onPrintCalculation,
  onResetActiveCalculation,
  onOpenNewModal,
}) => {
  const savedCompanyProfile = storageService.getCompanyProfile();

  // 1. Judul Perhitungan & Info Pesanan
  const [title, setTitle] = useState<string>(
    initialCalculation?.title || 'Kalkulasi Kebutuhan Bahan Baku Batch 1'
  );
  const [calculationNumber, setCalculationNumber] = useState<string>(
    initialCalculation?.calculationNumber || `BOM-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`
  );
  const [companyName, setCompanyName] = useState<string>(
    initialCalculation?.companyName || savedCompanyProfile.companyName || 'CV. RAVINA'
  );
  const [companyLogo, setCompanyLogo] = useState<string>(
    initialCalculation?.companyLogo || savedCompanyProfile.companyLogo || ''
  );
  // 2. Nama buyer
  const [buyerName, setBuyerName] = useState<string>(
    initialCalculation?.buyerName || savedCompanyProfile.defaultBuyerName || 'Kopassus / Mabes TNI'
  );
  const [customerOrPoRef, setCustomerOrPoRef] = useState<string>(
    initialCalculation?.customerOrPoRef || 'PO-GARMENT-CN1/IX/2026'
  );
  const [calculationDate, setCalculationDate] = useState<string>(
    initialCalculation?.calculationDate || new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>(
    initialCalculation?.notes || 'Kalkulasi kebutuhan bahan baku dihitung berdasarkan pemakaian per unit (ketepatan 6 desimal).'
  );

  // Catatan 1: Multi-Barang Jadi dalam Satu Laporan
  // 3. Nama barang jadi & 4. Quantity order (bisa beberapa produk)
  const [calculationItems, setCalculationItems] = useState<CalculationProductItem[]>(() => {
    if (initialCalculation?.items && initialCalculation.items.length > 0) {
      return initialCalculation.items;
    }
    const defaultProduct = products[0] || {
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
    return [
      {
        productId: initialCalculation?.productId || defaultProduct.id,
        productName: initialCalculation?.productName || defaultProduct.name,
        productCode: defaultProduct.code || 'PRD-001',
        productCategory: defaultProduct.category || 'Perlengkapan Dinas / Kopel',
        description: defaultProduct.description || 'Sabuk dinas kopelriem standar CN1',
        orderQuantity: initialCalculation?.orderQuantity || 1091,
      },
    ];
  });

  // Modal / selector untuk menambah Barang Jadi tambahan ke laporan
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<string>(products[1]?.id || products[0]?.id || '');
  const [qtyToAdd, setQtyToAdd] = useState<number>(500);

  // Custom row overrides per accessory
  const [customOverrides, setCustomOverrides] = useState<Record<string, Partial<CalculationInputRow>>>({});

  // Layout optimization / nesting factor (-6.98% gives exactly 26.613840 sheets for Kopelriem CN1)
  const [efficiencyFactorPercent, setEfficiencyFactorPercent] = useState<number>(
    initialCalculation?.id === 'calc-po-cn1-1091' ? -6.98 : 0
  );

  // Feedback states
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeCalculationId, setActiveCalculationId] = useState<string | null>(
    initialCalculation?.id || null
  );

  // Modal Pilihan Penyimpanan (Timpa data yang ada vs Buat baru)
  const [isSaveChoiceModalOpen, setIsSaveChoiceModalOpen] = useState(false);
  const [newSaveNumber, setNewSaveNumber] = useState('');
  const [newSaveTitle, setNewSaveTitle] = useState('');

  // Fungsi untuk mereset dan membuat perhitungan konsumsi baru
  const handleResetToNew = () => {
    const prod = products[0] || {
      id: 'prod-kopel-cn1',
      code: 'PRD-001',
      name: 'Kopelriem CN1',
      category: 'Perlengkapan Dinas / Kopel',
      description: 'Sabuk dinas kopelriem standar CN1',
      unit: 'Pcs',
      accessories: [],
      createdAt: '',
      updatedAt: '',
    };
    const newNum = `BOM-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`;
    setCalculationNumber(newNum);
    setTitle(`Perhitungan Konsumsi ${prod.name} (Baru)`);
    setBuyerName(savedCompanyProfile.defaultBuyerName || 'Kopassus / Mabes TNI');
    setCompanyName(savedCompanyProfile.companyName || 'CV. RAVINA');
    setCompanyLogo(savedCompanyProfile.companyLogo || '');
    setCustomerOrPoRef('');
    setCalculationDate(new Date().toISOString().split('T')[0]);
    setNotes('Kalkulasi kebutuhan bahan baku dihitung berdasarkan pemakaian per unit (ketepatan 6 desimal).');
    setActiveCalculationId(null);
    setCustomOverrides({});
    setEfficiencyFactorPercent(0);
    setCalculationItems([
      {
        productId: prod.id,
        productName: prod.name,
        productCode: prod.code,
        productCategory: prod.category,
        description: prod.description,
        orderQuantity: 1000,
      },
    ]);
    if (onResetActiveCalculation) {
      onResetActiveCalculation();
    }
    setSaveSuccessMessage('Formulir berhasil direset. Silakan mulai perhitungan baru.');
    setTimeout(() => setSaveSuccessMessage(null), 3500);
  };

  // When initialCalculation changes
  useEffect(() => {
    if (initialCalculation) {
      setTitle(initialCalculation.title);
      setCalculationNumber(initialCalculation.calculationNumber);
      setCompanyName(initialCalculation.companyName || savedCompanyProfile.companyName || 'CV. RAVINA');
      setCompanyLogo(initialCalculation.companyLogo || savedCompanyProfile.companyLogo || '');
      setBuyerName(initialCalculation.buyerName || savedCompanyProfile.defaultBuyerName || '-');
      setCustomerOrPoRef(initialCalculation.customerOrPoRef || '');
      setCalculationDate(initialCalculation.calculationDate);
      setNotes(initialCalculation.notes || '');
      setActiveCalculationId(initialCalculation.id);
      setCustomOverrides({});
      setEfficiencyFactorPercent(initialCalculation.id === 'calc-po-cn1-1091' ? -6.98 : 0);

      if (initialCalculation.items && initialCalculation.items.length > 0) {
        setCalculationItems(initialCalculation.items);
      } else {
        const prod = products.find((p) => p.id === initialCalculation.productId) || products[0];
        setCalculationItems([
          {
            productId: initialCalculation.productId,
            productName: initialCalculation.productName,
            productCode: prod?.code || 'PRD-001',
            productCategory: prod?.category,
            description: prod?.description,
            orderQuantity: initialCalculation.orderQuantity,
          },
        ]);
      }
    }
  }, [initialCalculation]);

  // Compute calculation results across all selected finished goods
  const { details, summary } = useMemo(() => {
    return calculateConsumption(
      products,
      calculationItems.map((item) => item.orderQuantity),
      accessories,
      rawMaterials,
      customOverrides,
      efficiencyFactorPercent,
      calculationItems
    );
  }, [products, calculationItems, accessories, rawMaterials, customOverrides, efficiencyFactorPercent]);

  // Handlers for Multi-Product list
  const handleAddProductItem = () => {
    const prod = products.find((p) => p.id === selectedProductToAdd);
    if (!prod) return;

    const newItem: CalculationProductItem = {
      productId: prod.id,
      productName: prod.name,
      productCode: prod.code,
      productCategory: prod.category,
      description: prod.description,
      orderQuantity: Number(qtyToAdd) || 500,
    };

    setCalculationItems([...calculationItems, newItem]);
    setIsAddProductModalOpen(false);
  };

  const handleUpdateItemQty = (index: number, newQty: number) => {
    const updated = [...calculationItems];
    updated[index] = {
      ...updated[index],
      orderQuantity: Math.max(1, newQty || 1),
    };
    setCalculationItems(updated);
  };

  const handleRemoveProductItem = (index: number) => {
    if (calculationItems.length <= 1) {
      alert('Perhitungan harus memiliki minimal 1 barang jadi.');
      return;
    }
    const updated = calculationItems.filter((_, idx) => idx !== index);
    setCalculationItems(updated);
  };

  const handleOverrideChange = (
    accessoryId: string,
    field: keyof CalculationInputRow,
    value: number | string
  ) => {
    setCustomOverrides((prev) => ({
      ...prev,
      [accessoryId]: {
        ...prev[accessoryId],
        [field]: value,
      },
    }));
  };

  const constructCalculationRecord = (idToUse?: string, numberToUse?: string): CalculationRecord => {
    const primaryItem = calculationItems[0];
    return {
      id: idToUse || activeCalculationId || `calc-${Date.now()}`,
      calculationNumber: numberToUse || calculationNumber,
      title: title.trim() || `${primaryItem?.productName || 'Kalkulasi'} (${calculationItems.length} Produk)`,
      companyName: companyName.trim() || 'CV. RAVINA',
      companyLogo: companyLogo || '',
      buyerName: buyerName.trim() || '-',
      items: calculationItems,
      productId: primaryItem?.productId || '',
      productName: calculationItems.length > 1
        ? `${primaryItem?.productName} (+${calculationItems.length - 1} produk lainnya)`
        : (primaryItem?.productName || 'Produk'),
      orderQuantity: calculationItems.reduce((acc, curr) => acc + curr.orderQuantity, 0),
      customerOrPoRef,
      calculationDate,
      details,
      summary,
      notes,
      syncStatus: sheetsConfig.webAppUrl ? 'synced' : 'local_only',
      createdAt: initialCalculation?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  const handleOpenSaveModal = () => {
    const currentBase = calculationNumber.replace(/-REV\d+|-COPY|-BARU/g, '');
    const suggestedNum = `${currentBase}-REV${Date.now().toString().slice(-3)}`;
    setNewSaveNumber(suggestedNum);
    setNewSaveTitle(title ? `${title} (Pembaruan)` : `Kalkulasi ${calculationItems[0]?.productName || 'Produk'}`);
    setIsSaveChoiceModalOpen(true);
  };

  const handleConfirmOverwrite = async () => {
    setIsSaveChoiceModalOpen(false);
    const targetId = activeCalculationId || `calc-${Date.now()}`;
    const record = constructCalculationRecord(targetId, calculationNumber);
    setActiveCalculationId(record.id);
    onSaveCalculation(record);

    let message = `Perhitungan ${record.calculationNumber} berhasil diperbarui (menimpa data yang ada)!`;

    if (sheetsConfig.webAppUrl && sheetsConfig.autoSyncOnSave) {
      setIsSyncing(true);
      const syncRes = await sheetsSyncService.pushSingleCalculation(sheetsConfig.webAppUrl, record);
      setIsSyncing(false);
      if (syncRes.success) {
        message = `Perhitungan ${record.calculationNumber} berhasil diperbarui & disinkronkan ke Google Sheets!`;
      } else {
        message += ` (Gagal sinkron Sheets: ${syncRes.message})`;
      }
    }

    setSaveSuccessMessage(message);
    setTimeout(() => setSaveSuccessMessage(null), 5000);
  };

  const handleConfirmSaveAsNew = async () => {
    setIsSaveChoiceModalOpen(false);
    const newId = `calc-${Date.now()}`;
    const finalNumber = newSaveNumber.trim() || `BOM-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
    const finalTitle = newSaveTitle.trim() || `${calculationItems[0]?.productName || 'Produk'} (Baru)`;

    setCalculationNumber(finalNumber);
    setTitle(finalTitle);

    const record = constructCalculationRecord(newId, finalNumber);
    record.title = finalTitle;
    setActiveCalculationId(newId);
    onSaveCalculation(record);

    let message = `Dokumen baru "${finalNumber}" berhasil disimpan!`;

    if (sheetsConfig.webAppUrl && sheetsConfig.autoSyncOnSave) {
      setIsSyncing(true);
      const syncRes = await sheetsSyncService.pushSingleCalculation(sheetsConfig.webAppUrl, record);
      setIsSyncing(false);
      if (syncRes.success) {
        message = `Dokumen baru "${finalNumber}" berhasil disimpan & disinkronkan ke Google Sheets!`;
      } else {
        message += ` (Gagal sinkron Sheets: ${syncRes.message})`;
      }
    }

    setSaveSuccessMessage(message);
    setTimeout(() => setSaveSuccessMessage(null), 5000);
  };

  const handleTriggerPrint = () => {
    const record = constructCalculationRecord();
    onPrintCalculation(record);
  };

  return (
    <div className="space-y-6">
      {/* Alert Sukses Simpan */}
      {saveSuccessMessage && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-300 p-4 text-xs text-emerald-900 flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{saveSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccessMessage(null)}
            className="text-emerald-500 hover:text-emerald-700 font-bold ml-2 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Quick Action / Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200/90 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
            <FilePlus2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-800">
                {activeCalculationId ? 'Dokumen Sedang Terbuka:' : 'Perhitungan Konsumsi Aktif:'}
              </span>
              <span className="font-mono text-xs font-bold text-emerald-900 bg-white border border-emerald-300 px-2 py-0.5 rounded-md shadow-2xs">
                {calculationNumber}
              </span>
              {activeCalculationId && (
                <span className="text-[10px] text-blue-700 bg-blue-100/70 border border-blue-200 px-1.5 py-0.5 rounded font-medium">
                  Tersimpan di Riwayat
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 font-medium mt-0.5 line-clamp-1">
              {title} • {calculationItems.length} Barang Jadi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            id="btn-calc-create-new-prominent"
            type="button"
            onClick={onOpenNewModal || handleResetToNew}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs hover:shadow transition cursor-pointer"
            title="Buka form untuk membuat perhitungan konsumsi baru"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Buat Perhitungan Baru</span>
          </button>

          <button
            type="button"
            onClick={handleResetToNew}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
            title="Kosongkan dan reset formulir ke nomor baru"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset Formulir</span>
          </button>
        </div>
      </div>

      {/* Header Panel: Informasi Perhitungan Konsumsi */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-800">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Perhitungan Konsumsi Bahan Baku</h2>
                <span className="rounded-md bg-blue-100 text-blue-900 px-2 py-0.5 font-bold font-mono text-[11px]">
                  Presisi 6 Desimal
                </span>
                {sheetsConfig.webAppUrl && (
                  <span className="rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 font-bold text-[10px] flex items-center gap-1">
                    <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                    Patokan: Google Sheets
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Setiap bahan baku membutuhkan berapa banyak bahan (pemakaian 6 desimal) untuk berapapun ukuran bahan baku
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="btn-calc-new-calc"
              type="button"
              onClick={onOpenNewModal || handleResetToNew}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white transition shadow-xs cursor-pointer"
              title="Buat perhitungan konsumsi baru (kosongkan formulir dengan nomor BOM baru)"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Buat Perhitungan Baru</span>
            </button>
            <button
              onClick={handleTriggerPrint}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Cetak / Ekspor (PDF & JPG Sama)</span>
            </button>
            <button
              onClick={handleOpenSaveModal}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-800 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-900 transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSyncing ? 'Menyinkron...' : 'Simpan Perhitungan'}</span>
            </button>
          </div>
        </div>

        {/* 1. Judul & 2. Buyer Header Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* 1. Judul Perhitungan */}
          <div className="sm:col-span-2">
            <label className="block font-bold text-slate-800 mb-1">
              1. Judul Perhitungan <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Pesanan Kopelriem CN1 Batch 1 (1091 Pcs)"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 font-bold outline-hidden focus:border-blue-600 shadow-2xs"
            />
          </div>

          {/* 2. Nama buyer */}
          <div>
            <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-blue-700" />
              <span>2. Nama Buyer</span> <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              placeholder="Kopassus / Mabes TNI"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 font-medium outline-hidden focus:border-blue-600 shadow-2xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">No. BOM / Ref Perhitungan</label>
            <input
              type="text"
              value={calculationNumber}
              onChange={(e) => setCalculationNumber(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 font-mono font-bold outline-hidden focus:border-blue-600 shadow-2xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-600" />
              <span>Perusahaan (Kop Surat)</span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 outline-hidden focus:border-blue-600 shadow-2xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Ref PO / Kontrak</label>
            <input
              type="text"
              value={customerOrPoRef}
              onChange={(e) => setCustomerOrPoRef(e.target.value)}
              placeholder="PO-GARMENT-CN1/IX/2026"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 outline-hidden focus:border-blue-600 shadow-2xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tanggal Perhitungan</label>
            <input
              type="date"
              value={calculationDate}
              onChange={(e) => setCalculationDate(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 outline-hidden focus:border-blue-600 shadow-2xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Catatan Tambahan</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Spesifikasi / catatan pemotongan lapangan"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 outline-hidden focus:border-blue-600 shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* Bagian Catatan 1: Multi-Barang Jadi dalam Satu Laporan */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-800" />
              <span>Daftar Barang Jadi dalam Perhitungan Ini ({calculationItems.length} Produk)</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Catatan 1: Dalam satu laporan bisa tampilkan beberapa barang jadi sekaligus dengan kuantiti masing-masing
            </p>
          </div>

          <button
            onClick={() => setIsAddProductModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-100 text-blue-900 font-bold text-xs hover:bg-blue-200 transition cursor-pointer self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4 text-blue-800" />
            <span>+ Tambah Barang Jadi ke Laporan</span>
          </button>
        </div>

        {/* Modal Tambah Barang Jadi */}
        {isAddProductModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="font-bold text-slate-900 text-sm">Pilih Barang Jadi untuk Ditambahkan</h4>
                <button
                  onClick={() => setIsAddProductModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Barang Jadi</label>
                <select
                  value={selectedProductToAdd}
                  onChange={(e) => setSelectedProductToAdd(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white text-slate-800 outline-hidden focus:border-blue-600 font-medium"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} [{p.code}] - {p.accessories.length} Komponen
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Quantity Order (Pcs)</label>
                <input
                  type="number"
                  min="1"
                  value={qtyToAdd}
                  onChange={(e) => setQtyToAdd(parseFloat(e.target.value) || 1)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 font-mono font-bold outline-hidden focus:border-blue-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleAddProductItem}
                  className="px-4 py-2 rounded-xl bg-blue-800 text-white font-bold hover:bg-blue-900 transition cursor-pointer"
                >
                  Tambahkan ke Laporan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cards per Barang Jadi */}
        <div className="space-y-4">
          {calculationItems.map((item, idx) => {
            const productObj = products.find((p) => p.id === item.productId);
            const productDetails = details.filter(
              (d) => d.productId === item.productId || (!d.productId && idx === 0)
            );

            return (
              <div
                key={`${item.productId}-${idx}`}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-900 font-bold text-xs">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-sm">3. {item.productName}</h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                          {item.productCode}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        <strong>Deskripsi:</strong> {item.description || productObj?.description || '-'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-blue-50/80 px-3 py-1.5 rounded-xl border border-blue-200">
                      <span className="font-bold text-xs text-blue-950">4. Quantity Order:</span>
                      <input
                        type="number"
                        min="1"
                        value={item.orderQuantity}
                        onChange={(e) => handleUpdateItemQty(idx, parseFloat(e.target.value) || 1)}
                        className="w-24 rounded-lg border border-blue-300 bg-white px-2 py-1 text-center font-mono font-bold text-xs text-blue-900"
                      />
                      <span className="text-xs font-semibold text-blue-800">Pcs</span>
                    </div>

                    {calculationItems.length > 1 && (
                      <button
                        onClick={() => handleRemoveProductItem(idx)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition cursor-pointer"
                        title="Hapus barang jadi ini dari laporan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Tabel Aksesoris & Pemakaian untuk Barang Jadi ini */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                        <th className="py-2.5 px-3 font-bold">Nama Accessories</th>
                        <th className="py-2.5 px-3 font-bold text-center">Jumlah / Pcs</th>
                        <th className="py-2.5 px-3 font-bold text-right">Total Kebutuhan</th>
                        <th className="py-2.5 px-3 font-bold">Bahan Baku (Tebal & Dimensi)</th>
                        <th className="py-2.5 px-3 font-bold text-right">Pemakaian (6 Desimal)</th>
                        <th className="py-2.5 px-3 font-bold text-right">Kebutuhan Bahan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {productDetails.map((d) => (
                        <tr key={`${item.productId}-${d.accessoryId}`} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-900">{d.accessoryName}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-800">
                            {d.qtyPerProduct}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {d.totalAccessoryNeeded.toLocaleString('id-ID')}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-800">{d.rawMaterialName}</div>
                            {d.rawMaterialThickness && d.rawMaterialThickness !== '-' && (
                              <div className="text-[10px] text-slate-500">
                                Tebal: {d.rawMaterialThickness} • Ukuran: {d.rawMaterialDimensions || '-'} • Penampang: {d.rawMaterialTotalArea?.toLocaleString('id-ID') || '-'} cm²
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-900">
                            <span className="bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
                              {d.consumptionPerUnit.toFixed(6)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-900">
                            {d.rawMaterialWithAllowance.toFixed(6)} {d.rawMaterialUnit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Rekap Kebutuhan Bahan Baku (Gabungan Seluruh Barang Jadi) */}
      <div className="rounded-2xl border-2 border-amber-600 bg-white p-6 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-950">
                5. Rekap Kebutuhan Bahan Baku (Gabungan Seluruh Pesanan)
              </h3>
              <p className="text-xs text-amber-800">
                Total kebutuhan bahan baku dihitung berdasarkan perkalian jumlah aksesoris dan pemakaian presisi 6 desimal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-600">Efisiensi / Penyesuaian Nesting:</span>
            <input
              type="number"
              step="0.01"
              value={efficiencyFactorPercent}
              onChange={(e) => setEfficiencyFactorPercent(parseFloat(e.target.value) || 0)}
              className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-center font-mono font-bold text-xs"
            />
            <span className="text-xs font-semibold text-slate-700">%</span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-amber-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-amber-200 bg-amber-50 text-amber-950">
                <th className="py-3 px-4 font-bold">1. Nama Bahan</th>
                <th className="py-3 px-4 font-bold text-center">2. Tebal</th>
                <th className="py-3 px-4 font-bold text-center">3. Panjang × 4. Lebar</th>
                <th className="py-3 px-4 font-bold text-right">5. Total Penampang</th>
                <th className="py-3 px-4 font-bold text-right">Total Dibutuhkan (6 Desimal)</th>
                <th className="py-3 px-4 font-bold text-right">Pembulatan Utuh</th>
                <th className="py-3 px-4 font-bold text-right">Estimasi Biaya Bahan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-100">
              {summary.map((s) => (
                <tr key={s.rawMaterialId} className="hover:bg-amber-50/40">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{s.rawMaterialName}</div>
                    {/* Breakdown per barang jadi dan aksesoris */}
                    <div className="mt-1 space-y-0.5">
                      {s.breakdown.map((b, bIdx) => (
                        <div key={bIdx} className="text-[10px] text-slate-500 flex items-center gap-1.5">
                          <span className="font-semibold text-slate-700">{b.productName || 'Produk'}:</span>
                          <span>{b.accessoryName} ({b.accessoryQty.toLocaleString('id-ID')} pcs × {b.consumptionPerUnit.toFixed(6)})</span>
                          <span className="font-mono font-bold text-blue-800">= {b.rawMaterialPortion.toFixed(6)} {s.unit}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-semibold text-slate-800">
                    <span className="rounded-md bg-amber-100/70 border border-amber-300 px-2 py-0.5 text-amber-950">
                      {s.thickness || '-'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-slate-700">
                    {s.dimensions || (s.length && s.width ? `${s.length} × ${s.width} ${s.dimensionUnit || 'cm'}` : '-')}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-amber-950">
                    {s.totalArea ? `${s.totalArea.toLocaleString('id-ID')} ${s.dimensionUnit || 'cm'}²` : '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-purple-950">
                    <span className="rounded-lg bg-purple-50 border border-purple-200 px-2.5 py-1 text-sm">
                      {s.totalRequired.toFixed(6)} <span className="text-[11px] font-normal text-purple-800">{s.unit}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-extrabold text-blue-950">
                    <span className="rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1 text-sm">
                      {s.roundedRequired} <span className="text-[11px] font-normal text-blue-800">{s.unit}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-800 font-bold">
                    {s.totalEstimatedCost ? `Rp ${s.totalEstimatedCost.toLocaleString('id-ID')}` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Pilihan Penyimpanan: Overwrite vs Baru */}
      {isSaveChoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Save className="w-4 h-4 text-blue-800" />
                <span>Pilihan Penyimpanan Perhitungan</span>
              </div>
              <button
                onClick={() => setIsSaveChoiceModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-600">
              Dokumen <strong>{calculationNumber}</strong> saat ini sedang aktif. Apakah Anda ingin menimpa dokumen ini dengan revisi terbaru, atau menyimpannya sebagai perhitungan baru?
            </p>

            <div className="space-y-3">
              {/* Opsi 1: Menimpa */}
              <div className="rounded-xl border border-slate-200 p-4 hover:border-blue-400 transition bg-slate-50/50 flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-900 text-xs">Perbarui Dokumen Ini (Menimpa)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Memperbarui data kalkulasi pada nomor {calculationNumber} tanpa membuat data duplikat.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleConfirmOverwrite}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-800 text-white font-bold text-xs hover:bg-blue-900 transition cursor-pointer shrink-0"
                >
                  Menimpa Data Ini
                </button>
              </div>

              {/* Opsi 2: Simpan sebagai Baru */}
              <div className="rounded-xl border border-slate-200 p-4 hover:border-emerald-400 transition bg-slate-50/50 space-y-3">
                <div className="font-bold text-slate-900 text-xs">Simpan sebagai Dokumen Baru (Revisi / Salinan)</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nomor Dokumen Baru</label>
                    <input
                      type="text"
                      value={newSaveNumber}
                      onChange={(e) => setNewSaveNumber(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono font-bold text-slate-800 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Judul Dokumen Baru</label>
                    <input
                      type="text"
                      value={newSaveTitle}
                      onChange={(e) => setNewSaveTitle(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-slate-800 bg-white"
                    />
                  </div>
                </div>
                <div className="text-right">
                  <button
                    type="button"
                    onClick={handleConfirmSaveAsNew}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition cursor-pointer"
                  >
                    Simpan dengan Nama Baru
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsSaveChoiceModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
