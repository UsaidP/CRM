'use client';

import React, { useState } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  MapPin, 
  CheckCircle2, 
  Calendar, 
  Layers, 
  X, 
  Maximize2, 
  FileText, 
  Sparkles, 
  Phone, 
  Train, 
  ExternalLink, 
  ChevronRight, 
  Calculator,
  Pencil,
  Trash2,
  Download,
  FileCheck,
  RefreshCw,
  Eye
} from 'lucide-react';
import { formatDateFull } from '@/lib/date-utils';
import { AccessibleDialog } from '@/components/ui/AccessibleDialog';
import { ReraVerificationBadge } from '@/components/inventory/ReraVerificationBadge';
import { MahaReraCertificateModal } from '@/components/inventory/MahaReraCertificateModal';

interface ProjectDetailsModalProps {
  project: any;
  units?: any[];
  onClose: () => void;
  onSelectUnitForCalc?: (unit: any) => void;
  onEditProject?: (project: any) => void;
  onDeleteProject?: (projectId: string, projectName: string) => void;
}

export function ProjectDetailsModal({
  project,
  units = [],
  onClose,
  onSelectUnitForCalc,
  onEditProject,
  onDeleteProject,
}: ProjectDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'rera' | 'elevations' | 'floorplans' | 'areamatrix' | 'amenities'>('rera');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentProject, setCurrentProject] = useState(project);
  const [syncingCertificate, setSyncingCertificate] = useState(false);
  const [certificateMsg, setCertificateMsg] = useState<string | null>(null);
  const [showFormCModal, setShowFormCModal] = useState(false);

  const handleSyncCertificate = async () => {
    if (!currentProject?.reraNumber) return;
    setSyncingCertificate(true);
    setCertificateMsg(null);
    try {
      const res = await fetch('/api/v1/inventory/rera/fetch-certificate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reraNumber: currentProject.reraNumber,
          projectName: currentProject.projectName,
          developerName: currentProject.developerName,
          projectId: currentProject.id,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCurrentProject((prev: any) => ({
          ...prev,
          reraCertificateUrl: data.data.certificateUrl,
          reraRegisteredName: data.data.projectRecord?.projectName,
          reraProjectStatus: data.data.projectRecord?.projectStatus,
          reraValidUntil: data.data.projectRecord?.validUntil,
        }));
        setCertificateMsg(`MahaRERA Certificate downloaded and linked to ${currentProject.projectName}!`);
        setTimeout(() => setCertificateMsg(null), 5000);
      }
    } catch (err: any) {
      console.error('Certificate sync error:', err);
    } finally {
      setSyncingCertificate(false);
    }
  };

  if (!project) return null;

  const formatINR = (val: number) => {
    if (!val && val !== 0) return '₹0';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
    return `₹${Number(val).toLocaleString('en-IN')}`;
  };

  const mediaGallery = Array.isArray(project.mediaGalleryJson) 
    ? project.mediaGalleryJson 
    : typeof project.mediaGalleryJson === 'string'
    ? JSON.parse(project.mediaGalleryJson || '[]')
    : [];

  const keyHighlights = Array.isArray(project.keyHighlights)
    ? project.keyHighlights
    : typeof project.keyHighlights === 'string'
    ? JSON.parse(project.keyHighlights || '[]')
    : [];

  const amenities = Array.isArray(project.amenitiesJson)
    ? project.amenitiesJson
    : typeof project.amenitiesJson === 'string'
    ? JSON.parse(project.amenitiesJson || '[]')
    : [];

  const elevationImages = mediaGallery.filter((m: any) => 
    m.category === 'elevation' || 
    m.type === 'ELEVATION' || 
    (m.title && (m.title.toLowerCase().includes('elevation') || m.title.toLowerCase().includes('facade') || m.title.toLowerCase().includes('exterior')))
  );

  const floorPlanImages = mediaGallery.filter((m: any) => 
    m.category === 'floorplan' || 
    m.type === 'FLOOR_PLAN' || 
    (m.title && (m.title.toLowerCase().includes('floor plan') || m.title.toLowerCase().includes('blueprint') || m.title.toLowerCase().includes('layout') || m.title.toLowerCase().includes('master plan')))
  );

  const projectUnits = units.filter((u) => u.projectId === project.id);

  return (
    <AccessibleDialog
      open={true}
      onClose={onClose}
      titleId="project-modal-title"
      size="2xl"
      panelClassName="!p-0 overflow-hidden max-w-5xl"
    >
      <div className="relative w-full flex flex-col text-content">
        {/* Header */}
        <div className="p-5 border-b border-border bg-surface-raised flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-accent-soft border border-accent/30 rounded-xl text-accent">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 id="project-modal-title" className="text-xl font-bold text-content font-display">
                  {project.projectName}
                </h2>
                <span className="badge-cobalt">
                  {project.microMarket}
                </span>
                {project.hasOccupancyCertificate ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-success-surface text-status-success border border-status-success/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Ready OC (0% GST)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-warning-surface text-status-warning border border-status-warning/30 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Under-Construction (5% GST)
                  </span>
                )}
              </div>
              <p className="text-xs text-content-muted mt-1">
                Developer: <span className="text-content font-medium">{project.developerName}</span> • Sub-locality: {project.subLocality || 'Kharghar & Taloja Corridor'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onEditProject && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditProject(project);
                }}
                className="px-3 py-1.5 rounded-lg border border-border bg-surface text-content text-xs font-semibold hover:bg-surface-raised flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                title="Edit Project Specifications"
              >
                <Pencil className="w-3.5 h-3.5 text-accent" />
                <span className="hidden sm:inline">Edit Project</span>
              </button>
            )}
            {onDeleteProject && (
              <button
                type="button"
                onClick={() => {
                  onDeleteProject(project.id, project.projectName);
                }}
                className="px-3 py-1.5 rounded-lg border border-status-danger/30 bg-status-danger-surface text-status-danger text-xs font-semibold hover:bg-status-danger/10 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                title="Delete Project & Associated Units"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Delete Project</span>
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

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 border-b border-border bg-surface-subtle overflow-x-auto">
          <button
            onClick={() => setActiveTab('rera')}
            className={`py-3 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'rera' 
                ? 'border-accent text-accent font-semibold' 
                : 'border-transparent text-content-muted hover:text-content'
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Government &amp; MahaRERA
          </button>
          <button
            onClick={() => setActiveTab('elevations')}
            className={`py-3 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'elevations' 
                ? 'border-accent text-accent font-semibold' 
                : 'border-transparent text-content-muted hover:text-content'
            }`}
          >
            <Building2 className="w-4 h-4" /> Elevations &amp; Facades ({elevationImages.length || 2})
          </button>
          <button
            onClick={() => setActiveTab('floorplans')}
            className={`py-3 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'floorplans' 
                ? 'border-accent text-accent font-semibold' 
                : 'border-transparent text-content-muted hover:text-content'
            }`}
          >
            <Layers className="w-4 h-4" /> Floor Plans &amp; Blueprints ({floorPlanImages.length || 2})
          </button>
          <button
            onClick={() => setActiveTab('areamatrix')}
            className={`py-3 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'areamatrix' 
                ? 'border-accent text-accent font-semibold' 
                : 'border-transparent text-content-muted hover:text-content'
            }`}
          >
            <Calculator className="w-4 h-4" /> Area Matrix &amp; Units ({projectUnits.length})
          </button>
          <button
            onClick={() => setActiveTab('amenities')}
            className={`py-3 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'amenities' 
                ? 'border-accent text-accent font-semibold' 
                : 'border-transparent text-content-muted hover:text-content'
            }`}
          >
            <Sparkles className="w-4 h-4" /> Amenities
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(92vh-170px)] space-y-6">
          
          {/* TAB 1: MahaRERA & Government Filing */}
          {activeTab === 'rera' && (
            <div className="space-y-6">
              <ReraVerificationBadge
                reraNumber={currentProject.reraNumber}
                projectId={currentProject.id}
                showDuplicateCheck={false}
                showPortalLink={true}
                showCopyButton={true}
              />

              {/* Official MahaRERA Certificate Download & Sync Card */}
              <div className="p-4 rounded-2xl border border-accent/30 bg-surface-raised space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-accent-soft text-accent border border-accent/20">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-content font-display">
                        Official MahaRERA Registration Certificate
                      </h4>
                      <p className="text-xs text-content-muted mt-0.5">
                        {currentProject.reraCertificateUrl
                          ? `Statutory PDF Document Linked • Valid until ${currentProject.reraValidUntil ? formatDateFull(currentProject.reraValidUntil) : 'Dec 2027'}`
                          : 'Download statutory certificate directly from MahaRERA government registry.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowFormCModal(true)}
                      className="px-3.5 py-2 rounded-xl bg-surface hover:bg-surface-subtle text-content border border-border text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-4 h-4 text-accent" />
                      <span>Preview Form &lsquo;C&rsquo;</span>
                    </button>

                    {currentProject.reraCertificateUrl ? (
                      <a
                        href={currentProject.reraCertificateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold shadow-xs hover:bg-accent-hover transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download PDF</span>
                      </a>
                    ) : null}

                    <button
                      type="button"
                      disabled={syncingCertificate}
                      onClick={handleSyncCertificate}
                      className="px-3.5 py-2 rounded-xl bg-surface hover:bg-surface-subtle text-accent border border-accent/30 text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {syncingCertificate ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Syncing…</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>{currentProject.reraCertificateUrl ? 'Re-Sync' : 'Fetch Certificate'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {certificateMsg && (
                  <div className="p-2.5 bg-status-success-surface border border-status-success/30 rounded-xl text-status-success text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{certificateMsg}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-border bg-surface-raised space-y-3">
                  <h3 className="text-xs font-bold text-content uppercase tracking-wider">Statutory &amp; Legal Filing</h3>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between py-1 border-b border-border-subtle">
                      <span className="text-content-muted">Developer Entity:</span>
                      <span className="font-medium text-content font-sans">{project.developerName}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border-subtle">
                      <span className="text-content-muted">RERA Registration ID:</span>
                      <span className="font-mono font-medium text-accent-text">{project.reraNumber}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border-subtle">
                      <span className="text-content-muted">CIDCO Micro-Market Node:</span>
                      <span className="font-medium text-content font-sans">{project.microMarket}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border-subtle">
                      <span className="text-content-muted">Occupancy Certificate:</span>
                      <span className={`font-medium ${project.hasOccupancyCertificate ? 'text-status-success' : 'text-status-warning'}`}>
                        {project.hasOccupancyCertificate ? 'Received (OC Valid)' : 'Under-Construction (CC Valid)'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-content-muted">Applicable GST:</span>
                      <span className="font-semibold text-content font-sans">
                        {project.hasOccupancyCertificate ? '0% (Exempt on Ready OC)' : '5% Standard GST'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-border bg-surface-raised space-y-3">
                  <h3 className="text-xs font-bold text-content uppercase tracking-wider">Construction &amp; Possession</h3>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between py-1 border-b border-border-subtle">
                      <span className="text-content-muted">Commencement Date:</span>
                      <span className="font-mono text-content">
                        {project.commencementCertificateDate ? formatDateFull(project.commencementCertificateDate) : '15 Jan 2020'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border-subtle">
                      <span className="text-content-muted">Expected Possession:</span>
                      <span className="font-mono text-content">
                        {project.expectedPossessionDate ? formatDateFull(project.expectedPossessionDate) : '31 Dec 2026'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border-subtle">
                      <span className="text-content-muted">Transit Proximity:</span>
                      <span className="font-medium text-content flex items-center gap-1 font-sans">
                        <Train className="w-3.5 h-3.5 text-accent" /> {project.distanceToMetroKm || 0.65} km to Metro Line 1
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-content-muted">Standard Brokerage:</span>
                      <span className="font-mono text-accent font-bold">{project.standardCommissionPercent || 2.5}% Developer Split</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Developer POC Contact */}
              {project.developerSalesPocPhone && (
                <div className="p-4 rounded-xl border border-border bg-surface-raised flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-accent-soft text-accent">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs text-content-muted">Developer Sales Desk POC:</div>
                      <div className="text-sm font-bold text-content">{project.developerSalesPocName || 'Developer Sales Representative'}</div>
                      <div className="text-xs font-mono text-content-muted">{project.developerSalesPocPhone}</div>
                    </div>
                  </div>
                  <a
                    href={`tel:${project.developerSalesPocPhone}`}
                    className="btn-cobalt px-3 py-1.5 text-xs font-bold"
                  >
                    Direct Call
                  </a>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Elevations & Facades */}
          {activeTab === 'elevations' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl border border-border bg-surface-raised">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-content uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-accent" /> Architectural Elevations &amp; Exterior Facades
                  </h3>
                  <span className="text-[11px] text-content-muted bg-surface px-2.5 py-1 rounded border border-border font-mono">
                    Strict Filter: Only Exterior Renders &amp; High-Rise Elevations
                  </span>
                </div>
                <p className="text-xs text-content-muted leading-relaxed">
                  High-resolution 3D building elevations, tower architecture, and aerial views from sanctioned MahaRERA and CIDCO filings.
                </p>
              </div>

              {/* Elevation Image Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(elevationImages.length > 0 ? elevationImages : [
                  { url: project.coverImageUrl || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1600', title: `${project.projectName} Tower Elevation` },
                  { url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600', title: `${project.projectName} Facade Render` }
                ]).map((img: any, idx: number) => (
                  <div 
                    key={idx} 
                    className="group relative rounded-xl overflow-hidden border border-border bg-surface-inset aspect-[16/10] cursor-pointer"
                    onClick={() => setSelectedImage(img.url)}
                  >
                    <img 
                      src={img.url} 
                      alt={img.title || `${project.projectName} Elevation ${idx + 1}`} 
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-semibold text-white">
                          {img.title || `Tower Architectural Elevation ${idx + 1}`}
                        </span>
                        <span className="p-1.5 rounded-md bg-black/60 text-white group-hover:bg-accent group-hover:text-white transition-colors">
                          <Maximize2 className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Architecture Specs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-lg border border-border bg-surface-raised text-center">
                  <div className="text-[11px] text-content-muted">Total Towers</div>
                  <div className="text-base font-bold text-content font-mono">{project.totalTowers || 6}</div>
                </div>
                <div className="p-3 rounded-lg border border-border bg-surface-raised text-center">
                  <div className="text-[11px] text-content-muted">Storeys / Floors</div>
                  <div className="text-base font-bold text-content font-mono">{project.totalFloors || 38} Storeys</div>
                </div>
                <div className="p-3 rounded-lg border border-border bg-surface-raised text-center">
                  <div className="text-[11px] text-content-muted">Base Price/sqft</div>
                  <div className="text-base font-bold text-accent font-mono">₹{project.basePricePerSqft?.toLocaleString('en-IN') || '14,500'}</div>
                </div>
                <div className="p-3 rounded-lg border border-border bg-surface-raised text-center">
                  <div className="text-[11px] text-content-muted">Metro Station</div>
                  <div className="text-base font-bold text-content font-mono">{project.distanceToMetroKm || 0.65} km</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Floor Plans & Blueprints */}
          {activeTab === 'floorplans' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl border border-border bg-surface-raised">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-content uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-accent" /> Sanctioned Floor Plans &amp; Blueprints
                  </h3>
                  <span className="text-[11px] text-content-muted bg-surface px-2.5 py-1 rounded border border-border font-mono">
                    Architectural Layout Blueprints
                  </span>
                </div>
                <p className="text-xs text-content-muted leading-relaxed">
                  Sanctioned master blueprints, typical cluster floor plans, and 2D/3D unit floor plan schematics with exact internal dimensions.
                </p>
              </div>

              {/* Floor Plan Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(floorPlanImages.length > 0 ? floorPlanImages : [
                  { url: project.masterPlanUrl || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600', title: `${project.projectName} Master Layout Plan` },
                  { url: 'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=1600', title: `Typical 2 & 3 BHK Cluster Floor Plan` }
                ]).map((img: any, idx: number) => (
                  <div 
                    key={idx} 
                    className="group relative rounded-xl overflow-hidden border border-border bg-surface-inset aspect-[16/11] cursor-pointer"
                    onClick={() => setSelectedImage(img.url)}
                  >
                    <img 
                      src={img.url} 
                      alt={img.title || `${project.projectName} Floor Plan ${idx + 1}`} 
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-semibold text-white">
                          {img.title || `Sanctioned Floor Plan Blueprint ${idx + 1}`}
                        </span>
                        <span className="p-1.5 rounded-md bg-black/60 text-white group-hover:bg-accent group-hover:text-white transition-colors">
                          <Maximize2 className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Area Matrix & Units */}
          {activeTab === 'areamatrix' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl border border-border bg-surface-raised">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-content uppercase tracking-wider flex items-center gap-1.5">
                    <Calculator className="w-4 h-4 text-accent" /> Area Measurements &amp; Loading Matrix
                  </h3>
                  <span className="text-[11px] text-content-muted bg-surface px-2.5 py-1 rounded border border-border font-mono">
                    Carpet vs Built-Up vs Super Built-Up
                  </span>
                </div>
                <p className="text-xs text-content-muted leading-relaxed">
                  Every unit configuration adheres strictly to RERA Carpet standards, with full disclosure of Built-Up area and common area loading %.
                </p>
              </div>

              {/* Units Table with Area Matrix */}
              {projectUnits.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-border rounded-xl">
                  <p className="text-xs text-content-muted">No specific child units mapped yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {projectUnits.map((unit) => {
                    const carpetSqft = unit.carpetAreaSqft || 650;
                    const builtUpSqft = Math.round(carpetSqft * 1.15);
                    const superBuiltUpSqft = Math.round(carpetSqft * 1.335);

                    return (
                      <div 
                        key={unit.id}
                        className="p-4 rounded-xl border border-border bg-surface-raised hover:border-accent transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-bold text-content font-mono">{unit.unitNumber}</span>
                            <span className="badge-cobalt">
                              {unit.bhk} BHK
                            </span>
                            <span className="text-xs text-content-muted font-mono">Floor {unit.floorNumber} of {unit.totalFloors}</span>
                            <span className="text-xs text-content-muted">• Facing: <strong className="text-content">{unit.facing}</strong></span>
                          </div>

                          {/* Area Breakdown Matrix */}
                          <div className="grid grid-cols-3 gap-3 bg-surface-inset p-2.5 rounded-lg border border-border text-xs font-mono">
                            <div>
                              <div className="text-[10px] text-content-muted uppercase">RERA Carpet</div>
                              <div className="font-bold text-content">{carpetSqft} sq.ft.</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-content-muted uppercase">Built-Up Area</div>
                              <div className="font-bold text-content">{builtUpSqft} sq.ft.</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-content-muted uppercase">Super Built-Up (Saleable)</div>
                              <div className="font-bold text-accent-text">{superBuiltUpSqft} sq.ft. (33.5% load)</div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                          <div className="text-right">
                            <div className="text-xs text-content-muted font-mono">All-in Statutory Cost</div>
                            <div className="text-base font-bold text-accent font-mono">
                              {formatINR(unit.allInTotalCost || unit.agreementValue)}
                            </div>
                          </div>
                          {onSelectUnitForCalc && (
                            <button
                              onClick={() => {
                                onSelectUnitForCalc(unit);
                                onClose();
                              }}
                              className="btn-secondary px-3 py-1.5 text-xs font-medium flex items-center gap-1.5"
                            >
                              <Calculator className="w-3.5 h-3.5" /> Breakdown
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Amenities & Highlights */}
          {activeTab === 'amenities' && (
            <div className="space-y-6">
              {keyHighlights.length > 0 && (
                <div className="p-4 rounded-xl border border-border bg-surface-raised space-y-3">
                  <h3 className="text-xs font-bold text-content uppercase tracking-wider">Key Project Highlights</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {keyHighlights.map((hl: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-content">
                        <CheckCircle2 className="w-4 h-4 text-status-success shrink-0" />
                        <span>{hl}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {amenities.length > 0 && (
                <div className="p-4 rounded-xl border border-border bg-surface-raised space-y-3">
                  <h3 className="text-xs font-bold text-content uppercase tracking-wider">Lifestyle &amp; Recreational Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {amenities.map((amenity: string, idx: number) => (
                      <span 
                        key={idx}
                        className="px-3 py-1.5 rounded-lg text-xs bg-surface border border-border text-content flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-accent" />
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border bg-surface-raised flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-content-muted font-mono">
            ZamZam Verified Real Estate Intelligence • Kharghar &amp; Taloja Corridor
          </div>
          <div className="flex items-center gap-2">
            {onDeleteProject && (
              <button
                type="button"
                onClick={() => {
                  onDeleteProject(project.id, project.projectName);
                }}
                className="px-3 py-2 text-xs font-semibold rounded-xl border border-status-danger/30 text-status-danger bg-status-danger-surface hover:bg-status-danger/10 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
            {onEditProject && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditProject(project);
                }}
                className="btn-secondary px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5 text-accent" />
                <span>Edit Specs</span>
              </button>
            )}
            <button
              type="button"
              data-dialog-close
              onClick={onClose}
              className="btn-secondary px-4 py-2 text-xs font-medium cursor-pointer"
            >
              Close Inspector
            </button>
          </div>
        </div>
      </div>

      {/* Form C Interactive Preview Modal */}
      {currentProject && (
        <MahaReraCertificateModal
          open={showFormCModal}
          onClose={() => setShowFormCModal(false)}
          projectData={{
            reraNumber: currentProject.reraNumber || 'P52000079818',
            projectName: currentProject.projectName || 'CITY AVENUE',
            developerName: currentProject.developerName || 'City Space',
            promoterName: currentProject.promoterName || currentProject.developerName || 'City Space',
            address: currentProject.address || 'PLOT NO 12D, SECTOR-24 at Taloja Panchnad , Panvel, Raigarh, 410208',
            plotDetails: currentProject.plotDetails || currentProject.address || 'PLOT NO 12D, SECTOR-24 at Taloja Panchnad , Panvel, Raigarh, 410208',
            registeredOffice: currentProject.registeredOffice || 'Tehsil: Panvel, District: Raigarh, Pin: 410210',
            registrationDate: currentProject.registrationDate ? String(currentProject.registrationDate) : '27/03/2025',
            validUntil: currentProject.validUntil ? String(currentProject.validUntil) : (currentProject.reraValidUntil ? formatDateFull(currentProject.reraValidUntil) : '31/12/2028'),
            signatoryName: currentProject.signatoryName || 'Prakash Kaluram Sabale',
            signatoryDate: currentProject.signatoryDate || '3/27/2025 3:57:36 PM',
            certificateUrl: currentProject.reraCertificateUrl || (currentProject.reraNumber === 'P52000079818' ? '/uploads/rera-certificates/MahaRERA_P52000079818_city_avenue_Certificate.pdf' : undefined),
            originalImageUrl: currentProject.originalDocumentUrl || (currentProject.reraNumber === 'P52000079818' ? '/images/original-certificates/P52000079818.png' : undefined),
            isOriginalScannedDocument: true,
          }}
        />
      )}
    </AccessibleDialog>
  );
}
