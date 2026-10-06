import React, { useState } from 'react';
import { Product, Accessory } from '../types';
import { Package, Plus, Edit2, Trash2, Check, X, Calculator, Layers, Coins, CheckCircle2, Scissors } from 'lucide-react';

interface MasterProductsViewProps {
  products: Product[];
  accessories: Accessory[];
  onSaveProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  onSelectForCalculation: (product: Product) => void;
  onNavigateToCosting?: (product: Product) => void;
}

export const MasterProductsView: React.FC<MasterProductsViewProps> = ({
  products,
  accessories,
  onSaveProduct,
  onDeleteProduct,
  onSelectForCalculation,
  onNavigateToCosting,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(null);

  // Required Fields per brief:
  // 1. Nama barang jadi
  // 2. Deskripsi
  // 3. Nama accessories
  // 4. Jumlah accessories yang dipakai
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Perlengkapan Dinas / Kopel');
  const [unit, setUnit] = useState('Pcs');
  const [description, setDescription] = useState('');
  const [productAccessories, setProductAccessories] = useState<
    Array<{ accessoryId: string; qtyPerProduct: number }>
  >([]);

  const handleOpenNew = () => {
    const nextNum = products.length + 1;
    setCode(`PRD-00${nextNum}`);
    setName('');
    setCategory('Perlengkapan Dinas / Kopel');
    setUnit('Pcs');
    setDescription('');
    setProductAccessories([]);
    setEditingProduct(null);
    setFormSuccessMessage(null);
    setIsEditing(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setCode(p.code);
    setName(p.name);
    setCategory(p.category);
    setUnit(p.unit);
    setDescription(p.description || '');
    setProductAccessories([...p.accessories]);
    setFormSuccessMessage(null);
    setIsEditing(true);
  };

  const handleToggleAccessory = (accId: string) => {
    const exists = productAccessories.find((a) => a.accessoryId === accId);
    if (exists) {
      setProductAccessories(productAccessories.filter((a) => a.accessoryId !== accId));
    } else {
      setProductAccessories([...productAccessories, { accessoryId: accId, qtyPerProduct: 2 }]);
    }
  };

  const handleUpdateAccQty = (accId: string, qty: number) => {
    setProductAccessories(
      productAccessories.map((a) => (a.accessoryId === accId ? { ...a, qtyPerProduct: qty } : a))
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const savedName = name.trim();
    const isNew = !editingProduct;

    const item: Product = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      code: code.trim() || `PRD-${Date.now().toString().slice(-4)}`,
      name: savedName,
      category: category.trim() || 'Perlengkapan Garment',
      unit: unit.trim() || 'Pcs',
      description: description.trim(),
      accessories: productAccessories,
      createdAt: editingProduct ? editingProduct.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveProduct(item);

    if (isNew) {
      setFormSuccessMessage(`Barang Jadi "${savedName}" berhasil disimpan! Formulir siap untuk input barang jadi berikutnya.`);
      const nextNum = products.length + 2;
      setCode(`PRD-00${nextNum}`);
      setName('');
      setDescription('');
      setProductAccessories([]);
    } else {
      setFormSuccessMessage(`Perubahan data barang jadi "${savedName}" berhasil disimpan!`);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-white p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-800">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Master Data Barang Jadi (Produk)</h2>
            <p className="text-xs text-slate-500">
              Konfigurasi 1. Nama barang jadi, 2. Deskripsi, 3. Nama accessories, dan 4. Jumlah accessories yang dipakai
            </p>
          </div>
        </div>
        <button
          id="btn-add-product"
          onClick={handleOpenNew}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-800 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-900 transition shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Barang Jadi</span>
        </button>
      </div>

      {/* Modal / Form Create or Edit */}
      {isEditing && (
        <div className="rounded-2xl border-2 border-blue-600 bg-white p-6 shadow-md animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {editingProduct ? 'Edit Barang Jadi' : 'Tambah Barang Jadi Baru'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Tentukan nama barang jadi, deskripsi, accessories yang dipakai, dan jumlahnya
              </p>
            </div>
            <button
              onClick={() => {
                setIsEditing(false);
                setFormSuccessMessage(null);
              }}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              title="Tutup Formulir"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {formSuccessMessage && (
            <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-300 p-3.5 text-xs text-emerald-900 flex items-center justify-between shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{formSuccessMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setFormSuccessMessage(null)}
                className="text-emerald-500 hover:text-emerald-700 font-bold ml-2 cursor-pointer"
              >
                ×
              </button>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kode Produk</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 font-mono outline-hidden focus:border-blue-600"
                  required
                />
              </div>

              {/* 1. Nama barang jadi */}
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  1. Nama Barang Jadi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Kopelriem CN1, Sabuk Dinas Sabhara, Rompi Taktis"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-hidden focus:border-blue-600 font-medium"
                  required
                />
              </div>

              {/* 2. Deskripsi */}
              <div className="sm:col-span-3">
                <label className="block font-semibold text-slate-700 mb-1">
                  2. Deskripsi Barang Jadi <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contoh: Sabuk dinas kopelriem standar CN1 dengan 5 komponen accessories kuningan & stainless"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-hidden focus:border-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kategori</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Perlengkapan Dinas / Kopel"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-hidden focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Satuan Produk</label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="Pcs, Set, Pasang"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-hidden focus:border-blue-600"
                />
              </div>
            </div>

            {/* 3. Nama accessories & 4. Jumlah accessories yang dipakai */}
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-xs">
                    3. Nama Accessories & 4. Jumlah Accessories yang Dipakai
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Centang accessories yang dipakai pada barang jadi ini, lalu masukkan jumlah pemakaian per 1 pcs.
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-blue-800 bg-blue-100/60 px-2.5 py-1 rounded-md">
                  {productAccessories.length} Accessories Terpilih
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2">
                {accessories.map((acc) => {
                  const isSelected = productAccessories.some((a) => a.accessoryId === acc.id);
                  const selectedRel = productAccessories.find((a) => a.accessoryId === acc.id);
                  const isRaw = acc.category === 'raw_material_based';
                  const isReady = acc.category === 'ready_made';
                  const isService = acc.category === 'service';

                  return (
                    <div
                      key={acc.id}
                      className={`flex flex-col justify-between p-3 rounded-xl border transition ${
                        isSelected
                          ? 'border-blue-500 bg-white shadow-xs'
                          : 'border-slate-200 bg-slate-100/60 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          id={`acc-chk-${acc.id}`}
                          checked={isSelected}
                          onChange={() => handleToggleAccessory(acc.id)}
                          className="mt-1 h-4 w-4 rounded-md border-slate-300 text-blue-700 focus:ring-blue-600 cursor-pointer"
                        />
                        <label htmlFor={`acc-chk-${acc.id}`} className="cursor-pointer flex-1">
                          <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
                            <span>{acc.name}</span>
                            <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                              {isRaw ? 'Olah Bahan' : isReady ? 'Beli Jadi' : 'Jasa'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {isRaw && acc.defaultConsumptionPerUnit && (
                              <span>Pemakaian: {acc.defaultConsumptionPerUnit.toFixed(6)} unit bahan</span>
                            )}
                            {isReady && <span>Harga: Rp {(acc.purchasePrice || 0).toLocaleString('id-ID')}</span>}
                            {isService && <span>Tarif: Rp {(acc.purchasePrice || 0).toLocaleString('id-ID')}</span>}
                          </div>
                        </label>
                      </div>

                      {isSelected && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-slate-700">4. Jumlah Dipakai:</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="1"
                              step="any"
                              value={selectedRel?.qtyPerProduct || 1}
                              onChange={(e) =>
                                handleUpdateAccQty(acc.id, parseFloat(e.target.value) || 1)
                              }
                              className="w-16 rounded-md border border-slate-300 bg-white px-2 py-1 text-center font-mono font-bold text-xs text-blue-900"
                            />
                            <span className="text-[11px] text-slate-500 font-medium">{acc.unit}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 flex-wrap">
              <div className="text-[11px] text-slate-500 font-medium">
                {!editingProduct && '💡 Setelah simpan, formulir siap untuk memasukkan barang jadi lainnya.'}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setFormSuccessMessage(null);
                  }}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  {formSuccessMessage ? '✓ Selesai & Tutup' : 'Batal / Tutup'}
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-800 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-900 transition shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingProduct ? 'Simpan Perubahan' : '💾 Simpan & Input Produk Lain'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Product List Cards / Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {products.map((p) => (
          <div
            key={p.id}
            className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 transition"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                    {p.code}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-1">1. {p.name}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(p)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                    title="Edit barang jadi"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Hapus barang jadi ${p.name}?`)) onDeleteProduct(p.id);
                    }}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                    title="Hapus barang jadi"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 2. Deskripsi */}
              <p className="text-xs text-slate-600 mb-3 line-clamp-2">
                <strong>2. Deskripsi:</strong> {p.description || '-'}
              </p>

              {/* 3. & 4. Accessories */}
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 mb-4">
                <div className="text-[11px] font-bold text-slate-700 mb-2 flex items-center justify-between">
                  <span>3. Accessories & 4. Jumlah Terpakai:</span>
                  <span className="text-[10px] text-blue-700 bg-blue-100/60 px-1.5 py-0.5 rounded font-mono">
                    {p.accessories.length} Komponen
                  </span>
                </div>
                <div className="space-y-1.5">
                  {p.accessories.map((rel) => {
                    const acc = accessories.find((a) => a.id === rel.accessoryId);
                    return (
                      <div
                        key={rel.accessoryId}
                        className="flex items-center justify-between text-xs text-slate-800 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200"
                      >
                        <span className="font-medium">{acc ? acc.name : rel.accessoryId}</span>
                        <span className="font-mono font-bold text-blue-800">
                          {rel.qtyPerProduct} {acc?.unit || 'buah'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => onSelectForCalculation(p)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-800 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-900 transition shadow-xs cursor-pointer"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Hitung Konsumsi</span>
              </button>
              {onNavigateToCosting && (
                <button
                  onClick={() => onNavigateToCosting(p)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-900 hover:bg-blue-100 transition cursor-pointer"
                  title="Buka Product Costing HPP"
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>Costing HPP</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
