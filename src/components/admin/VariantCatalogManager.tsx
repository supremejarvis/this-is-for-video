'use client';

import React, { useState, useEffect } from 'react';
import { 
  Package, Search, Download, Upload, Plus, Edit3, Save, X, RefreshCw, 
  CheckCircle2, AlertCircle, AlertTriangle, Layers, Sliders, Check, Sparkles 
} from 'lucide-react';
import { adminCatalogApi, AdminVariantListItem, ImportReport } from '../../services/api/adminCatalogApi';

interface VariantCatalogManagerProps {
  onOpenComboBuilder?: () => void;
}

export const VariantCatalogManager: React.FC<VariantCatalogManagerProps> = ({ onOpenComboBuilder }) => {
  const [variants, setVariants] = useState<AdminVariantListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Inline editing state
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editPackSize, setEditPackSize] = useState<number>(1);
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [isSavingInline, setIsSavingInline] = useState(false);

  // Bulk Import Modal State
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importCsvText, setImportCsvText] = useState('');
  const [importDryRun, setImportDryRun] = useState(true);
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  const loadVariants = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminCatalogApi.listVariants({ search: searchQuery, limit: 150 });
      setVariants(res.items);
    } catch (err: any) {
      setError(err?.message || 'Failed to load variants.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVariants();
  }, [searchQuery]);

  const startEdit = (v: AdminVariantListItem) => {
    setEditingVariantId(v.id);
    setEditLabel(v.display_label);
    setEditPackSize(v.pack_size);
    setEditIsActive(v.is_active);
  };

  const cancelEdit = () => {
    setEditingVariantId(null);
  };

  const saveEdit = async (v: AdminVariantListItem) => {
    setIsSavingInline(true);
    setError(null);
    try {
      await adminCatalogApi.updateVariantInline(v.id, {
        display_label: editLabel,
        pack_size: editPackSize,
        is_active: editIsActive,
        version: v.version,
      });
      setSuccessMsg(`Variant ${v.sku} updated successfully.`);
      setEditingVariantId(null);
      await loadVariants();
    } catch (err: any) {
      setError(err?.message || 'Failed to update variant. It may have been modified concurrently.');
    } finally {
      setIsSavingInline(false);
    }
  };

  const handleExportCsv = () => {
    window.location.href = adminCatalogApi.getExportVariantsUrl();
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importCsvText.trim()) return;
    setImportLoading(true);
    try {
      const rep = await adminCatalogApi.importVariantsCsv(importCsvText, importDryRun);
      setImportReport(rep);
      if (!importDryRun && rep.applied_count > 0) {
        setSuccessMsg(`Successfully imported and updated ${rep.applied_count} variants.`);
        await loadVariants();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to parse/import CSV file.');
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            Variants Catalog & Combination Matrix
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Inline version-checked editing, Cartesian generator, and OWASP formula-safe CSV export/import.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onOpenComboBuilder && (
            <button
              onClick={onOpenComboBuilder}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Cartesian Generator
            </button>
          )}
          <button
            onClick={() => setIsImportOpen(true)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Bulk Import CSV
          </button>
          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export Safe CSV
          </button>
          <button
            onClick={loadVariants}
            disabled={loading}
            className="p-1.5 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search Filter */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter by SKU or variant label..."
          className="w-full text-xs text-slate-900 outline-none placeholder:text-slate-400"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-xs text-slate-400 hover:text-slate-600">
            Clear
          </button>
        )}
      </div>

      {/* Variants Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
              <tr>
                <th className="p-3">SKU</th>
                <th className="p-3">Product Name</th>
                <th className="p-3">Display Label</th>
                <th className="p-3">Thickness</th>
                <th className="p-3">Pack Size</th>
                <th className="p-3">B2C Price</th>
                <th className="p-3">On-Hand</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {variants.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    No variants found matching criteria.
                  </td>
                </tr>
              ) : (
                variants.map((v) => {
                  const isEditing = editingVariantId === v.id;
                  return (
                    <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-900">{v.sku}</td>
                      <td className="p-3 text-slate-600 max-w-[200px] truncate">{v.product_name}</td>
                      <td className="p-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            className="px-2 py-1 bg-white border border-blue-400 rounded text-xs outline-none w-full"
                          />
                        ) : (
                          <span className="text-slate-800 font-medium">{v.display_label}</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-600">{v.frame_thickness}</td>
                      <td className="p-3">
                        {isEditing ? (
                          <input
                            type="number"
                            min="1"
                            value={editPackSize}
                            onChange={(e) => setEditPackSize(parseInt(e.target.value, 10) || 1)}
                            className="w-16 px-2 py-1 bg-white border border-blue-400 rounded text-xs outline-none font-mono"
                          />
                        ) : (
                          <span className="font-mono text-slate-700">{v.pack_size}</span>
                        )}
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-700">₹{v.unit_price}</td>
                      <td className="p-3 font-mono">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          v.stock_on_hand > 20
                            ? 'bg-emerald-50 text-emerald-700'
                            : v.stock_on_hand > 0
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-red-50 text-red-700'
                        }`}>
                          {v.stock_on_hand}
                        </span>
                      </td>
                      <td className="p-3">
                        {isEditing ? (
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editIsActive}
                              onChange={(e) => setEditIsActive(e.target.checked)}
                              className="rounded text-blue-600"
                            />
                            <span className="text-[10px] font-semibold">{editIsActive ? 'Active' : 'Inactive'}</span>
                          </label>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            v.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {v.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {isEditing ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => saveEdit(v)}
                              disabled={isSavingInline}
                              className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                              title="Save Changes"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(v)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-blue-600 rounded-lg transition-colors"
                            title="Inline Edit Variant"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk CSV Import Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-600" />
                Bulk Variant CSV Import (Formula Injection Protected)
              </h3>
              <button onClick={() => setIsImportOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">
                  Paste CSV Content (Headers: SKU, Pack Size, Display Label)
                </label>
                <textarea
                  rows={6}
                  required
                  value={importCsvText}
                  onChange={(e) => setImportCsvText(e.target.value)}
                  placeholder={`SKU,Pack Size,Display Label\nAPE-SC-28MM-P1,50,28mm Pack of 50\nAPE-SC-30MM-P1,100,30mm Pack of 100`}
                  className="w-full mt-1 p-3 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={importDryRun}
                    onChange={(e) => setImportDryRun(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  Dry Run Validation Only (Do not apply changes yet)
                </label>
                <button
                  type="submit"
                  disabled={importLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
                >
                  {importLoading ? 'Processing...' : importDryRun ? 'Run Dry Run' : 'Apply Import'}
                </button>
              </div>
            </form>

            {/* Import Report */}
            {importReport && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between font-bold">
                  <span>Total Rows: {importReport.total_rows}</span>
                  <span className="text-emerald-700">Valid: {importReport.valid_rows}</span>
                  <span className="text-red-600">Errors: {importReport.error_count}</span>
                  {!importReport.dry_run && <span className="text-blue-700">Applied: {importReport.applied_count}</span>}
                </div>
                {importReport.errors.length > 0 && (
                  <div className="max-h-32 overflow-y-auto space-y-1 text-[11px] text-red-600 font-mono pt-2 border-t border-slate-200">
                    {importReport.errors.map((err, idx) => (
                      <div key={idx}>• {err}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
