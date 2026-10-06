import React, { useState } from 'react';
import { RawMaterial } from '../types';
import { Layers, Plus, Edit2, Trash2, Check, X, CheckCircle2, Calculator, Info } from 'lucide-react';

interface MasterRawMaterialsViewProps {
  rawMaterials: RawMaterial[];
  onSaveRawMaterial: (material: RawMaterial) => void;
  onDeleteRawMaterial: (id: string) => void;
}

export const MasterRawMaterialsView: React.FC<MasterRawMaterialsViewProps> = ({
  rawMaterials,
  onSaveRawMaterial,
  onDeleteRawMaterial,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<RawMaterial | null>(null);
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(null);

  // Required Fields per brief:
  // 1. Nama bahan
  // 2. Tebal bahan
  // 3. Panjang bahan
  // 4. Lebar bahan
  // 5. Total penampang bahan (perkalian panjang x lebar)
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [thickness, setThickness] = useState('0,65 mm');
  const [length, setLength] = useState<number>(120);
  const [width, setWidth] = useState<number>(60);
  const [dimensionUnit, setDimensionUnit] = useState<'cm' | 'mm' | 'm'>('cm');
  const [unit, setUnit] = useState('Lembar');
  const [currentStock, setCurrentStock] = useState<number>(100);
  const [unitPrice, setUnitPrice] = useState<number>(285000);
  const [specification, setSpecification] = useState('');
  const [notes, setNotes] = useState('');

  // Total penampang bahan (perkalian panjang x lebar)
  const calculatedTotalArea = (Number(length) || 0) * (Number(width) || 0);

  const handleOpenNew = () => {
    const nextNum = rawMaterials.length + 1;
    setCode(`BB-00${nextNum}`);
    setName('');
    setThickness('0,65 mm');
    setLength(120);
    setWidth(60);
    setDimensionUnit('cm');
    setUnit('Lembar');
    setCurrentStock(100);
    setUnitPrice(285000);
    setSpecification('');
    setNotes('');
    setEditingItem(null);
    setFormSuccessMessage(null);
    setIsEditing(true);
  };

  const handleOpenEdit = (m: RawMaterial) => {
    setEditingItem(m);
    setCode(m.code);
    setName(m.name);
    setThickness(m.thickness || '0,65 mm');
    setLength(m.length ?? 120);
    setWidth(m.width ?? 60);
    setDimensionUnit((m.dimensionUnit as 'cm' | 'mm' | 'm') || 'cm');
    setUnit(m.unit);
    setCurrentStock(m.currentStock);
    setUnitPrice(m.unitPrice || 0);
    setSpecification(m.specification || '');
    setNotes(m.notes || '');
    setFormSuccessMessage(null);
    setIsEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const savedName = name.trim();
    const isNew = !editingItem;
    const lenVal = Number(length) || 0;
    const widVal = Number(width) || 0;
    const totalAreaVal = lenVal * widVal;

    const autoSpec = specification.trim()
      ? specification.trim()
      : `Tebal ${thickness || '-'}, Dimensi ${lenVal} × ${widVal} ${dimensionUnit} (Luas: ${totalAreaVal.toLocaleString('id-ID')} ${dimensionUnit}²)`;

    const item: RawMaterial = {
      id: editingItem ? editingItem.id : `bb-${Date.now()}`,
      code: code.trim() || `BB-${Date.now().toString().slice(-4)}`,
      name: savedName,
      thickness: thickness.trim() || '-',
      length: lenVal,
      width: widVal,
      dimensionUnit,
      totalArea: totalAreaVal,
      specification: autoSpec,
      unit: unit.trim() || 'Lembar',
      currentStock: Number(currentStock) || 0,
      unitPrice: Number(unitPrice) || 0,
      notes: notes.trim(),
      createdAt: editingItem ? editingItem.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveRawMaterial(item);

    if (isNew) {
      setFormSuccessMessage(`Bahan baku "${savedName}" berhasil disimpan! Total penampang: ${totalAreaVal.toLocaleString('id-ID')} ${dimensionUnit}². Formulir siap untuk bahan berikutnya.`);
      const nextNum = rawMaterials.length + 2;
      setCode(`BB-00${nextNum}`);
      setName('');
      setNotes('');
    } else {
      setFormSuccessMessage(`Perubahan data bahan baku "${savedName}" berhasil disimpan!`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-white p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-800">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Master Data Bahan Baku</h2>
            <p className="text-xs text-slate-500">
              Spesifikasi nama bahan, tebal bahan, panjang, lebar, dan total penampang bahan baku
            </p>
          </div>
        </div>
        <button
          id="btn-add-raw-material"
          onClick={handleOpenNew}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-800 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-900 transition shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Bahan Baku</span>
        </button>
      </div>

      {isEditing && (
        <div className="rounded-2xl border-2 border-amber-600 bg-white p-6 shadow-md animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {editingItem ? 'Edit Bahan Baku' : 'Tambah Bahan Baku Baru'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Pastikan nama bahan, tebal, panjang, dan lebar terisi untuk kalkulasi total penampang
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

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kode Bahan</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 font-mono outline-hidden focus:border-amber-600"
                  required
                />
              </div>

              {/* 1. Nama bahan */}
              <div className="sm:col-span-3">
                <label className="block font-semibold text-slate-700 mb-1">
                  1. Nama Bahan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Plat Kuningan Tebal 0,65 mm Ukuran 60 cm x 120 cm"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-hidden focus:border-amber-600 font-medium"
                  required
                />
              </div>

              {/* 2. Tebal bahan */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  2. Tebal Bahan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={thickness}
                  onChange={(e) => setThickness(e.target.value)}
                  placeholder="Contoh: 0,65 mm, 0,8 mm, 3 mm"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-hidden focus:border-amber-600 font-mono"
                  required
                />
              </div>

              {/* 3. Panjang bahan */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  3. Panjang Bahan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={length}
                  onChange={(e) => setLength(parseFloat(e.target.value) || 0)}
                  placeholder="120"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-hidden focus:border-amber-600 font-mono"
                  required
                />
              </div>

              {/* 4. Lebar bahan */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  4. Lebar Bahan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={width}
                  onChange={(e) => setWidth(parseFloat(e.target.value) || 0)}
                  placeholder="60"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-hidden focus:border-amber-600 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Satuan Dimensi</label>
                <select
                  value={dimensionUnit}
                  onChange={(e) => setDimensionUnit(e.target.value as 'cm' | 'mm' | 'm')}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-hidden focus:border-amber-600 bg-white"
                >
                  <option value="cm">cm (Centimeter)</option>
                  <option value="mm">mm (Milimeter)</option>
                  <option value="m">m (Meter)</option>
                </select>
              </div>

              {/* 5. Total penampang bahan (perkalian panjang x lebar) */}
              <div className="sm:col-span-4 rounded-xl bg-amber-50/80 border border-amber-200 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-200 text-amber-900 shrink-0">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block font-bold text-amber-950 text-xs">
                      5. Total Penampang Bahan (Panjang × Lebar)
                    </span>
                    <span className="text-[11px] text-amber-800">
                      Otomatis dihitung: {length} {dimensionUnit} × {width} {dimensionUnit}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-extrabold font-mono text-amber-950">
                    {calculatedTotalArea.toLocaleString('id-ID')} <span className="text-xs font-normal text-amber-800">{dimensionUnit}²</span>
                  </div>
                  <div className="text-[10px] text-amber-700">Penampang Luas Permukaan per 1 Lembar / Unit</div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Satuan Pembelian / Stok</label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="Lembar, Meter, Cones, Rol"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-hidden focus:border-amber-600 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Stok di Gudang</label>
                <input
                  type="number"
                  value={currentStock}
                  onChange={(e) => setCurrentStock(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-hidden focus:border-amber-600 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Harga Satuan Bahan (Rp)</label>
                <input
                  type="number"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-hidden focus:border-amber-600 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan Tambahan</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Supplier / kode batch"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-hidden focus:border-amber-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 flex-wrap">
              <div className="text-[11px] text-slate-500 font-medium">
                {!editingItem && '💡 Setelah simpan, formulir siap untuk memasukkan data bahan baku berikutnya.'}
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
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-700 px-5 py-2 text-xs font-semibold text-white hover:bg-amber-800 transition shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingItem ? 'Simpan Perubahan' : '💾 Simpan & Input Bahan Lain'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Raw Material Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                <th className="py-3 px-4 font-bold">Kode</th>
                <th className="py-3 px-4 font-bold">1. Nama Bahan</th>
                <th className="py-3 px-4 font-bold text-center">2. Tebal</th>
                <th className="py-3 px-4 font-bold text-center">3. Panjang × 4. Lebar</th>
                <th className="py-3 px-4 font-bold text-right">5. Total Penampang</th>
                <th className="py-3 px-4 font-bold">Satuan</th>
                <th className="py-3 px-4 font-bold text-right">Stok Gudang</th>
                <th className="py-3 px-4 font-bold text-right">Harga Satuan</th>
                <th className="py-3 px-4 font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rawMaterials.map((m) => {
                const len = m.length ?? 0;
                const wid = m.width ?? 0;
                const area = m.totalArea !== undefined ? m.totalArea : (len * wid);
                const dUnit = m.dimensionUnit || 'cm';

                return (
                  <tr key={m.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-mono font-bold text-slate-600">{m.code}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{m.name}</div>
                      {m.notes && <div className="text-[11px] text-slate-500">{m.notes}</div>}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-semibold text-slate-800">
                      <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-amber-900">
                        {m.thickness || '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-700">
                      {len && wid ? `${len} × ${wid} ${dUnit}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-amber-900">
                      {area > 0 ? `${area.toLocaleString('id-ID')} ${dUnit}²` : '-'}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-800">
                        {m.unit}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                      {m.currentStock.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      {m.unitPrice ? `Rp ${m.unitPrice.toLocaleString('id-ID')}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(m)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                          title="Edit bahan"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Hapus bahan baku ${m.name}?`)) onDeleteRawMaterial(m.id);
                          }}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                          title="Hapus bahan"
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
