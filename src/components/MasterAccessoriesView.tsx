import React, { useState } from 'react';
import { Accessory, AccessoryCategory, RawMaterial } from '../types';
import {
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Layers,
  Coins,
  Calculator,
  CheckCircle2,
  HelpCircle,
  Scissors
} from 'lucide-react';

interface MasterAccessoriesViewProps {
  accessories: Accessory[];
  rawMaterials: RawMaterial[];
  onSaveAccessory: (acc: Accessory) => void;
  onDeleteAccessory: (id: string) => void;
}

export const MasterAccessoriesView: React.FC<MasterAccessoriesViewProps> = ({
  accessories,
  rawMaterials,
  onSaveAccessory,
  onDeleteAccessory,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<Accessory | null>(null);

  // Filter tab
  const [activeFilter, setActiveFilter] = useState<'all' | 'raw_material_based' | 'ready_made' | 'service'>('all');
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(null);

  // Form states per brief:
  // 1. Nama accessories
  // 2. Nama bahan
  // 3. Pemakaian (dalam 6 desimal)
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('buah');
  const [category, setCategory] = useState<AccessoryCategory>('raw_material_based');
  const [defaultRawMaterialId, setDefaultRawMaterialId] = useState('');
  const [consumptionPerUnit, setConsumptionPerUnit] = useState<number>(0.002151); // 6 desimal
  const [purchasePrice, setPurchasePrice] = useState<number>(1500);
  const [notes, setNotes] = useState('');

  // Helper calculator states (Opsi bantu hitung dari ukuran atau yield)
  const [showHelperCalc, setShowHelperCalc] = useState(false);
  const [calcMode, setCalcMode] = useState<'dimensions' | 'yield'>('yield');
  const [helperAccLength, setHelperAccLength] = useState<number>(3.5);
  const [helperAccWidth, setHelperAccWidth] = useState<number>(4.4);
  const [helperYieldInput, setHelperYieldInput] = useState<number>(465);

  const selectedRawMaterial = rawMaterials.find((m) => m.id === defaultRawMaterialId) || rawMaterials[0];

  const handleOpenNew = (forcedCategory?: AccessoryCategory) => {
    const nextNum = accessories.length + 1;
    const initialCat = forcedCategory || (activeFilter !== 'all' ? activeFilter : 'raw_material_based');
    const prefix = initialCat === 'service' ? 'JSA' : 'ACC';
    setCode(`${prefix}-00${nextNum}`);
    setName('');
    setUnit(initialCat === 'service' ? 'pcs' : 'buah');
    setCategory(initialCat);
    setDefaultRawMaterialId(rawMaterials[0]?.id || '');
    setConsumptionPerUnit(0.002151);
    setPurchasePrice(initialCat === 'service' ? 12500 : 1500);
    setNotes('');
    setEditingItem(null);
    setFormSuccessMessage(null);
    setShowHelperCalc(false);
    setIsEditing(true);
  };

  const handleOpenEdit = (a: Accessory) => {
    setEditingItem(a);
    setCode(a.code);
    setName(a.name);
    setUnit(a.unit);
    const cat: AccessoryCategory = a.category || (a.defaultRawMaterialId ? 'raw_material_based' : 'ready_made');
    setCategory(cat);
    setDefaultRawMaterialId(a.defaultRawMaterialId || (rawMaterials[0]?.id || ''));
    
    // Resolve 6-decimal consumption
    let c = a.defaultConsumptionPerUnit;
    if (c === undefined && a.defaultYieldPerUnit && a.defaultYieldPerUnit > 0) {
      c = Number((1 / a.defaultYieldPerUnit).toFixed(6));
    }
    setConsumptionPerUnit(c !== undefined ? c : 0.002151);

    setPurchasePrice(a.purchasePrice || 0);
    setNotes(a.notes || '');
    setFormSuccessMessage(null);
    setShowHelperCalc(false);
    setIsEditing(true);
  };

  const handleSelectCategoryOption = (selectedCat: AccessoryCategory) => {
    setCategory(selectedCat);
    if (!editingItem) {
      const nextNum = accessories.length + 1;
      const prefix = selectedCat === 'service' ? 'JSA' : 'ACC';
      setCode(`${prefix}-00${nextNum}`);
      if (selectedCat === 'service') {
        if (unit === 'buah') setUnit('pcs');
        if (purchasePrice === 1500 || purchasePrice === 0) setPurchasePrice(12500);
      }
    }
  };

  // Helper apply calculation
  const handleApplyHelperCalculation = () => {
    if (calcMode === 'yield') {
      const y = Number(helperYieldInput) || 1;
      if (y > 0) {
        const result = Number((1 / y).toFixed(6));
        setConsumptionPerUnit(result);
        setShowHelperCalc(false);
      }
    } else {
      const matArea = selectedRawMaterial?.totalArea || ((selectedRawMaterial?.length || 120) * (selectedRawMaterial?.width || 60));
      const accArea = (Number(helperAccLength) || 0) * (Number(helperAccWidth) || 0);
      if (matArea > 0 && accArea > 0) {
        const result = Number((accArea / matArea).toFixed(6));
        setConsumptionPerUnit(result);
        setShowHelperCalc(false);
      }
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const savedName = name.trim();
    const isNew = !editingItem;
    const isDirectPrice = category === 'ready_made' || category === 'service';

    const cleanConsumption = !isDirectPrice ? Number(Number(consumptionPerUnit).toFixed(6)) : undefined;
    const cleanYield = cleanConsumption && cleanConsumption > 0 ? Number((1 / cleanConsumption).toFixed(2)) : undefined;

    const item: Accessory = {
      id: editingItem ? editingItem.id : (category === 'service' ? `jasa-${Date.now()}` : `acc-${Date.now()}`),
      code: code.trim() || (category === 'service' ? `JSA-${Date.now().toString().slice(-4)}` : `ACC-${Date.now().toString().slice(-4)}`),
      name: savedName,
      unit: unit.trim() || (category === 'service' ? 'pcs' : 'buah'),
      category: category,
      purchasePrice: isDirectPrice ? Number(purchasePrice) || 0 : undefined,
      defaultRawMaterialId: category === 'raw_material_based' ? (defaultRawMaterialId || (rawMaterials[0]?.id || '')) : undefined,
      defaultConsumptionPerUnit: cleanConsumption,
      defaultYieldPerUnit: cleanYield,
      notes: notes.trim(),
      createdAt: editingItem ? editingItem.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveAccessory(item);

    if (isNew) {
      const typeLabel = category === 'service' ? 'Jasa' : 'Accessories';
      setFormSuccessMessage(`${typeLabel} "${savedName}" berhasil disimpan! Pemakaian: ${cleanConsumption ?? '-'} unit bahan.`);
      const nextNum = accessories.length + 2;
      const prefix = category === 'service' ? 'JSA' : 'ACC';
      setCode(`${prefix}-00${nextNum}`);
      setName('');
      setNotes('');
    } else {
      setFormSuccessMessage(`Perubahan data accessories "${savedName}" berhasil disimpan!`);
    }
  };

  const filteredAccessories = accessories.filter((a) => {
    if (activeFilter === 'all') return true;
    return a.category === activeFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-white p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-800">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Master Data Accessories & Komponen</h2>
            <p className="text-xs text-slate-500">
              Spesifikasi nama accessories, nama bahan baku, dan pemakaian bahan per unit (ketepatan 6 desimal)
            </p>
          </div>
        </div>
        <button
          id="btn-add-accessory"
          onClick={() => handleOpenNew()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-800 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-900 transition shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Accessories</span>
        </button>
      </div>

      {isEditing && (
        <div className="rounded-2xl border-2 border-purple-600 bg-white p-6 shadow-md animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {editingItem ? 'Edit Accessories' : 'Tambah Accessories Baru'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Pilih jenis: Olah Bahan Baku (membutuhkan bahan baku), Beli Jadi Tanpa Diolah, atau Jasa
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

          {/* Selector Kategori */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <button
              type="button"
              onClick={() => handleSelectCategoryOption('raw_material_based')}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                category === 'raw_material_based'
                  ? 'border-purple-600 bg-purple-50 text-purple-950 font-bold shadow-xs'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 text-xs mb-1">
                <Layers className="w-4 h-4 text-purple-700" />
                <span>Olah Bahan Baku</span>
              </div>
              <p className="text-[11px] font-normal text-slate-500">
                Dibuat dari bahan baku (plat kuningan, stainless, kain, dll.) dengan pemakaian 6 desimal
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleSelectCategoryOption('ready_made')}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                category === 'ready_made'
                  ? 'border-blue-600 bg-blue-50 text-blue-950 font-bold shadow-xs'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 text-xs mb-1">
                <Coins className="w-4 h-4 text-blue-700" />
                <span>Beli Jadi Tanpa Diolah</span>
              </div>
              <p className="text-[11px] font-normal text-slate-500">
                Komponen langsung beli siap pakai (buckle nilon, kancing jepit, ring D)
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleSelectCategoryOption('service')}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                category === 'service'
                  ? 'border-amber-600 bg-amber-50 text-amber-950 font-bold shadow-xs'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 text-xs mb-1">
                <Scissors className="w-4 h-4 text-amber-700" />
                <span>Jasa / Biaya Kerja</span>
              </div>
              <p className="text-[11px] font-normal text-slate-500">
                Ongkos jahit, cutting press, bordir komputer, atau finishing
              </p>
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kode Aksesoris</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 font-mono outline-hidden focus:border-purple-600"
                  required
                />
              </div>

              {/* 1. Nama accessories */}
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  1. Nama Accessories <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Kotak, Lidah, Bentuk U, Ujung Gerigi, Buckle Tactical"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-hidden focus:border-purple-600 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Satuan</label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="buah, set, pcs"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-hidden focus:border-purple-600"
                  required
                />
              </div>

              {/* Kondisional jika Olah Bahan Baku */}
              {category === 'raw_material_based' ? (
                <>
                  {/* 2. Nama bahan */}
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      2. Nama Bahan Baku <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={defaultRawMaterialId}
                      onChange={(e) => setDefaultRawMaterialId(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-hidden focus:border-purple-600 bg-white"
                      required
                    >
                      {rawMaterials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} [Tebal: {m.thickness || '-'}] (Penampang: {m.totalArea?.toLocaleString('id-ID') || '-'} {m.dimensionUnit || 'cm'}²)
                        </option>
                      ))}
                    </select>
                    {selectedRawMaterial && (
                      <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-2">
                        <span>Dimensi Bahan: <strong>{selectedRawMaterial.length} × {selectedRawMaterial.width} {selectedRawMaterial.dimensionUnit || 'cm'}</strong></span>
                        <span>•</span>
                        <span>Penampang: <strong>{selectedRawMaterial.totalArea?.toLocaleString('id-ID')} {selectedRawMaterial.dimensionUnit || 'cm'}²</strong></span>
                      </div>
                    )}
                  </div>

                  {/* 3. Pemakaian (dalam 6 desimal) */}
                  <div className="sm:col-span-3 rounded-2xl bg-purple-50/70 border border-purple-200 p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <label className="block font-bold text-purple-950 text-xs">
                          3. Pemakaian Bahan per 1 Buah Accessories (Ketepatan 6 Desimal) <span className="text-rose-500">*</span>
                        </label>
                        <p className="text-[11px] text-purple-800">
                          Berapa lembar/unit bahan yang dibutuhkan untuk membuat 1 buah accessories ini (kebalikan dari yield)
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowHelperCalc(!showHelperCalc)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-700 text-white text-[11px] font-semibold hover:bg-purple-800 transition cursor-pointer shrink-0"
                      >
                        <Calculator className="w-3.5 h-3.5" />
                        <span>{showHelperCalc ? 'Tutup Alat Bantu' : 'Bantu Hitung Pemakaian'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                      <div>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.000001"
                            min="0.000001"
                            value={consumptionPerUnit}
                            onChange={(e) => setConsumptionPerUnit(parseFloat(e.target.value) || 0)}
                            placeholder="0.002151"
                            className="w-full rounded-xl border border-purple-300 bg-white px-3.5 py-2.5 text-sm font-mono font-bold text-purple-950 outline-hidden focus:border-purple-600 shadow-xs"
                            required
                          />
                          <span className="absolute right-3 top-2.5 text-[11px] font-semibold text-purple-700">
                            {selectedRawMaterial?.unit || 'Lembar'} / buah
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-purple-900 bg-white/80 rounded-xl p-3 border border-purple-200">
                        <div className="font-semibold flex items-center justify-between">
                          <span>Ekuivalen Hasil (Yield):</span>
                          <span className="font-mono font-bold text-purple-800 text-sm">
                            {consumptionPerUnit > 0 ? (1 / consumptionPerUnit).toFixed(2) : '0'} buah / {selectedRawMaterial?.unit || 'lembar'}
                          </span>
                        </div>
                        <div className="text-[10px] text-purple-700 mt-1">
                          Estimasi Biaya Bahan Baku: Rp {selectedRawMaterial?.unitPrice ? (consumptionPerUnit * selectedRawMaterial.unitPrice).toLocaleString('id-ID', { maximumFractionDigits: 2 }) : 0} per buah
                        </div>
                      </div>
                    </div>

                    {/* Pop-out Helper Calculator */}
                    {showHelperCalc && (
                      <div className="rounded-xl bg-white p-4 border border-purple-300 shadow-sm animate-in fade-in space-y-3">
                        <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                          <span className="font-bold text-xs text-purple-900">Alat Bantu Hitung Pemakaian (6 Desimal)</span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setCalcMode('yield')}
                              className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                                calcMode === 'yield' ? 'bg-purple-100 text-purple-900 font-bold' : 'text-slate-500'
                              }`}
                            >
                              Dari Yield Lapangan
                            </button>
                            <button
                              type="button"
                              onClick={() => setCalcMode('dimensions')}
                              className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                                calcMode === 'dimensions' ? 'bg-purple-100 text-purple-900 font-bold' : 'text-slate-500'
                              }`}
                            >
                              Dari Ukuran Aksesoris (P × L)
                            </button>
                          </div>
                        </div>

                        {calcMode === 'yield' ? (
                          <div className="space-y-2">
                            <label className="block text-[11px] font-semibold text-slate-700">
                              Masukkan Hasil / Yield dari 1 {selectedRawMaterial?.unit || 'lembar'} bahan:
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                step="any"
                                value={helperYieldInput}
                                onChange={(e) => setHelperYieldInput(parseFloat(e.target.value) || 0)}
                                placeholder="Contoh: 465"
                                className="w-48 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-mono font-bold"
                              />
                              <span className="text-xs text-slate-600">buah / {selectedRawMaterial?.unit || 'lembar'}</span>
                              <button
                                type="button"
                                onClick={handleApplyHelperCalculation}
                                className="px-3 py-1.5 rounded-lg bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 transition cursor-pointer ml-auto"
                              >
                                Terapkan Pemakaian: {helperYieldInput > 0 ? (1 / helperYieldInput).toFixed(6) : 0}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                  Panjang Potong Aksesoris ({selectedRawMaterial?.dimensionUnit || 'cm'})
                                </label>
                                <input
                                  type="number"
                                  step="any"
                                  value={helperAccLength}
                                  onChange={(e) => setHelperAccLength(parseFloat(e.target.value) || 0)}
                                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-mono"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                  Lebar Potong Aksesoris ({selectedRawMaterial?.dimensionUnit || 'cm'})
                                </label>
                                <input
                                  type="number"
                                  step="any"
                                  value={helperAccWidth}
                                  onChange={(e) => setHelperAccWidth(parseFloat(e.target.value) || 0)}
                                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-mono"
                                />
                              </div>
                            </div>
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[11px] text-slate-600">
                                Penampang Aksesoris: {(helperAccLength * helperAccWidth).toFixed(2)} ÷ Penampang Bahan ({selectedRawMaterial?.totalArea || 7200})
                              </span>
                              <button
                                type="button"
                                onClick={handleApplyHelperCalculation}
                                className="px-3 py-1.5 rounded-lg bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 transition cursor-pointer"
                              >
                                Terapkan Pemakaian 6 Desimal
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Kondisional jika Beli Jadi atau Jasa */
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    {category === 'service' ? 'Tarif Jasa Pengerjaan (Rp)' : 'Harga Beli Satuan Siap Pakai (Rp)'}{' '}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                    placeholder="Contoh: 4500"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 font-mono font-bold outline-hidden focus:border-purple-600"
                    required
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    {category === 'service'
                      ? 'Tarif jasa langsung dihitung dalam HPP Product Costing tanpa pemotongan bahan baku'
                      : 'Komponen accessories beli jadi tanpa diolah, langsung masuk ke HPP Product Costing'}
                  </p>
                </div>
              )}

              <div className="sm:col-span-3">
                <label className="block font-semibold text-slate-700 mb-1">Catatan</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Keterangan fungsi atau posisi pemasangan"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-hidden focus:border-purple-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 flex-wrap">
              <div className="text-[11px] text-slate-500 font-medium">
                {!editingItem && '💡 Setelah simpan, formulir siap untuk memasukkan accessories berikutnya.'}
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
                  className="inline-flex items-center gap-1.5 rounded-xl bg-purple-700 px-5 py-2 text-xs font-semibold text-white hover:bg-purple-800 transition shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingItem ? 'Simpan Perubahan' : '💾 Simpan & Input Aksesoris Lain'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 flex-wrap">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Semua ({accessories.length})
        </button>
        <button
          onClick={() => setActiveFilter('raw_material_based')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeFilter === 'raw_material_based' ? 'bg-purple-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Olah Bahan Baku ({accessories.filter((a) => a.category === 'raw_material_based').length})
        </button>
        <button
          onClick={() => setActiveFilter('ready_made')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeFilter === 'ready_made' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Beli Jadi ({accessories.filter((a) => a.category === 'ready_made').length})
        </button>
        <button
          onClick={() => setActiveFilter('service')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeFilter === 'service' ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Jasa ({accessories.filter((a) => a.category === 'service').length})
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                <th className="py-3 px-4 font-bold">Kode</th>
                <th className="py-3 px-4 font-bold">1. Nama Accessories</th>
                <th className="py-3 px-4 font-bold">Jenis Komponen</th>
                <th className="py-3 px-4 font-bold">2. Nama Bahan Baku</th>
                <th className="py-3 px-4 font-bold text-right">3. Pemakaian (6 Desimal) / Tarif</th>
                <th className="py-3 px-4 font-bold text-right">Ekuivalen Yield</th>
                <th className="py-3 px-4 font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredAccessories.map((a) => {
                const mat = rawMaterials.find((m) => m.id === a.defaultRawMaterialId);
                const isRaw = a.category === 'raw_material_based';
                const isReady = a.category === 'ready_made';
                const isService = a.category === 'service';

                let consumption = a.defaultConsumptionPerUnit;
                if (consumption === undefined && a.defaultYieldPerUnit && a.defaultYieldPerUnit > 0) {
                  consumption = Number((1 / a.defaultYieldPerUnit).toFixed(6));
                }

                return (
                  <tr key={a.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-mono font-bold text-slate-600">{a.code}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{a.name}</div>
                      {a.notes && <div className="text-[11px] text-slate-500">{a.notes}</div>}
                    </td>
                    <td className="py-3 px-4">
                      {isRaw && (
                        <span className="rounded-md bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 font-semibold text-[11px]">
                          Olah Bahan
                        </span>
                      )}
                      {isReady && (
                        <span className="rounded-md bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 font-semibold text-[11px]">
                          Beli Jadi
                        </span>
                      )}
                      {isService && (
                        <span className="rounded-md bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 font-semibold text-[11px]">
                          Jasa
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {isRaw ? (
                        <div>
                          <span className="font-semibold text-slate-800">{mat?.name || 'Bahan Baku'}</span>
                          {mat?.thickness && (
                            <span className="block text-[10px] text-slate-500">Tebal: {mat.thickness}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">- Langsung Dipakai -</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold">
                      {isRaw ? (
                        <span className="text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          {consumption !== undefined ? consumption.toFixed(6) : '-'} <span className="text-[10px] text-purple-700">{mat?.unit || 'lembar'}</span>
                        </span>
                      ) : (
                        <span className="text-slate-800">
                          Rp {(a.purchasePrice || 0).toLocaleString('id-ID')}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      {isRaw && consumption && consumption > 0 ? (
                        <span>{(1 / consumption).toFixed(0)} buah / {mat?.unit || 'lembar'}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(a)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                          title="Edit aksesoris"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Hapus accessories ${a.name}?`)) onDeleteAccessory(a.id);
                          }}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                          title="Hapus aksesoris"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
