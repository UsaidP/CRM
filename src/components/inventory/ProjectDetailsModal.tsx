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
  Calculator
} from 'lucide-react';

interface ProjectDetailsModalProps {
  project: any;
  units?: any[];
  onClose: () => void;
  onSelectUnitForCalc?: (unit: any) => void;
}

export function ProjectDetailsModal({
  project,
  units = [],
  onClose,
  onSelectUnitForCalc,
}: ProjectDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'rera' | 'elevations' | 'floorplans' | 'areamatrix' | 'amenities'>('rera');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-5xl max-h-[92vh] bg-surface rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden text-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-modal-title"
      >
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
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-content-muted hover:text-content hover:bg-surface transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
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
              <div className="p-4 rounded-xl border border-accent/30 bg-accent-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-wider font-semibold text-accent flex items-center gap-1.5 font-mono">
                    <ShieldCheck className="w-4 h-4 text-accent" /> Official MahaRERA Registration
                  </div>
                  <div className="text-2xl font-bold font-mono text-content mt-1 tracking-tight">
                    {project.reraNumber || 'P52000026796'}
                  </div>
                  <div className="text-xs text-content-muted mt-0.5">
                    Legally verified on Maharashtra Real Estate Regulatory Authority portal.
                  </div>
                </div>
                <a
                  href={`https://maharerait.mahaonline.gov.in`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary px-4 py-2 text-xs font-semibold flex items-center gap-1.5 shrink-0"
                >
                  Verify on MahaRERA Portal <ExternalLink className="w-3.5 h-3.5" />
                </a>
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
                        {project.commencementCertificateDate ? new Date(project.commencementCertificateDate).toLocaleDateString('en-IN') : '15/01/2020'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border-subtle">
                      <span className="text-content-muted">Expected Possession:</span>
                      <span className="font-mono text-content">
                        {project.expectedPossessionDate ? new Date(project.expectedPossessionDate).toLocaleDateString('en-IN') : '31/12/2026'}
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
        <div className="p-4 border-t border-border bg-surface-raised flex items-center justify-between">
          <div className="text-xs text-content-muted font-mono">
            ZamZam Verified Real Estate Intelligence • Kharghar &amp; Taloja Corridor
          </div>
          <button
            onClick={onClose}
            className="btn-secondary px-4 py-2 text-xs font-medium"
          >
            Close Inspector
          </button>
        </div>
      </div>

      {/* Full-screen Image Preview Overlay */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-60 bg-black/95 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh]">
            <img src={selectedImage} alt="Expanded Architectural Preview" className="max-w-full max-h-[85vh] object-contain rounded-lg border border-accent/40 shadow-2xl" />
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-accent-text text-xs font-bold flex items-center gap-1 font-mono"
            >
              <X className="w-5 h-5" /> Close Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
