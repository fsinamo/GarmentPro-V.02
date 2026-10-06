import React, { useState } from 'react';
import { Product, CalculationRecord } from '../types';
import { storageService } from '../services/storageService';
import {
  FilePlus2,
  Package,
  Layers,
  X,
  Sparkles,
  ArrowRight,
  Hash,
  User,
  ShoppingBag
} from 'lucide-react';

interface NewCalculationModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onCreateCalculation: (calc: CalculationRecord) => void;
}

export const NewCalculationModal: React.FC<NewCalculationModalProps> = ({
  isOpen,
  onClose,
  products,
  onCreateCalculation,
}) => {
  if (!isOpen) return null;

  const defaultProfile = storageService.getCompanyProfile();
  const defaultProduct = products[0];

  const [selectedProductId, setSelectedProductId] = useState<string>(
    defaultProduct?.id || 'prod-kopel-cn1'
  );
  const [orderQuantity, setOrderQuantity] = useState<number>(1000);
  const [calculationNumber, setCalculationNumber] = useState<string>(
    () => `BOM-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`
  );
  const [title, setTitle] = useState<string>(() => {
    return defaultProduct
      ? `Perhitungan Konsumsi ${defaultProduct.name}`
      : 'Perhitungan Konsumsi Bahan Baku Baru';
  });
  const [buyerName, setBuyerName] = useState<string>(
    defaultProfile.defaultBuyerName || 'Kopassus / Mabes TNI'
  );
  const [customerOrPoRef, setCustomerOrPoRef] = useState<string>('');

  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      setTitle(`Perhitungan Konsumsi ${prod.name}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const chosenProduct = products.find((p) => p.id === selectedProductId) || {
      id: 'prod-custom',
      code: 'PRD-NEW',
      name: 'Produk Baru',
      category: 'Garment',
      description: 'Deskripsi produk',
      unit: 'Pcs',
      accessories: [],
      createdAt: '',
      updatedAt: '',
    };

    const newRecord: CalculationRecord = {
      id: `calc-${Date.now()}`,
      calculationNumber: calculationNumber.trim() || `BOM-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
      title: title.trim() || `Perhitungan Konsumsi ${chosenProduct.name}`,
      companyName: defaultProfile.companyName || 'CV. RAVINA',
      companyLogo: defaultProfile.companyLogo || '',
      buyerName: buyerName.trim() || 'Umum',
      items: [
        {
          productId: chosenProduct.id,
          productName: chosenProduct.name,
          productCode: chosenProduct.code,
          productCategory: chosenProduct.category,
          description: chosenProduct.description,
          orderQuantity: Math.max(1, orderQuantity),
        },
      ],
      productId: chosenProduct.id,
      productName: chosenProduct.name,
      orderQuantity: Math.max(1, orderQuantity),
      customerOrPoRef: customerOrPoRef.trim(),
      calculationDate: new Date().toISOString().split('T')[0],
      details: [],
      summary: [],
      notes: 'Kalkulasi kebutuhan bahan baku dihitung berdasarkan pemakaian per unit (ketepatan 6 desimal).',
      syncStatus: 'local_only',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onCreateCalculation(newRecord);
    onClose();
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-800 to-emerald-950 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 border border-white/20 text-emerald-300">
              <FilePlus2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-white">
                Buat Perhitungan Konsumsi Baru
              </h3>
              <p className="text-xs text-emerald-200/80">
                Pilih barang jadi dan atur kuantitas order untuk memulai perhitungan bahan baku
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Pilih Barang Jadi */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-emerald-600" />
                Pilih Barang Jadi Utama
              </span>
              <span className="text-[11px] font-normal text-slate-500">
                ({products.length} barang jadi tersedia di master)
              </span>
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => handleProductChange(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden bg-white"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name} ({p.accessories.length} accessories)
                </option>
              ))}
            </select>
            {selectedProduct && (
              <p className="mt-1 text-[11px] text-slate-500 line-clamp-1 italic">
                {selectedProduct.description || 'Barang jadi dari master produk'}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nomor Dokumen BOM */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-slate-500" />
                Nomor Perhitungan (BOM / SPK)
              </label>
              <input
                type="text"
                required
                value={calculationNumber}
                onChange={(e) => setCalculationNumber(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono font-semibold text-slate-800 focus:border-emerald-600 outline-hidden"
                placeholder="Contoh: BOM-2026-101"
              />
            </div>

            {/* Quantity Order */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-slate-500" />
                Jumlah Order (Quantity)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  required
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 pl-3 pr-12 py-2 text-xs font-bold text-slate-800 focus:border-emerald-600 outline-hidden"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  {selectedProduct?.unit || 'Pcs'}
                </span>
              </div>
            </div>
          </div>

          {/* Judul Perhitungan */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Judul Perhitungan
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:border-emerald-600 outline-hidden"
              placeholder="Contoh: Perhitungan Konsumsi Sabuk Kopelriem CN1 Mabes TNI"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nama Buyer */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                Nama Buyer / Instansi
              </label>
              <input
                type="text"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:border-emerald-600 outline-hidden"
                placeholder="Contoh: Kopassus / Mabes TNI"
              />
            </div>

            {/* Referensi PO / Kontrak */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                No. PO / Referensi Kontrak (Opsional)
              </label>
              <input
                type="text"
                value={customerOrPoRef}
                onChange={(e) => setCustomerOrPoRef(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:border-emerald-600 outline-hidden"
                placeholder="Contoh: PO-TNI-2026/09"
              />
            </div>
          </div>

          {/* Info Banner */}
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold">Perhitungan Otomatis 6 Desimal</p>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Anda juga bisa menambah barang jadi kedua atau ketiga nanti di dalam kalkulator
                jika ingin membuat laporan gabungan beberapa produk.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:shadow-lg cursor-pointer"
            >
              <span>Mulai Perhitungan Sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
