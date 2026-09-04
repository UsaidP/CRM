'use client';

import React, { useState, useRef } from 'react';
import {
  Home,
  Layers,
  Calculator,
  ImageIcon,
  Pencil,
  Trash2,
  X,
  UploadCloud,
  CheckCircle2,
  Calendar,
  Compass,
  Building2,
  Maximize2,
  Loader2,
  Sparkles,
  ShieldCheck,
  Eye,
  ChevronRight,
  Info,
  Car,
  Flame,
  Star,
} from 'lucide-react';
import { AccessibleDialog } from '@/components/ui/AccessibleDialog';
import {
  calculateUnitAreaMatrix,
  differentiateUnitTitle,
  resolveUnitMediaAssets,
  formatINR,
  isDummyOrPlaceholderUrl,
} from '@/lib/domain/unit-differentiation';
import { resolveAssetUrl } from '@/lib/inventory-media';

interface UnitDetailsModalProps {
  unit: any;
  project?: any;
  allUnits?: any[];
  onClose: () => void;
  onEditUnit?: (unit: any) => void;
  onDeleteUnit?: (unit: any) => void;
  onSelectUnitForCalc?: (unit: any) => void;
  onUnitUpdated?: (updatedUnit: any) => void;
}

export function UnitDetailsModal({
  unit: initialUnit,
  project: initialProject,
  allUnits = [],
  onClose,
  onEditUnit,
  onDeleteUnit,
  onSelectUnitForCalc,
  onUnitUpdated,
}: UnitDetailsModalProps) {
  const [currentUnit, setCurrentUnit] = useState<any>(initialUnit);
  const [activeTab, setActiveTab] = useState<'overview' | 'floorplan' | 'photos' | 'cost'>('overview');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Uploading state
  const floorPlanInputRef = useRef<HTMLInputElement>(null);
  const photosInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deletingPhotoUrl, setDeletingPhotoUrl] = useState<string | null>(null);

  // Parent project resolution
  const currentProject = initialProject || currentUnit?.project || {};

  // Units in the same project for quick switching
  const siblingUnits = allUnits.filter(
    (u) => u.projectId === (currentUnit.projectId || currentProject.id)
  );

  // Resolved Unit-Specific Media
  const resolvedMedia = resolveUnitMediaAssets(currentUnit);
  const areaMatrix = calculateUnitAreaMatrix(currentUnit.carpetAreaSqft || 650);

  // Affordable housing detection (≤ 45 Lakhs agreement value)
  const isAffordable = currentUnit.agreementValue > 0 && currentUnit.agreementValue <= 4500000;
  const isOcReady = currentProject.hasOccupancyCertificate || currentUnit.possessionStatus === 'READY_TO_MOVE';

  const gstPercentage = isOcReady ? 0 : isAffordable ? 1 : (currentUnit.gstRate || 5);

  // Handle uploading specific floor plan for this unit
  const handleUploadFloorPlan = async (file: File) => {
    if (!file || !currentUnit?.id) return;
    setUploading(true);
    setUploadMessage('Uploading layout blueprint for this unit...');
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'floor-plans');
      formData.append('isFloorPlan', 'true');
      formData.append('unitId', currentUnit.id);
      if (currentProject.id) formData.append('projectId', currentProject.id);

      const res = await fetch('/api/v1/media/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.asset) {
        throw new Error(data.error || 'Failed to upload floor plan blueprint.');
      }

      const newFloorPlanUrl = resolveAssetUrl(data.asset);

      // Update unit via API to ensure persistence
      const putRes = await fetch(`/api/v1/inventory/units/${currentUnit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          floorPlanUrl: newFloorPlanUrl,
        }),
      });
      const putData = await putRes.json();

      const updated = {
        ...currentUnit,
        floorPlanUrl: newFloorPlanUrl,
        ...(putData.data || {}),
      };

      setCurrentUnit(updated);
      setUploadMessage('Unit layout blueprint uploaded and linked exclusively to this flat!');
      if (onUnitUpdated) onUnitUpdated(updated);
      setTimeout(() => setUploadMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error uploading floor plan.');
    } finally {
      setUploading(false);
    }
  };

  // Handle deleting unit layout blueprint
  const handleDeleteFloorPlan = async () => {
    if (!currentUnit?.id) return;
    setUploading(true);
    setErrorMessage(null);
    try {
      const putRes = await fetch(`/api/v1/inventory/units/${currentUnit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          floorPlanUrl: null,
          floorPlanImages: [],
        }),
      });
      const putData = await putRes.json();
      if (!putRes.ok || !putData.success) {
        throw new Error(putData.error || 'Failed to remove blueprint.');
      }
      const updated = {
        ...currentUnit,
        floorPlanUrl: null,
        floorPlanImagesJson: '[]',
        ...(putData.data || {}),
      };
      setCurrentUnit(updated);
      setUploadMessage('Blueprint removed from this unit.');
      if (onUnitUpdated) onUnitUpdated(updated);
      setTimeout(() => setUploadMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error removing floor plan.');
    } finally {
      setUploading(false);
    }
  };

  // Handle uploading unit interior photos
  const handleUploadPhotos = async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    if (!fileList.length || !currentUnit?.id) return;

    setUploading(true);
    setUploadMessage(`Uploading ${fileList.length} photo(s) for this flat...`);
    setErrorMessage(null);

    try {
      const uploadedUrls: string[] = [];

      for (const file of fileList) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', 'interior');
        formData.append('unitId', currentUnit.id);
        if (currentProject.id) formData.append('projectId', currentProject.id);

        const res = await fetch('/api/v1/media/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (res.ok && data.asset) {
          const url = resolveAssetUrl(data.asset);
          if (url) uploadedUrls.push(url);
        }
      }

      if (uploadedUrls.length === 0) {
        throw new Error('No photos could be uploaded.');
      }

      const mergedPhotos = Array.from(new Set([...resolvedMedia.photos, ...uploadedUrls]));

      // Update unit via PUT API
      const putRes = await fetch(`/api/v1/inventory/units/${currentUnit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoGallery: mergedPhotos,
        }),
      });
      const putData = await putRes.json();

      const updated = {
        ...currentUnit,
        photoGallery: mergedPhotos,
        photoGalleryJson: JSON.stringify(mergedPhotos),
        ...(putData.data || {}),
      };

      setCurrentUnit(updated);
      setUploadMessage(`Successfully uploaded ${uploadedUrls.length} photo(s) to this flat's gallery!`);
      if (onUnitUpdated) onUnitUpdated(updated);
      setTimeout(() => setUploadMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error uploading photos.');
    } finally {
      setUploading(false);
    }
  };

  // Handle deleting a unit photo
  const handleDeletePhoto = async (urlToDelete: string) => {
    if (!currentUnit?.id || !urlToDelete) return;
    setDeletingPhotoUrl(urlToDelete);
    setErrorMessage(null);

    try {
      const nextPhotos = resolvedMedia.photos.filter((url) => url !== urlToDelete);

      const putRes = await fetch(`/api/v1/inventory/units/${currentUnit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoGallery: nextPhotos,
        }),
      });

      const putData = await putRes.json();
      if (!putRes.ok || !putData.success) {
        throw new Error(putData.error || 'Failed to remove photo.');
      }

      const updated = {
        ...currentUnit,
        photoGallery: nextPhotos,
        photoGalleryJson: JSON.stringify(nextPhotos),
        ...(putData.data || {}),
      };

      setCurrentUnit(updated);
      if (onUnitUpdated) onUnitUpdated(updated);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to remove photo.');
    } finally {
      setDeletingPhotoUrl(null);
    }
  };

  // Switch to another sibling unit
  const handleSwitchUnit = (targetUnit: any) => {
    setCurrentUnit(targetUnit);
    setUploadMessage(null);
    setErrorMessage(null);
  };

  return (
    <AccessibleDialog
      open={true}
      onClose={onClose}
      titleId="unit-modal-title"
      size="2xl"
      panelClassName="!p-0 overflow-hidden max-w-5xl"
    >
      <div className="relative w-full flex flex-col text-content">
        {/* Hidden File Inputs */}
        <input
          ref={floorPlanInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,application/pdf"
          className="sr-only"
          onChange={(e) => e.target.files?.[0] && handleUploadFloorPlan(e.target.files[0])}
        />
        <input
          ref={photosInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="sr-only"
          onChange={(e) => e.target.files && handleUploadPhotos(e.target.files)}
        />

        {/* Header */}
        <div className="p-5 border-b border-border bg-surface-raised flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-accent-soft border border-accent/30 rounded-xl text-accent">
              <Home className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 id="unit-modal-title" className="text-xl font-bold text-content font-display">
                  {currentUnit.unitNumber ? `Flat ${currentUnit.unitNumber}` : `Unit Specification`}
                </h2>
                <span className="badge-cobalt">
                  {currentUnit.bhk} BHK • {currentUnit.carpetAreaSqft || 650} Sq.Ft. RERA
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-surface-subtle border border-border text-content-muted">
                  Floor {currentUnit.floorNumber || 1} of {currentUnit.totalFloors || 14}
                </span>
                {isOcReady ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-success-surface text-status-success border border-status-success/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Ready OC (0% GST)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-warning-surface text-status-warning border border-status-warning/30 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Under-Construction ({gstPercentage}% GST)
                  </span>
                )}
                {Boolean(currentUnit.isHotDeal) && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <Flame className="w-3 h-3" /> Hot Deal
                  </span>
                )}
                {Boolean(currentUnit.isExclusive) && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-accent/15 text-accent border border-accent/30 flex items-center gap-1">
                    <Star className="w-3 h-3" /> Exclusive Mandate
                  </span>
                )}
              </div>
              <p className="text-xs text-content-muted mt-1">
                Project: <strong className="text-content">{currentProject.projectName || 'Developer Project'}</strong>
                {currentProject.developerName && <span> by {currentProject.developerName}</span>}
                {currentProject.microMarket && <span> • {currentProject.microMarket}</span>}
                {currentUnit.facing && <span> • Facing: <strong className="text-content">{currentUnit.facing}</strong></span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <div className="text-right mr-2 hidden sm:block">
              <div className="text-[10px] text-content-muted uppercase font-semibold">All-In Cost</div>
              <div className="text-base font-bold text-accent font-mono">
                {formatINR(currentUnit.allInTotalCost || currentUnit.agreementValue)}
              </div>
            </div>

            {onSelectUnitForCalc && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSelectUnitForCalc(currentUnit);
                }}
                className="px-3 py-1.5 rounded-lg border border-border bg-surface text-content text-xs font-semibold hover:bg-surface-raised flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                title="Open Cost & EMI Calculator"
              >
                <Calculator className="w-3.5 h-3.5 text-accent" />
                <span className="hidden sm:inline">Calculator</span>
              </button>
            )}

            {onEditUnit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditUnit(currentUnit);
                }}
                className="px-3 py-1.5 rounded-lg border border-border bg-surface text-content text-xs font-semibold hover:bg-surface-raised flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                title={`Edit Flat ${currentUnit.unitNumber || ''}`}
              >
                <Pencil className="w-3.5 h-3.5 text-accent" />
                <span className="hidden sm:inline">Edit Unit</span>
              </button>
            )}

            {onDeleteUnit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDeleteUnit(currentUnit);
                }}
                className="px-3 py-1.5 rounded-lg border border-status-danger/30 bg-status-danger-surface text-status-danger text-xs font-semibold hover:bg-status-danger/10 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                title={`Delete Flat ${currentUnit.unitNumber || ''}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            )}

            <button
              type="button"
              data-dialog-close
              onClick={onClose}
              className="p-2 rounded-lg text-content-muted hover:text-content hover:bg-surface transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Unit Configuration Switcher Bar (Sibling Units in the same project) */}
        {siblingUnits.length > 1 && (
          <div className="px-6 py-2.5 border-b border-border bg-surface-subtle flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-content-muted font-medium whitespace-nowrap flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-accent" />
              Switch Flat:
            </span>
            <div className="flex items-center gap-1.5">
              {siblingUnits.map((u) => {
                const isSelected = u.id === currentUnit.id;
                const hasMedia = Boolean(u.floorPlanUrl || u.photoGalleryJson || u.photoGallery?.length);

                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSwitchUnit(u)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-accent text-accent-contrast font-bold shadow-xs'
                        : 'bg-surface border border-border text-content hover:border-accent/40'
                    }`}
                  >
                    <span>{u.unitNumber ? `Flat ${u.unitNumber}` : `${u.bhk} BHK`}</span>
                    <span className="opacity-80">({u.bhk}B • {u.carpetAreaSqft || 650}sft)</span>
                    {hasMedia && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 border-b border-border bg-surface-subtle overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'overview'
                ? 'border-accent text-accent font-semibold'
                : 'border-transparent text-content-muted hover:text-content'
            }`}
          >
            <Home className="w-4 h-4" /> Overview &amp; Specifications
          </button>
          <button
            onClick={() => setActiveTab('floorplan')}
            className={`py-3 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'floorplan'
                ? 'border-accent text-accent font-semibold'
                : 'border-transparent text-content-muted hover:text-content'
            }`}
          >
            <Layers className="w-4 h-4" /> Floor Plan Blueprint
            {resolvedMedia.floorPlanUrl && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('photos')}
            className={`py-3 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'photos'
                ? 'border-accent text-accent font-semibold'
                : 'border-transparent text-content-muted hover:text-content'
            }`}
          >
            <ImageIcon className="w-4 h-4" /> Unit Photos &amp; Interior ({resolvedMedia.photos.length})
          </button>
          <button
            onClick={() => setActiveTab('cost')}
            className={`py-3 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'cost'
                ? 'border-accent text-accent font-semibold'
                : 'border-transparent text-content-muted hover:text-content'
            }`}
          >
            <Calculator className="w-4 h-4" /> Cost &amp; Tax Breakdown
          </button>
        </div>

        {/* Notifications & Feedback */}
        {uploadMessage && (
          <div className="m-4 mb-0 p-3 rounded-xl bg-status-success-surface border border-status-success/30 text-status-success text-xs font-medium flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{uploadMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="m-4 mb-0 p-3 rounded-xl bg-status-danger-surface border border-status-danger/30 text-status-danger text-xs font-medium flex items-center gap-2 animate-in fade-in">
            <Info className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* TAB 1: Overview & Specifications */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Area Matrix Breakdown */}
              <div className="p-4 rounded-xl border border-border bg-surface-raised">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-content uppercase tracking-wider flex items-center gap-1.5">
                    <Calculator className="w-4 h-4 text-accent" /> Area Measurements &amp; Loading Matrix
                  </h3>
                  <span className="text-[11px] text-content-muted bg-surface px-2.5 py-1 rounded border border-border font-mono">
                    Carpet vs Built-Up vs Super Built-Up
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-lg bg-surface-inset border border-border">
                    <div className="text-[10px] text-content-muted uppercase font-bold tracking-wider">
                      Usable RERA Carpet
                    </div>
                    <div className="text-xl font-bold text-content font-mono mt-0.5">
                      {areaMatrix.carpetAreaSqft} <span className="text-xs font-normal text-content-muted">sq.ft.</span>
                    </div>
                    <div className="text-[10px] text-content-muted mt-1">
                      100% usable net internal area
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-surface-inset border border-border">
                    <div className="text-[10px] text-content-muted uppercase font-bold tracking-wider">
                      Estimated Built-Up
                    </div>
                    <div className="text-xl font-bold text-content font-mono mt-0.5">
                      {areaMatrix.builtUpSqft} <span className="text-xs font-normal text-content-muted">sq.ft.</span>
                    </div>
                    <div className="text-[10px] text-content-muted mt-1">
                      Includes walls &amp; balcony (+15%)
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-surface-inset border border-border">
                    <div className="text-[10px] text-content-muted uppercase font-bold tracking-wider">
                      Super Built-Up / Saleable
                    </div>
                    <div className="text-xl font-bold text-accent-text font-mono mt-0.5">
                      {areaMatrix.superBuiltUpSqft} <span className="text-xs font-normal text-content-muted">sq.ft.</span>
                    </div>
                    <div className="text-[10px] text-content-muted mt-1">
                      Common areas ({areaMatrix.loadingPercentage}% builder load)
                    </div>
                  </div>
                </div>
              </div>

              {/* Unit Specifications Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl border border-border bg-surface">
                  <div className="text-[10px] text-content-muted uppercase font-semibold">Flat / Unit Number</div>
                  <div className="text-sm font-bold text-content font-mono mt-0.5">
                    {currentUnit.unitNumber || 'Unassigned'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-surface">
                  <div className="text-[10px] text-content-muted uppercase font-semibold">BHK Configuration</div>
                  <div className="text-sm font-bold text-content mt-0.5">
                    {currentUnit.bhk} BHK Residential
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-surface">
                  <div className="text-[10px] text-content-muted uppercase font-semibold">Floor Elevation</div>
                  <div className="text-sm font-bold text-content font-mono mt-0.5">
                    Floor {currentUnit.floorNumber || 1} of {currentUnit.totalFloors || 14}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-surface">
                  <div className="text-[10px] text-content-muted uppercase font-semibold">Vastu / Facing</div>
                  <div className="text-sm font-bold text-content mt-0.5 flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 text-accent" />
                    {currentUnit.facing || 'EAST'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-surface">
                  <div className="text-[10px] text-content-muted uppercase font-semibold">Bathrooms</div>
                  <div className="text-sm font-bold text-content font-mono mt-0.5">
                    {currentUnit.bathrooms || 2} En-suite / Common
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-surface">
                  <div className="text-[10px] text-content-muted uppercase font-semibold">Balconies</div>
                  <div className="text-sm font-bold text-content font-mono mt-0.5">
                    {currentUnit.balconies || 1} Attached
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-surface">
                  <div className="text-[10px] text-content-muted uppercase font-semibold">Car Parking</div>
                  <div className="text-sm font-bold text-content mt-0.5 flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-accent shrink-0" />
                    <span className="truncate">
                      {currentUnit.parkingCharges > 0 ? formatINR(currentUnit.parkingCharges) : 'Included / ₹0'}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-surface">
                  <div className="text-[10px] text-content-muted uppercase font-semibold">Possession State</div>
                  <div className="text-sm font-bold text-content mt-0.5">
                    {currentUnit.possessionStatus === 'READY_TO_MOVE' ? 'Ready to Move' : 'Under Construction'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-surface">
                  <div className="text-[10px] text-content-muted uppercase font-semibold">All-In Package</div>
                  <div className="text-sm font-bold text-accent font-mono mt-0.5">
                    {formatINR(currentUnit.allInTotalCost || currentUnit.agreementValue)}
                  </div>
                </div>
              </div>

              {/* Description & Feature Highlights */}
              <div className="p-4 rounded-xl border border-border bg-surface space-y-3">
                <h4 className="text-xs font-bold text-content uppercase tracking-wider">
                  Flat Description &amp; Highlights
                </h4>
                <p className="text-xs text-content-muted leading-relaxed">
                  {currentUnit.description ||
                    `${currentUnit.bhk} BHK luxury residential apartment (${currentUnit.carpetAreaSqft || 650} sq.ft. usable RERA carpet) in ${currentProject.projectName || 'Developer Project'}. Facing ${currentUnit.facing || 'EAST'} on floor ${currentUnit.floorNumber || 1}.`}
                </p>

                {Array.isArray(currentUnit.featureHighlights) && currentUnit.featureHighlights.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                    {currentUnit.featureHighlights.map((highlight: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-surface-raised border border-border text-[11px] text-content flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3 h-3 text-accent" />
                        {highlight}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Media Status Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  onClick={() => setActiveTab('floorplan')}
                  className="p-4 rounded-xl border border-border bg-surface hover:border-accent/50 transition-all cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-400">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-content">Layout Floor Plan</div>
                      <div className="text-[11px] text-content-muted">
                        {resolvedMedia.floorPlanUrl ? 'Blueprint attached' : 'No floor plan uploaded yet'}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-content-muted" />
                </div>

                <div
                  onClick={() => setActiveTab('photos')}
                  className="p-4 rounded-xl border border-border bg-surface hover:border-accent/50 transition-all cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-accent/10 text-accent">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-content">Interior Photos</div>
                      <div className="text-[11px] text-content-muted">
                        {resolvedMedia.photos.length > 0
                          ? `${resolvedMedia.photos.length} specific photo(s) uploaded`
                          : 'No interior photos uploaded yet'}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-content-muted" />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Floor Plan Blueprint */}
          {activeTab === 'floorplan' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="text-sm font-bold text-content flex items-center gap-2">
                    <Layers className="w-4 h-4 text-accent" />
                    {currentUnit.unitNumber ? `Flat ${currentUnit.unitNumber}` : `${currentUnit.bhk} BHK`} Blueprint Layout
                  </h3>
                  <p className="text-xs text-content-muted mt-0.5">
                    Specific architectural layout diagram for this configuration ({currentUnit.carpetAreaSqft} sq.ft. carpet)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {resolvedMedia.floorPlanUrl && (
                    <button
                      type="button"
                      onClick={handleDeleteFloorPlan}
                      disabled={uploading}
                      className="px-3.5 py-2 rounded-xl border border-status-danger/30 text-status-danger bg-status-danger-surface hover:bg-status-danger/10 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                      title="Remove layout blueprint"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => floorPlanInputRef.current?.click()}
                    disabled={uploading}
                    className="px-3.5 py-2 rounded-xl bg-accent hover:bg-accent/90 text-accent-contrast text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                  >
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <UploadCloud className="w-4 h-4" />
                    )}
                    <span>{resolvedMedia.floorPlanUrl ? 'Replace Blueprint' : 'Upload Floor Plan'}</span>
                  </button>
                </div>
              </div>

              {/* Blueprint Display */}
              {resolvedMedia.floorPlanUrl ? (
                <div className="relative rounded-2xl border border-border bg-slate-950/80 p-3 overflow-hidden flex items-center justify-center min-h-[380px]">
                  <img
                    src={resolvedMedia.floorPlanUrl}
                    alt={`Floor plan for Flat ${currentUnit.unitNumber || currentUnit.bhk + ' BHK'}`}
                    className="max-h-[420px] w-full object-contain rounded-xl"
                  />
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setLightboxUrl(resolvedMedia.floorPlanUrl)}
                      className="p-2 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs transition-colors cursor-pointer shadow-sm"
                      title="Enlarge Floor Plan"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteFloorPlan}
                      disabled={uploading}
                      className="p-2 rounded-lg bg-black/60 hover:bg-status-danger text-white backdrop-blur-xs transition-colors cursor-pointer shadow-sm"
                      title="Remove Blueprint from this Flat"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => floorPlanInputRef.current?.click()}
                  className="p-10 rounded-2xl border-2 border-dashed border-border hover:border-accent/50 bg-surface-subtle/50 hover:bg-surface-raised transition-all text-center cursor-pointer flex flex-col items-center justify-center gap-3"
                >
                  <div className="p-3.5 rounded-full bg-accent/10 text-accent">
                    <Layers className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-content">
                      No Blueprint Attached to Flat {currentUnit.unitNumber || currentUnit.bhk + ' BHK'}
                    </h4>
                    <p className="text-xs text-content-muted mt-1 max-w-md">
                      Click here to upload the floor plan blueprint specifically for this flat. It will be bound exclusively to this unit without affecting other flats.
                    </p>
                  </div>
                  <span className="mt-2 text-xs font-bold text-accent hover:underline flex items-center gap-1">
                    <UploadCloud className="w-3.5 h-3.5" /> Select Image or PDF Blueprint
                  </span>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Unit Photos & Interior Gallery */}
          {activeTab === 'photos' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="text-sm font-bold text-content flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-accent" />
                    Flat {currentUnit.unitNumber || currentUnit.bhk + ' BHK'} Specific Media Gallery
                  </h3>
                  <p className="text-xs text-content-muted mt-0.5">
                    Living room, master bedroom, balcony view, and interior renders unique to this flat
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => photosInputRef.current?.click()}
                  disabled={uploading}
                  className="px-3.5 py-2 rounded-xl bg-accent hover:bg-accent/90 text-accent-contrast text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UploadCloud className="w-4 h-4" />
                  )}
                  <span>Upload Photos (Select Multiple)</span>
                </button>
              </div>

              {/* Photos Grid */}
              {resolvedMedia.photos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {resolvedMedia.photos.map((photoUrl, idx) => (
                    <div
                      key={idx}
                      className="group relative rounded-xl border border-border bg-surface overflow-hidden aspect-4/3 shadow-2xs"
                    >
                      <img
                        src={photoUrl}
                        alt={`Photo ${idx + 1} for Flat ${currentUnit.unitNumber}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setLightboxUrl(photoUrl)}
                          className="p-2 rounded-lg bg-black/60 text-white hover:bg-black/90 transition-all cursor-pointer"
                          title="Enlarge Photo"
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePhoto(photoUrl)}
                          disabled={deletingPhotoUrl === photoUrl}
                          className="p-2 rounded-lg bg-status-danger/80 text-white hover:bg-status-danger transition-all cursor-pointer"
                          title="Delete Photo"
                        >
                          {deletingPhotoUrl === photoUrl ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  onClick={() => photosInputRef.current?.click()}
                  className="p-10 rounded-2xl border-2 border-dashed border-border hover:border-accent/50 bg-surface-subtle/50 hover:bg-surface-raised transition-all text-center cursor-pointer flex flex-col items-center justify-center gap-3"
                >
                  <div className="p-3.5 rounded-full bg-accent/10 text-accent">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-content">
                      No Interior Photos Uploaded for Flat {currentUnit.unitNumber || currentUnit.bhk + ' BHK'}
                    </h4>
                    <p className="text-xs text-content-muted mt-1 max-w-md">
                      Upload living room, bedroom, or balcony photos specifically for this unit. Each flat keeps its own distinct photo gallery.
                    </p>
                  </div>
                  <span className="mt-2 text-xs font-bold text-accent hover:underline flex items-center gap-1">
                    <UploadCloud className="w-3.5 h-3.5" /> Select Photos from Computer
                  </span>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Cost & Tax Breakdown */}
          {activeTab === 'cost' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl border border-border bg-surface-raised">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-content uppercase tracking-wider flex items-center gap-1.5">
                    <Calculator className="w-4 h-4 text-accent" /> Maharashtra Statutory Real Estate Cost Sheet
                  </h3>
                  <span className="badge-cobalt text-[10px]">
                    Govt Verified Computation
                  </span>
                </div>
                <p className="text-xs text-content-muted leading-relaxed">
                  Transparent statutory pricing breakdown adhering to Maharashtra stamp duty rates, RERA registration caps, and GST rules.
                </p>
              </div>

              {/* Detailed Cost Line Items */}
              <div className="rounded-xl border border-border overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-surface-subtle text-[11px] text-content-muted uppercase border-b border-border">
                    <tr>
                      <th className="p-3.5 pl-4">Cost Component</th>
                      <th className="p-3.5">Rate / Basis</th>
                      <th className="p-3.5 pr-4 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-surface font-mono">
                    <tr>
                      <td className="p-3.5 pl-4 font-sans font-medium text-content">Agreement Base Value</td>
                      <td className="p-3.5 text-content-muted">Base developer cost</td>
                      <td className="p-3.5 pr-4 text-right font-bold text-content">
                        {formatINR(currentUnit.agreementValue)}
                      </td>
                    </tr>

                    <tr>
                      <td className="p-3.5 pl-4 font-sans font-medium text-content">Stamp Duty</td>
                      <td className="p-3.5 text-content-muted">
                        {currentUnit.stampDutyRate || 6}% of Agreement Value
                      </td>
                      <td className="p-3.5 pr-4 text-right text-content">
                        {formatINR(
                          ((currentUnit.agreementValue || 0) * (currentUnit.stampDutyRate || 6)) / 100
                        )}
                      </td>
                    </tr>

                    <tr>
                      <td className="p-3.5 pl-4 font-sans font-medium text-content">Government Registration</td>
                      <td className="p-3.5 text-content-muted">Fixed statutory fee</td>
                      <td className="p-3.5 pr-4 text-right text-content">
                        {formatINR(currentUnit.registrationFee || 30000)}
                      </td>
                    </tr>

                    <tr>
                      <td className="p-3.5 pl-4 font-sans font-medium text-content">GST (Goods &amp; Services Tax)</td>
                      <td className="p-3.5 text-content-muted">
                        {gstPercentage}% {isOcReady ? '(Ready OC Exempt)' : isAffordable ? '(Affordable Rate)' : '(Standard)'}
                      </td>
                      <td className="p-3.5 pr-4 text-right text-content">
                        {formatINR(((currentUnit.agreementValue || 0) * gstPercentage) / 100)}
                      </td>
                    </tr>

                    {Boolean(currentUnit.floorRiseCharges) && (
                      <tr>
                        <td className="p-3.5 pl-4 font-sans font-medium text-content">Floor Rise Charges</td>
                        <td className="p-3.5 text-content-muted">Floor {currentUnit.floorNumber} elevation</td>
                        <td className="p-3.5 pr-4 text-right text-content">
                          {formatINR(currentUnit.floorRiseCharges)}
                        </td>
                      </tr>
                    )}

                    <tr>
                      <td className="p-3.5 pl-4 font-sans font-medium text-content">Dedicated Parking Slot</td>
                      <td className="p-3.5 text-content-muted">Covered / Stilt slot</td>
                      <td className="p-3.5 pr-4 text-right text-content">
                        {formatINR(currentUnit.parkingCharges || 250000)}
                      </td>
                    </tr>

                    <tr>
                      <td className="p-3.5 pl-4 font-sans font-medium text-content">Society &amp; Development Charges</td>
                      <td className="p-3.5 text-content-muted">Corpus fund, club share, electric meter</td>
                      <td className="p-3.5 pr-4 text-right text-content">
                        {formatINR(currentUnit.societyDevelopmentCharges || 150000)}
                      </td>
                    </tr>

                    <tr className="bg-accent/5 font-bold text-accent text-sm border-t-2 border-accent/20">
                      <td className="p-4 pl-4 font-sans">Total All-In Statutory Cost</td>
                      <td className="p-4 text-xs font-sans text-content-muted">
                        Turnkey inclusive price
                      </td>
                      <td className="p-4 pr-4 text-right text-base font-mono">
                        {formatINR(currentUnit.allInTotalCost || currentUnit.agreementValue)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {onSelectUnitForCalc && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSelectUnitForCalc(currentUnit);
                    }}
                    className="px-4 py-2 rounded-xl bg-accent hover:bg-accent/90 text-accent-contrast text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                  >
                    <Calculator className="w-4 h-4" />
                    <span>Open EMI &amp; Amortization Calculator for Flat {currentUnit.unitNumber}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Zoom Dialog */}
      {lightboxUrl && (
        <AccessibleDialog
          open={true}
          onClose={() => setLightboxUrl(null)}
          titleId="lightbox-title"
          size="2xl"
          panelClassName="!p-2 bg-black/90 border border-border/20 max-w-5xl"
        >
          <div className="relative flex flex-col items-center justify-center p-2">
            <h3 id="lightbox-title" className="sr-only">
              Enlarged Media Preview
            </h3>
            <button
              type="button"
              onClick={() => setLightboxUrl(null)}
              className="absolute top-2 right-2 p-2 rounded-lg bg-black/70 text-white hover:bg-black transition-colors cursor-pointer z-10"
              aria-label="Close enlarged view"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxUrl}
              alt="Enlarged Unit Blueprint or Photo"
              className="max-h-[85vh] w-auto max-w-full object-contain rounded-lg"
            />
          </div>
        </AccessibleDialog>
      )}
    </AccessibleDialog>
  );
}
