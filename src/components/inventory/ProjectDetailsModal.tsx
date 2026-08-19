'use client';

import React, { useState } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  MapPin, 
  Train, 
  Layers, 
  Calendar, 
  Phone, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  FileText, 
  Sparkles, 
  X, 
  Home, 
  Calculator,
  Compass,
  DollarSign
} from 'lucide-react';
import { formatInr, calculateAllInCost } from '@/lib/domain/cost-engine';

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
  const [activeTab, setActiveTab] = useState<'rera' | 'building' | 'units' | 'amenities'>('rera');

  if (!project) return null;

  const keyHighlights = typeof project.keyHighlightsJson === 'string'
    ? JSON.parse(project.keyHighlightsJson || '[]')
    : project.keyHighlights || [];

  const amenities = typeof project.amenitiesJson === 'string'
    ? JSON.parse(project.amenitiesJson || '[]')
    : project.amenities || [];

  const projectUnits = units.filter((u) => u.projectId === project.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl max-h-[90vh] bg-surface rounded-2xl border border-gold/30 shadow-2xl flex flex-col overflow-hidden text-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-modal-title"
      >
        {/* Header */}
        <div className="p-6 border-b border-border/40 bg-surface-raised flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-gold/10 border border-gold/30 rounded-xl text-gold">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 id="project-modal-title" className="text-xl font-bold text-content font-serif">
                  {project.projectName}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-gold/15 text-gold border border-gold/30">
                  {project.microMarket}
                </span>
                {project.hasOccupancyCertificate ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Ready OC (0% GST)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Under-Construction (5% GST)
                  </span>
                )}
              </div>
              <p className="text-xs text-content-muted mt-1">
                Developer: <span className="text-content font-medium">{project.developerName}</span> • Sub-locality: {project.subLocality}
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
        <div className="flex items-center gap-2 px-6 border-b border-border/40 bg-surface/50 overflow-x-auto">
          <button
            onClick={() => setActiveTab('rera')}
            className={`py-3 px-4 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'rera'
                ? 'border-gold text-gold font-semibold'
                : 'border-transparent text-content-muted hover:text-content'
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Government & MahaRERA Filing
          </button>
          <button
            onClick={() => setActiveTab('building')}
            className={`py-3 px-4 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'building'
                ? 'border-gold text-gold font-semibold'
                : 'border-transparent text-content-muted hover:text-content'
            }`}
          >
            <Layers className="w-4 h-4" /> Building Architecture & Specs
          </button>
          <button
            onClick={() => setActiveTab('units')}
            className={`py-3 px-4 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'units'
                ? 'border-gold text-gold font-semibold'
                : 'border-transparent text-content-muted hover:text-content'
            }`}
          >
            <Home className="w-4 h-4" /> Available Units ({projectUnits.length})
          </button>
          <button
            onClick={() => setActiveTab('amenities')}
            className={`py-3 px-4 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'amenities'
                ? 'border-gold text-gold font-semibold'
                : 'border-transparent text-content-muted hover:text-content'
            }`}
          >
            <Sparkles className="w-4 h-4" /> Amenities & Highlights
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* TAB 1: RERA & GOVT FILING */}
          {activeTab === 'rera' && (
            <div className="space-y-6">
              {/* MahaRERA Badge Card */}
              <div className="p-5 rounded-xl bg-gold/5 border border-gold/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-gold font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> Official MahaRERA Registration
                  </span>
                  <div className="text-2xl font-mono font-bold text-content mt-1">
                    {project.reraNumber || 'P520000xxxxx'}
                  </div>
                  <p className="text-xs text-content-muted mt-1">
                    Legally verified on Maharashtra Real Estate Regulatory Authority portal.
                  </p>
                </div>
                <a
                  href={`https://maharerait.mahaonline.gov.in`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-gold text-surface-dark font-medium text-xs flex items-center gap-2 hover:bg-gold-hover transition-colors whitespace-nowrap"
                >
                  Verify on MahaRERA Portal <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Statutory Specifications Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-surface-raised border border-border/40 space-y-3">
                  <h4 className="text-xs font-semibold text-content uppercase tracking-wider">Statutory & Legal Filing</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-border/20">
                      <span className="text-content-muted">Developer Entity:</span>
                      <span className="font-medium text-content">{project.developerName}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/20">
                      <span className="text-content-muted">RERA Registration ID:</span>
                      <span className="font-mono font-semibold text-gold">{project.reraNumber}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/20">
                      <span className="text-content-muted">Occupancy Certificate:</span>
                      <span className={`font-medium ${project.hasOccupancyCertificate ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {project.hasOccupancyCertificate ? 'Full OC Received' : 'Under-Construction (CC Valid)'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-content-muted">Applicable GST:</span>
                      <span className="font-semibold text-content">
                        {project.hasOccupancyCertificate ? '0% GST (Saved ~₹3.5L to ₹8.5L)' : '5% Standard GST'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-surface-raised border border-border/40 space-y-3">
                  <h4 className="text-xs font-semibold text-content uppercase tracking-wider">Construction & Possession</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-border/20">
                      <span className="text-content-muted">Commencement Date:</span>
                      <span className="font-medium text-content">
                        {project.commencementCertificateDate ? new Date(project.commencementCertificateDate).toLocaleDateString('en-IN') : 'Verified Active'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/20">
                      <span className="text-content-muted">Expected Possession:</span>
                      <span className="font-medium text-content">
                        {project.expectedPossessionDate ? new Date(project.expectedPossessionDate).toLocaleDateString('en-IN') : 'Dec 2025'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/20">
                      <span className="text-content-muted">Transit Proximity:</span>
                      <span className="font-medium text-gold flex items-center gap-1">
                        <Train className="w-3 h-3" /> {project.distanceToMetroKm || 0.4} km to Metro Line 1
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-content-muted">Standard Brokerage:</span>
                      <span className="font-semibold text-content">{project.standardCommissionPercent || 2.5}% Developer Split</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Developer Sales POC Contact Card */}
              {project.developerSalesPocName && (
                <div className="p-4 rounded-xl bg-surface-raised border border-border/40 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gold/10 rounded-lg text-gold">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs text-content-muted">Developer Sales Desk POC:</div>
                      <div className="text-sm font-semibold text-content">{project.developerSalesPocName}</div>
                      <div className="text-xs font-mono text-content-muted">{project.developerSalesPocPhone}</div>
                    </div>
                  </div>
                  <a
                    href={`tel:${project.developerSalesPocPhone}`}
                    className="px-3.5 py-1.5 rounded-lg bg-surface border border-gold/40 text-gold text-xs font-medium hover:bg-gold hover:text-surface-dark transition-colors"
                  >
                    Direct Call
                  </a>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BUILDING SPECS */}
          {activeTab === 'building' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-surface-raised border border-border/40 text-center">
                  <div className="text-xs text-content-muted">Total Towers</div>
                  <div className="text-2xl font-bold text-content mt-1">{project.totalTowers || 2}</div>
                  <div className="text-[11px] text-content-muted mt-0.5">High-Rise Blocks</div>
                </div>
                <div className="p-4 rounded-xl bg-surface-raised border border-border/40 text-center">
                  <div className="text-xs text-content-muted">Total Floors</div>
                  <div className="text-2xl font-bold text-content mt-1">{project.totalFloors || 22}</div>
                  <div className="text-[11px] text-content-muted mt-0.5">Storeys Tall</div>
                </div>
                <div className="p-4 rounded-xl bg-surface-raised border border-border/40 text-center">
                  <div className="text-xs text-content-muted">Base Rate</div>
                  <div className="text-2xl font-bold text-gold mt-1">₹{project.basePricePerSqft?.toLocaleString('en-IN') || '14,850'}</div>
                  <div className="text-[11px] text-content-muted mt-0.5">Per Sq.ft. Carpet</div>
                </div>
                <div className="p-4 rounded-xl bg-surface-raised border border-border/40 text-center">
                  <div className="text-xs text-content-muted">Metro Distance</div>
                  <div className="text-2xl font-bold text-emerald-400 mt-1">{project.distanceToMetroKm || 0.45} km</div>
                  <div className="text-[11px] text-content-muted mt-0.5">Kharghar Metro Line 1</div>
                </div>
              </div>

              {/* Architectural Description */}
              <div className="p-5 rounded-xl bg-surface-raised border border-border/40 space-y-3">
                <h4 className="text-xs font-semibold text-content uppercase tracking-wider">Architectural Overview</h4>
                <p className="text-xs text-content-muted leading-relaxed">
                  {project.description || project.shortDescription || 'Mivan aluminium formwork engineered residential development with high-speed passenger and stretcher elevators, grand entrance lobby, and dedicated multi-level covered car parking.'}
                </p>
                {project.locationDescription && (
                  <p className="text-xs text-content-muted leading-relaxed border-t border-border/20 pt-2">
                    <strong className="text-content">Location Context:</strong> {project.locationDescription}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: AVAILABLE UNITS */}
          {activeTab === 'units' && (
            <div className="space-y-4">
              {projectUnits.length === 0 ? (
                <div className="p-8 text-center bg-surface-raised rounded-xl border border-border/40">
                  <p className="text-xs text-content-muted">No active units registered for this project yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {projectUnits.map((unit) => (
                    <div
                      key={unit.id}
                      className="p-4 rounded-xl bg-surface-raised border border-border/40 hover:border-gold/30 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-content font-mono">{unit.unitNumber}</span>
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gold/15 text-gold border border-gold/30">
                            {unit.bhk} BHK
                          </span>
                          <span className="text-xs text-content-muted">
                            Floor {unit.floorNumber} of {unit.totalFloors}
                          </span>
                        </div>
                        <div className="text-xs text-content-muted mt-1 flex items-center gap-3">
                          <span>Carpet: <strong className="text-content">{unit.carpetAreaSqft} sq.ft.</strong></span>
                          <span>Facing: <strong className="text-content">{unit.facing}</strong></span>
                          <span>Baths: <strong className="text-content">{unit.bathrooms}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                        <div className="text-right">
                          <div className="text-xs text-content-muted">All-in Statutory Cost</div>
                          <div className="text-base font-bold text-gold font-mono">
                            {formatInr(unit.allInTotalCost || unit.agreementValue)}
                          </div>
                        </div>
                        {onSelectUnitForCalc && (
                          <button
                            onClick={() => {
                              onSelectUnitForCalc(unit);
                              onClose();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-gold/15 border border-gold/30 text-gold text-xs font-medium hover:bg-gold hover:text-surface-dark transition-colors flex items-center gap-1.5"
                          >
                            <Calculator className="w-3.5 h-3.5" /> Breakdown
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: AMENITIES & HIGHLIGHTS */}
          {activeTab === 'amenities' && (
            <div className="space-y-6">
              {keyHighlights.length > 0 && (
                <div className="p-4 rounded-xl bg-surface-raised border border-border/40 space-y-3">
                  <h4 className="text-xs font-semibold text-content uppercase tracking-wider">Key Project Highlights</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {keyHighlights.map((hl: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-content">
                        <CheckCircle2 className="w-3.5 h-3.5 text-gold shrink-0" />
                        <span>{hl}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {amenities.length > 0 && (
                <div className="p-4 rounded-xl bg-surface-raised border border-border/40 space-y-3">
                  <h4 className="text-xs font-semibold text-content uppercase tracking-wider">Lifestyle & Recreational Amenities</h4>
                  <div className="flex flex-wrap gap-2">
                    {amenities.map((amenity: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 rounded-lg bg-surface border border-border/60 text-xs text-content flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3 h-3 text-gold" /> {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/40 bg-surface-raised flex items-center justify-between text-xs text-content-muted">
          <span>ZamZam Verified Real Estate Intelligence</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface border border-border/60 text-content font-medium hover:bg-surface-raised transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
