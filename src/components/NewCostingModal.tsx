import React, { useState } from 'react';
import { Product, ProductCostingRecord, Accessory, RawMaterial, ProductCostingItem } from '../types';
import { storageService } from '../services/storageService';
import { companyProfile } from '../data/defaultData';
import {
  Coins,
  Package,
  X,
  Sparkles,
  ArrowRight,
  Hash,
  ShoppingBag,
  Percent,
  User,
  Building2
} from 'lucide-react';

interface NewCostingModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  accessories: Accessory[];
  rawMaterials: RawMaterial[];
  onCreateCosting: (record: ProductCostingRecord) => void;
}

export const NewCostingModal: React.FC<NewCostingModalProps> = ({
  isOpen,
  onClose,
  products,
  accessories,
  rawMaterials,
  onCreateCosting,
}) => {
  if (!isOpen) return null;

  const defaultProduct = products[0];

  const [selectedProductId, setSelectedProductId] = useState<string>(
    defaultProduct?.id || 'prod-kopel-cn1'
  );
  const [orderQuantity, setOrderQuantity] = useState<number>(1000);
  const [costingNumber, setCostingNumber] = useState<string>(
    () => `CST-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`
  );
  const [title, setTitle] = useState<string>(() => {
    return defaultProduct
      ? `Analisis HPP & Costing ${defaultProduct.name}`
      : 'Analisis HPP Accessories & Jasa Baru';
  });
  const [companyName, setCompanyName] = useState<string>(
    companyProfile.companyName || 'CV. RAVINA'
  );
  const [buyerName, setBuyerName] = useState<string>(
    companyProfile.defaultBuyerName || 'Kopassus / Mabes TNI'
  );
  const [targetMarkupPercent, setTargetMarkupPercent] = useState<number>(25);

  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      setTitle(`Analisis HPP & Costing ${prod.name}`);
    }
  };

  // Helper to compute accessory/service price info from master
  const getAccessoryPriceInfo = (acc: Accessory) => {
    if (acc.category === 'ready_made' || acc.category === 'service') {
      const price = acc.purchasePrice || 0;
      const isService = acc.category === 'service';
      return {
        unitPrice: price,
        sourceLabel: isService ? 'Tarif Jasa Pengerjaan' : 'Beli Jadi (Langsung)',
        detailText: isService
          ? `Tarif Rp ${price.toLocaleString('id-ID')} / ${acc.unit}`
          : `Rp ${price.toLocaleString('id-ID')} / ${acc.unit}`,
        rawMaterialName: '-',
        rawMaterialUnitPrice: 0,
        yieldPerUnit: 1,
      };
    }

    const mat = rawMaterials.find((m) => m.id === acc.defaultRawMaterialId);
    const matPrice = mat?.unitPrice || 0;
    let consumption = acc.defaultConsumptionPerUnit;
    if (consumption === undefined && acc.defaultYieldPerUnit && acc.defaultYieldPerUnit > 0) {
      consumption = Number((1 / acc.defaultYieldPerUnit).toFixed(6));
    }
    const safeConsumption = consumption && consumption > 0 ? consumption : 0.002151;
    const price = Number((matPrice * safeConsumption).toFixed(2));
    const yieldVal = Number((1 / safeConsumption).toFixed(0));

    return {
      unitPrice: price,
      sourceLabel: `Olah Bahan: ${mat?.name || 'Bahan Baku'}`,
      detailText: `${yieldVal.toLocaleString('id-ID')} pcs/lbr (pemakaian ${safeConsumption.toFixed(6)})`,
      rawMaterialName: mat?.name || 'Bahan Baku',
      rawMaterialUnitPrice: matPrice,
      yieldPerUnit: yieldVal,
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const chosenProduct = products.find((p) => p.id === selectedProductId) || {
      id: 'prod-custom',
      code: 'PRD-001',
      name: 'Produk Costing',
      category: 'Garment',
      description: '',
      unit: 'Pcs',
      accessories: [],
      createdAt: '',
      updatedAt: '',
    };

    // Build initial costing items from master product accessories
    const items: ProductCostingItem[] = (chosenProduct.accessories || []).map((rel) => {
      const acc = accessories.find((a) => a.id === rel.accessoryId);
      if (!acc) {
        return {
          accessoryId: rel.accessoryId,
          accessoryName: 'Komponen Tidak Ditemukan',
          accessoryCategory: 'ready_made',
          rawMaterialName: '-',
          rawMaterialUnitPrice: 0,
          yieldPerUnit: 1,
          unitPrice: 0,
          usageQtyPerProduct: rel.qtyPerProduct,
          totalUsageQty: rel.qtyPerProduct * orderQuantity,
          totalCostPerProduct: 0,
          totalCostBatch: 0,
        };
      }
      const priceInfo = getAccessoryPriceInfo(acc);
      const usageQtyPerProduct = rel.qtyPerProduct;
      const totalUsageQty = usageQtyPerProduct * orderQuantity;
      const totalCostPerProduct = usageQtyPerProduct * priceInfo.unitPrice;
      const totalCostBatch = totalUsageQty * priceInfo.unitPrice;
      return {
        accessoryId: acc.id,
        accessoryName: acc.name,
        accessoryCategory: acc.category,
        rawMaterialName: priceInfo.rawMaterialName,
        rawMaterialUnitPrice: priceInfo.rawMaterialUnitPrice,
        yieldPerUnit: priceInfo.yieldPerUnit,
        unitPrice: priceInfo.unitPrice,
        usageQtyPerProduct,
        totalUsageQty,
        totalCostPerProduct,
        totalCostBatch,
        notes: priceInfo.detailText,
      };
    });

    const totalAccessoriesCostPerUnit = items
      .filter((i) => i.accessoryCategory !== 'service')
      .reduce((sum, i) => sum + i.totalCostPerProduct, 0);

    const totalServicesCostPerUnit = items
      .filter((i) => i.accessoryCategory === 'service')
      .reduce((sum, i) => sum + i.totalCostPerProduct, 0);

    const totalCostPerUnit = totalAccessoriesCostPerUnit + totalServicesCostPerUnit;
    const totalBatchCost = totalCostPerUnit * orderQuantity;
    const targetSellingPricePerUnit =
      targetMarkupPercent > 0 ? totalCostPerUnit * (1 + targetMarkupPercent / 100) : totalCostPerUnit;

    const newRecord: ProductCostingRecord = {
      id: `costing-${Date.now()}`,
      costingNumber: costingNumber.trim() || `CST-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
      title: title.trim() || `Analisis HPP ${chosenProduct.name}`,
      companyName: companyName.trim() || 'CV. RAVINA',
      productId: chosenProduct.id,
      productName: chosenProduct.name,
      productCode: chosenProduct.code,
      productCategory: chosenProduct.category,
      orderQuantity: Math.max(1, orderQuantity),
      items,
      totalCostPerUnit,
      totalBatchCost,
      totalAccessoriesCostPerUnit,
      totalServicesCostPerUnit,
      totalAccessoriesBatchCost: totalAccessoriesCostPerUnit * orderQuantity,
      totalServicesBatchCost: totalServicesCostPerUnit * orderQuantity,
      targetMarkupPercent,
      targetSellingPricePerUnit,
      calculationDate: new Date().toISOString().split('T')[0],
      notes: 'Estimasi biaya komponen accessories dan ongkos jasa pengerjaan untuk penentuan HPP.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onCreateCosting(newRecord);
    onClose();
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-900 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 border border-white/20 text-amber-200">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-white">
                Buat Perhitungan Costing (HPP) Baru
              </h3>
              <p className="text-xs text-amber-200/90">
                Modul Product Costing — Analisis HPP Accessories & Jasa Pengerjaan
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
          {/* Pilih Barang Jadi / Produk */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-amber-600" />
                Pilih Produk yang Akan Dihitung HPP-nya
              </span>
              <span className="text-[11px] font-normal text-slate-500">
                ({products.length} produk di master)
              </span>
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => handleProductChange(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-800 font-bold focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-hidden bg-white"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name} ({p.accessories?.length || 0} komponen accessories)
                </option>
              ))}
            </select>
            {selectedProduct && (
              <p className="mt-1 text-[11px] text-slate-500 line-clamp-1 italic">
                {selectedProduct.description || 'Komponen accessories otomatis terhubung dari Master'}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nomor Dokumen Costing */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-slate-500" />
                Nomor Dokumen Costing (HPP)
              </label>
              <input
                type="text"
                required
                value={costingNumber}
                onChange={(e) => setCostingNumber(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono font-semibold text-slate-800 focus:border-amber-600 outline-hidden"
                placeholder="Contoh: CST-2026-101"
              />
            </div>

            {/* Quantity Batch Pesanan */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-slate-500" />
                Jumlah Order Batch (Pcs)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  required
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 pl-3 pr-12 py-2 text-xs font-bold text-slate-800 focus:border-amber-600 outline-hidden"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  Pcs
                </span>
              </div>
            </div>
          </div>

          {/* Judul Perhitungan Costing */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Judul Dokumen Costing
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:border-amber-600 outline-hidden"
              placeholder="Contoh: Analisis HPP & Margin Sabuk Kopelriem CN1"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nama Buyer */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                Nama Buyer / Pemesan
              </label>
              <input
                type="text"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:border-amber-600 outline-hidden"
                placeholder="Contoh: Kopassus / Mabes TNI"
              />
            </div>

            {/* Target Margin % */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-amber-600" />
                Target Margin Keuntungan (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="1000"
                  step="0.5"
                  value={targetMarkupPercent}
                  onChange={(e) => setTargetMarkupPercent(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 pl-3 pr-8 py-2 text-xs font-bold text-slate-800 focus:border-amber-600 outline-hidden"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  %
                </span>
              </div>
            </div>
          </div>

          {/* Info Banner */}
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold">Tetap di Modul Product Costing</p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Formulir kalkulasi HPP produk baru akan langsung terbuka dengan rincian biaya accessories beli jadi, olahan bahan baku, serta tarif jasa pengerjaan.
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
              className="inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:shadow-lg cursor-pointer"
            >
              <span>Mulai Hitung Costing HPP</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
