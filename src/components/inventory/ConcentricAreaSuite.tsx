'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Calculator,
  Info,
  Pencil,
  Check,
  X,
  RotateCcw,
  Save,
  BookOpen,
  Layers,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Scale,
} from 'lucide-react';
import {
  calculateUnitAreaMatrix,
  CORE_AREA_DEFINITIONS,
  UnitAreaMatrix,
  ConcentricAreaOverrides,
} from '@/lib/domain/unit-differentiation';

interface ConcentricAreaSuiteProps {
  unit: any;
  onSave?: (updatedMatrix: UnitAreaMatrix) => Promise<void> | void;
  isEditable?: boolean;
  className?: string;
}

export function ConcentricAreaSuite({
  unit,
  onSave,
  isEditable = true,
  className = '',
}: ConcentricAreaSuiteProps) {
  // Base values from unit
  const unitCarpet = Number(unit?.carpetAreaSqft) || 650;
  const unitSaleable = Number(unit?.saleableAreaSqft) || undefined;
  const unitLoading = unit?.loadingPercentage !== undefined && unit?.loadingPercentage !== null
    ? Number(unit.loadingPercentage)
    : (unitSaleable && unitCarpet ? Math.round(((unitSaleable - unitCarpet) / unitCarpet) * 100) : 40);

  // Parse initial overrides
  const initialOverrides: ConcentricAreaOverrides = useMemo(() => {
    return {
      traditionalCarpetSqft: unit?.traditionalCarpetSqft !== undefined ? Number(unit.traditionalCarpetSqft) : undefined,
      reraCarpetAreaSqft: unit?.reraCarpetAreaSqft !== undefined ? Number(unit.reraCarpetAreaSqft) : undefined,
      builtUpSqft: unit?.builtUpSqft !== undefined ? Number(unit.builtUpSqft) : undefined,
      balconyTerraceSqft: unit?.balconyTerraceSqft !== undefined ? Number(unit.balconyTerraceSqft) : undefined,
      internalWallsSqft: unit?.internalWallsSqft !== undefined ? Number(unit.internalWallsSqft) : undefined,
      externalWallsSqft: unit?.externalWallsSqft !== undefined ? Number(unit.externalWallsSqft) : undefined,
      proportionateCommonSqft: unit?.proportionateCommonSqft !== undefined ? Number(unit.proportionateCommonSqft) : undefined,
    };
  }, [
    unit?.traditionalCarpetSqft,
    unit?.reraCarpetAreaSqft,
    unit?.builtUpSqft,
    unit?.balconyTerraceSqft,
    unit?.internalWallsSqft,
    unit?.externalWallsSqft,
    unit?.proportionateCommonSqft,
  ]);

  // Current computed matrix
  const currentMatrix = useMemo(() => {
    return calculateUnitAreaMatrix(unitCarpet, unitLoading, unitSaleable, initialOverrides);
  }, [unitCarpet, unitLoading, unitSaleable, initialOverrides]);

  // UI state toggles
  const [isEditing, setIsEditing] = useState(false);
  const [showDefinitionsGuide, setShowDefinitionsGuide] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 4 Core Area Form State
  const [editCarpet, setEditCarpet] = useState<number>(currentMatrix.carpetAreaSqft);
  const [editReraCarpet, setEditReraCarpet] = useState<string>(
    currentMatrix.reraCarpetAreaSqft ? String(currentMatrix.reraCarpetAreaSqft) : ''
  );
  const [editBuiltUp, setEditBuiltUp] = useState<number>(currentMatrix.builtUpSqft);
  const [editSuperBuiltUp, setEditSuperBuiltUp] = useState<number>(currentMatrix.superBuiltUpSqft);

  // Sync edit state whenever currentMatrix changes
  useEffect(() => {
    setEditCarpet(currentMatrix.carpetAreaSqft);
    setEditReraCarpet(currentMatrix.reraCarpetAreaSqft ? String(currentMatrix.reraCarpetAreaSqft) : '');
    setEditBuiltUp(currentMatrix.builtUpSqft);
    setEditSuperBuiltUp(currentMatrix.superBuiltUpSqft);
  }, [currentMatrix]);

  // --- DIRECT EDIT HANDLERS (No Loading Factor Required) ---

  const handleCarpetChange = (newCarpet: number) => {
    const carpet = Math.max(0, newCarpet);
    setEditCarpet(carpet);

    // If user hasn't explicitly set builtUp, adjust proportionally
    if (!editBuiltUp || editBuiltUp === Math.round(currentMatrix.carpetAreaSqft * 1.15)) {
      setEditBuiltUp(Math.round(carpet * 1.15));
    }
    // If user hasn't explicitly customized superBuiltUp, scale it
    if (!editSuperBuiltUp || editSuperBuiltUp === currentMatrix.superBuiltUpSqft) {
      setEditSuperBuiltUp(Math.round(carpet * 1.40));
    }
  };

  const handleResetToDefaults = () => {
    const defaultMatrix = calculateUnitAreaMatrix(unitCarpet, 40);
    setEditCarpet(defaultMatrix.carpetAreaSqft);
    setEditReraCarpet('');
    setEditBuiltUp(defaultMatrix.builtUpSqft);
    setEditSuperBuiltUp(defaultMatrix.superBuiltUpSqft);
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMessage(null);
    try {
      const parsedRera = editReraCarpet.trim() ? Number(editReraCarpet) : undefined;
      const effectiveLoading = editCarpet > 0 && editSuperBuiltUp > editCarpet
        ? Math.round(((editSuperBuiltUp - editCarpet) / editCarpet) * 100)
        : 40;

      const updatedMatrix: UnitAreaMatrix = {
        traditionalCarpetSqft: editCarpet,
        reraCarpetAreaSqft: parsedRera,
        internalWallsSqft: parsedRera && parsedRera > editCarpet ? parsedRera - editCarpet : Math.round(editCarpet * 0.035),
        carpetAreaSqft: editCarpet,
        balconyTerraceSqft: Math.max(0, editBuiltUp - editCarpet - Math.round(editCarpet * 0.065)),
        externalWallsSqft: Math.round(editCarpet * 0.065),
        builtUpSqft: editBuiltUp,
        proportionateCommonSqft: Math.max(0, editSuperBuiltUp - editBuiltUp),
        superBuiltUpSqft: editSuperBuiltUp,
        loadingPercentage: effectiveLoading,
      };

      if (onSave) {
        await onSave(updatedMatrix);
      } else if (unit?.id) {
        const res = await fetch(`/api/v1/inventory/units/${unit.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            carpetAreaSqft: editCarpet,
            reraCarpetAreaSqft: parsedRera || null,
            saleableAreaSqft: editSuperBuiltUp,
            loadingPercentage: effectiveLoading,
            traditionalCarpetSqft: editCarpet,
            builtUpSqft: editBuiltUp,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save area measurements');
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setIsEditing(false);
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error updating area measurements');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`rounded-xl border border-border bg-surface-raised overflow-hidden shadow-xs transition-all ${className}`}>
      {/* Top Header Bar */}
      <div className="p-4 border-b border-border/70 flex flex-wrap items-center justify-between gap-3 bg-surface/60 backdrop-blur-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-content uppercase tracking-wider">
                Property Area Measurements
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface border border-border text-content-muted">
                RERA Carpet: Optional
              </span>
            </div>
            <p className="text-[11px] text-content-muted mt-0.5">
              Carpet Area • RERA Carpet (Optional) • Built-Up Area • Super Built-Up Area
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDefinitionsGuide(!showDefinitionsGuide)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
              showDefinitionsGuide
                ? 'bg-accent/15 border-accent text-accent'
                : 'bg-surface border-border text-content-muted hover:text-content hover:bg-surface-raised'
            }`}
            title="Open real estate area definitions and formulas guide"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Definitions</span>
            {showDefinitionsGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {isEditable && (
            <button
              type="button"
              onClick={() => {
                if (isEditing) {
                  setIsEditing(false);
                } else {
                  setIsEditing(true);
                  setShowDefinitionsGuide(false);
                }
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition-colors ${
                isEditing
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-500'
                  : 'bg-accent text-accent-contrast border-transparent hover:opacity-90 shadow-xs'
              }`}
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Exit Editor' : 'Edit Areas'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ERROR ALERT IF SAVE FAILED */}
      {errorMessage && (
        <div className="mx-4 mt-4 p-3 rounded-lg bg-status-danger/10 border border-status-danger/30 text-status-danger text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* EXPANDABLE DEFINITIONS GUIDE */}
      {showDefinitionsGuide && (
        <div className="p-4 border-b border-border/80 bg-surface/90 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-xs font-bold text-content flex items-center gap-2">
                <Scale className="w-4 h-4 text-accent" />
                <span>Real Estate Area Definitions &amp; Components</span>
              </h4>
              <p className="text-[11px] text-content-muted mt-0.5">
                Standard component inclusions and exclusions for each measurement layer.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDefinitionsGuide(false)}
              className="p-1 text-content-muted hover:text-content"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Definitions Comparison Table */}
          <div className="overflow-x-auto rounded-lg border border-border bg-surface-inset shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface text-[11px] font-bold text-content uppercase tracking-wider">
                  <th className="p-2.5">Area Type</th>
                  <th className="p-2.5">Definition</th>
                  <th className="p-2.5">Included Components</th>
                  <th className="p-2.5">Excluded Components</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {CORE_AREA_DEFINITIONS.map((def) => (
                  <tr key={def.id} className="hover:bg-surface/50 transition-colors">
                    <td className="p-2.5 align-top">
                      <div className="font-bold text-content whitespace-nowrap">{def.name}</div>
                      <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-surface border border-border text-content-muted">
                        {def.badge}
                      </span>
                    </td>
                    <td className="p-2.5 align-top text-content-muted leading-relaxed max-w-xs">
                      {def.definition}
                    </td>
                    <td className="p-2.5 align-top text-content">
                      <ul className="space-y-1">
                        {def.included.map((item, idx) => (
                          <li key={idx} className="flex items-center gap-1.5 text-[11px]">
                            <Check className="w-3 h-3 text-status-success shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="p-2.5 align-top text-content-muted">
                      <ul className="space-y-1">
                        {def.excluded.map((item, idx) => (
                          <li key={idx} className="flex items-center gap-1.5 text-[11px]">
                            <X className="w-3 h-3 text-status-danger/70 shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- EDIT MODE: DIRECT 4 AREA INPUTS (NO LOADING FACTOR) --- */}
      {isEditing ? (
        <div className="p-5 space-y-4 bg-surface/40">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <span className="text-xs font-bold text-content uppercase tracking-wider">
              Edit Area Dimensions
            </span>

            <button
              type="button"
              onClick={handleResetToDefaults}
              className="text-[11px] text-content-muted hover:text-content flex items-center gap-1 px-2 py-1 rounded hover:bg-surface border border-transparent hover:border-border transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Defaults</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Carpet Area */}
            <div className="p-3.5 rounded-lg bg-surface-inset border border-border">
              <label className="text-[10px] font-bold text-content uppercase tracking-wider block mb-1">
                1. Carpet Area *
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={50}
                  required
                  value={editCarpet || ''}
                  onChange={(e) => handleCarpetChange(Number(e.target.value))}
                  className="w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-base font-mono font-bold text-content focus:outline-hidden focus:border-accent"
                  placeholder="e.g. 650"
                />
                <span className="absolute right-2.5 top-2 text-xs text-content-muted font-mono">sq.ft.</span>
              </div>
              <p className="text-[10px] text-content-muted mt-1.5">
                Net usable floor area inside apartment walls
              </p>
            </div>

            {/* 2. RERA Carpet Area (Optional / Not Compulsory) */}
            <div className="p-3.5 rounded-lg bg-surface border border-border">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold text-content uppercase tracking-wider">
                  2. RERA Carpet
                </label>
                <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-surface-inset border border-border text-content-muted">
                  Not Compulsory
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  value={editReraCarpet}
                  onChange={(e) => setEditReraCarpet(e.target.value)}
                  className="w-full bg-surface-subtle border border-border rounded-lg px-2.5 py-1.5 text-base font-mono font-bold text-content focus:outline-hidden focus:border-accent"
                  placeholder="Optional (e.g. 685)"
                />
                <span className="absolute right-2.5 top-2 text-xs text-content-muted font-mono">sq.ft.</span>
              </div>
              <p className="text-[10px] text-content-muted mt-1.5">
                Optional Section 2(k) measurement (leave blank if not needed)
              </p>
            </div>

            {/* 3. Built-Up Area */}
            <div className="p-3.5 rounded-lg bg-surface-inset border border-border">
              <label className="text-[10px] font-bold text-content uppercase tracking-wider block mb-1">
                3. Built-Up Area
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  value={editBuiltUp || ''}
                  onChange={(e) => setEditBuiltUp(Number(e.target.value))}
                  className="w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-base font-mono font-bold text-content focus:outline-hidden focus:border-accent"
                  placeholder="e.g. 748"
                />
                <span className="absolute right-2.5 top-2 text-xs text-content-muted font-mono">sq.ft.</span>
              </div>
              <p className="text-[10px] text-content-muted mt-1.5">
                Carpet + outer walls + private balconies
              </p>
            </div>

            {/* 4. Super Built-Up Area */}
            <div className="p-3.5 rounded-lg bg-accent/5 border border-accent/30 shadow-xs">
              <label className="text-[10px] font-bold text-accent uppercase tracking-wider block mb-1">
                4. Super Built-Up Area (Saleable)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  value={editSuperBuiltUp || ''}
                  onChange={(e) => setEditSuperBuiltUp(Number(e.target.value))}
                  className="w-full bg-surface border border-accent/40 rounded-lg px-2.5 py-1.5 text-base font-mono font-bold text-accent-text focus:outline-hidden focus:border-accent"
                  placeholder="e.g. 910"
                />
                <span className="absolute right-2.5 top-2 text-xs text-accent-text font-mono font-bold">sq.ft.</span>
              </div>
              <p className="text-[10px] text-content-muted mt-1.5">
                Total salable space with common facilities
              </p>
            </div>
          </div>

          {/* Footer Save & Cancel Controls */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/70">
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setEditCarpet(currentMatrix.carpetAreaSqft);
                setEditReraCarpet(currentMatrix.reraCarpetAreaSqft ? String(currentMatrix.reraCarpetAreaSqft) : '');
                setEditBuiltUp(currentMatrix.builtUpSqft);
                setEditSuperBuiltUp(currentMatrix.superBuiltUpSqft);
                setIsEditing(false);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-surface text-content hover:bg-surface-raised transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-accent text-accent-contrast hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Areas...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-status-success" />
                  <span>Areas Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Area Measurements</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* --- VIEW BREAKDOWN MODE --- */
        <div className="p-4 space-y-4">
          {/* 4 Area Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Carpet Area */}
            <div className="p-3.5 rounded-lg bg-surface-inset border border-border relative flex flex-col justify-between hover:border-accent/40 transition-colors">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-content-muted uppercase font-bold tracking-wider">
                    Carpet Area
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-surface border border-border text-content font-medium">
                    Net Usable
                  </span>
                </div>
                <div className="text-2xl font-bold text-content font-mono mt-1">
                  {currentMatrix.carpetAreaSqft}{' '}
                  <span className="text-xs font-normal text-content-muted">sq.ft.</span>
                </div>
                <div className="text-[10px] text-content-muted font-mono mt-0.5">
                  ≈ {Math.round(currentMatrix.carpetAreaSqft * 0.0929)} sq.m.
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-border/60 text-[10px] text-content-muted">
                Bedrooms, living room, kitchen, bathrooms
              </div>
            </div>

            {/* Card 2: RERA Carpet Area (Optional) */}
            <div className="p-3.5 rounded-lg bg-surface border border-border relative flex flex-col justify-between hover:border-accent/40 transition-colors">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-content-muted uppercase font-bold tracking-wider">
                    RERA Carpet Area
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-surface-inset border border-border text-content-muted">
                    Optional
                  </span>
                </div>
                <div className="text-2xl font-bold text-content font-mono mt-1">
                  {currentMatrix.reraCarpetAreaSqft ? (
                    <>
                      {currentMatrix.reraCarpetAreaSqft}{' '}
                      <span className="text-xs font-normal text-content-muted">sq.ft.</span>
                    </>
                  ) : (
                    <span className="text-sm font-normal text-content-muted italic">Not specified</span>
                  )}
                </div>
                <div className="text-[10px] text-content-muted font-mono mt-0.5">
                  {currentMatrix.reraCarpetAreaSqft
                    ? `≈ ${Math.round(currentMatrix.reraCarpetAreaSqft * 0.0929)} sq.m.`
                    : 'Non-compulsory field'}
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-border/60 text-[10px] text-content-muted">
                Usable floor area + internal partition walls
              </div>
            </div>

            {/* Card 3: Built-Up Area */}
            <div className="p-3.5 rounded-lg bg-surface-inset border border-border relative flex flex-col justify-between hover:border-accent/40 transition-colors">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-content-muted uppercase font-bold tracking-wider">
                    Built-Up Area
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-surface border border-border text-content-muted font-mono">
                    Envelope
                  </span>
                </div>
                <div className="text-2xl font-bold text-content font-mono mt-1">
                  {currentMatrix.builtUpSqft}{' '}
                  <span className="text-xs font-normal text-content-muted">sq.ft.</span>
                </div>
                <div className="text-[10px] text-content-muted font-mono mt-0.5">
                  ≈ {Math.round(currentMatrix.builtUpSqft * 0.0929)} sq.m.
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-border/60 text-[10px] text-content-muted">
                Flat boundaries &amp; private balconies
              </div>
            </div>

            {/* Card 4: Super Built-Up Area */}
            <div className="p-3.5 rounded-lg bg-accent/5 border border-accent/30 relative flex flex-col justify-between hover:border-accent transition-colors shadow-xs">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-accent uppercase font-bold tracking-wider">
                    Super Built-Up Area
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-accent/15 text-accent font-bold">
                    Saleable
                  </span>
                </div>
                <div className="text-2xl font-bold text-accent-text font-mono mt-1">
                  {currentMatrix.superBuiltUpSqft}{' '}
                  <span className="text-xs font-normal text-accent/80">sq.ft.</span>
                </div>
                <div className="text-[10px] text-content-muted font-mono mt-0.5">
                  ≈ {Math.round(currentMatrix.superBuiltUpSqft * 0.0929)} sq.m.
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-accent/20 text-[10px] text-content-muted">
                Total salable space with shared complex facilities
              </div>
            </div>
          </div>

          {/* Quick Informational Note */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-content-muted">
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-accent shrink-0" />
              <span>
                All area measurements are fully editable. RERA Carpet Area is optional.
              </span>
            </span>

            {isEditable && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="text-accent hover:underline font-semibold flex items-center gap-1"
              >
                <span>Edit area values</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
