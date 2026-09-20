'use client';

import React, { useState, useEffect } from 'react';
import { Layers, Plus, CheckCircle2, AlertCircle, RefreshCw, FolderTree, Tag, ChevronRight, Edit3, X, Save } from 'lucide-react';
import { adminCatalogApi, AdminCategory, AdminAttribute } from '../../services/api/adminCatalogApi';

export const CategoryAttributeManager: React.FC = () => {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [categoryTree, setCategoryTree] = useState<any[]>([]);
  const [attributes, setAttributes] = useState<AdminAttribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New Category State
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatParentId, setNewCatParentId] = useState<string>('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // New Attribute State
  const [newAttrCode, setNewAttrCode] = useState('');
  const [newAttrLabel, setNewAttrLabel] = useState('');
  const [newAttrUnit, setNewAttrUnit] = useState('');
  const [newAttrIsAxis, setNewAttrIsAxis] = useState(true);
  const [newAttrInitialValues, setNewAttrInitialValues] = useState('');
  const [isCreatingAttribute, setIsCreatingAttribute] = useState(false);

  // Add value to existing attribute
  const [selectedAttrId, setSelectedAttrId] = useState<string | null>(null);
  const [newValNorm, setNewValNorm] = useState('');
  const [newValLabel, setNewValLabel] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cats, tree, attrs] = await Promise.all([
        adminCatalogApi.listCategories(),
        adminCatalogApi.getCategoryTree(),
        adminCatalogApi.listAttributes(),
      ]);
      setCategories(cats);
      setCategoryTree(tree);
      setAttributes(attrs);
    } catch (err: any) {
      setError(err?.message || 'Failed to load categories and attributes from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim() || !newCatSlug.trim()) {
      setError('Category name and slug are required.');
      return;
    }
    setError(null);
    try {
      await adminCatalogApi.createCategory({
        name: newCatName.trim(),
        slug: newCatSlug.trim().toLowerCase(),
        parent_id: newCatParentId ? newCatParentId : null,
      });
      setSuccessMsg(`Category '${newCatName}' created successfully.`);
      setNewCatName('');
      setNewCatSlug('');
      setNewCatParentId('');
      setIsCreatingCategory(false);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to create category.');
    }
  };

  const handleCreateAttribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttrCode.trim() || !newAttrLabel.trim()) {
      setError('Attribute code and label are required.');
      return;
    }
    setError(null);
    try {
      const initialVals = newAttrInitialValues
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((val, idx) => ({
          normalized_value: val,
          label: val,
          sort_order: idx,
        }));

      await adminCatalogApi.createAttribute({
        code: newAttrCode.trim().toLowerCase(),
        label: newAttrLabel.trim(),
        unit: newAttrUnit.trim() || null,
        is_variant_axis: newAttrIsAxis,
        initial_values: initialVals,
      });
      setSuccessMsg(`Attribute '${newAttrLabel}' created successfully.`);
      setNewAttrCode('');
      setNewAttrLabel('');
      setNewAttrUnit('');
      setNewAttrInitialValues('');
      setIsCreatingAttribute(false);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to create attribute.');
    }
  };

  const handleAddAttributeValue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAttrId || !newValNorm.trim() || !newValLabel.trim()) return;
    setError(null);
    try {
      await adminCatalogApi.addAttributeValue(selectedAttrId, {
        normalized_value: newValNorm.trim(),
        label: newValLabel.trim(),
      });
      setSuccessMsg('Attribute value added successfully.');
      setNewValNorm('');
      setNewValLabel('');
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to add attribute value.');
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-blue-600" />
            Categories & Variant Attributes
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative DAG taxonomy and multidimensional variant axes (SS304 steel specifications).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
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

      {/* Grid: Categories (Left) & Attributes (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── CATEGORIES PANEL ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-blue-600" />
              Category Hierarchy (DAG Cycle-Protected)
            </h3>
            <button
              onClick={() => setIsCreatingCategory(!isCreatingCategory)}
              className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              {isCreatingCategory ? 'Cancel' : 'New Category'}
            </button>
          </div>

          {/* New Category Form */}
          {isCreatingCategory && (
            <form onSubmit={handleCreateCategory} className="p-4 rounded-xl bg-slate-50 border border-blue-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-900">Add New Category</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Category Name</label>
                  <input
                    type="text"
                    required
                    value={newCatName}
                    onChange={(e) => {
                      setNewCatName(e.target.value);
                      if (!newCatSlug) {
                        setNewCatSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                      }
                    }}
                    placeholder="e.g. Solar Clamps & Fasteners"
                    className="w-full mt-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">URL Slug</label>
                  <input
                    type="text"
                    required
                    value={newCatSlug}
                    onChange={(e) => setNewCatSlug(e.target.value)}
                    placeholder="solar-clamps"
                    className="w-full mt-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600">Parent Category (Optional)</label>
                <select
                  value={newCatParentId}
                  onChange={(e) => setNewCatParentId(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">None (Top-Level Root Category)</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.slug})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Save Category
                </button>
              </div>
            </form>
          )}

          {/* Categories List */}
          <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
            {categories.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No categories created yet. Click "New Category" to add root categories.
              </div>
            ) : (
              categories.map((cat) => (
                <div key={cat.id} className="p-3 hover:bg-slate-50/80 flex items-center justify-between transition-colors">
                  <div>
                    <div className="font-semibold text-xs text-slate-900">{cat.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">slug: {cat.slug}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {cat.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── ATTRIBUTES PANEL ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Tag className="w-4 h-4 text-indigo-600" />
              Variant Attributes & Axes
            </h3>
            <button
              onClick={() => setIsCreatingAttribute(!isCreatingAttribute)}
              className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              {isCreatingAttribute ? 'Cancel' : 'New Attribute'}
            </button>
          </div>

          {/* New Attribute Form */}
          {isCreatingAttribute && (
            <form onSubmit={handleCreateAttribute} className="p-4 rounded-xl bg-slate-50 border border-indigo-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-900">Add Variant Attribute Axis</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Attribute Code</label>
                  <input
                    type="text"
                    required
                    value={newAttrCode}
                    onChange={(e) => setNewAttrCode(e.target.value.toLowerCase().replace(/[^a-z0-9_]+/g, ''))}
                    placeholder="e.g. frame_thickness"
                    className="w-full mt-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Display Label</label>
                  <input
                    type="text"
                    required
                    value={newAttrLabel}
                    onChange={(e) => setNewAttrLabel(e.target.value)}
                    placeholder="e.g. Frame Thickness"
                    className="w-full mt-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Unit (Optional)</label>
                  <input
                    type="text"
                    value={newAttrUnit}
                    onChange={(e) => setNewAttrUnit(e.target.value)}
                    placeholder="e.g. mm"
                    className="w-full mt-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={newAttrIsAxis}
                      onChange={(e) => setNewAttrIsAxis(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    Is Variant Axis (Cartesian product)
                  </label>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600">Initial Values (Comma separated)</label>
                <input
                  type="text"
                  value={newAttrInitialValues}
                  onChange={(e) => setNewAttrInitialValues(e.target.value)}
                  placeholder="28mm, 30mm, 33mm, 35mm, 40mm"
                  className="w-full mt-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  Save Attribute
                </button>
              </div>
            </form>
          )}

          {/* Attributes List with Values */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {attributes.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 border border-slate-100 rounded-xl">
                No variant attributes found. Create one like Frame Thickness or Material.
              </div>
            ) : (
              attributes.map((attr) => (
                <div key={attr.id} className="p-3.5 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-slate-900">{attr.label}</span>
                      <span className="ml-2 font-mono text-[10px] text-slate-400">({attr.code})</span>
                      {attr.unit && <span className="ml-1 text-[10px] text-slate-500 font-semibold">[{attr.unit}]</span>}
                    </div>
                    {attr.is_variant_axis && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        VARIANT AXIS
                      </span>
                    )}
                  </div>

                  {/* Values badges */}
                  <div className="flex flex-wrap gap-1.5 items-center pt-1">
                    {attr.values.map((v) => (
                      <span
                        key={v.id}
                        className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-800 text-[11px] font-medium shadow-2xs"
                      >
                        {v.label}
                      </span>
                    ))}
                    {selectedAttrId === attr.id ? (
                      <form onSubmit={handleAddAttributeValue} className="inline-flex items-center gap-1">
                        <input
                          type="text"
                          required
                          value={newValNorm}
                          onChange={(e) => {
                            setNewValNorm(e.target.value);
                            setNewValLabel(e.target.value);
                          }}
                          placeholder="Value"
                          className="w-16 px-1.5 py-0.5 text-xs bg-white border border-indigo-300 rounded outline-none"
                        />
                        <button type="submit" className="p-1 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                          <Save className="w-3 h-3" />
                        </button>
                        <button type="button" onClick={() => setSelectedAttrId(null)} className="p-1 text-slate-400">
                          <X className="w-3 h-3" />
                        </button>
                      </form>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedAttrId(attr.id);
                          setNewValNorm('');
                          setNewValLabel('');
                        }}
                        className="px-2 py-0.5 rounded-lg border border-dashed border-slate-300 text-slate-500 hover:text-indigo-600 hover:border-indigo-400 text-[11px] flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-3 h-3" /> Add Value
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
