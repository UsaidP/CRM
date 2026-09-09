'use client';

import React from 'react';
import {
  Building2,
  ShieldCheck,
  Sparkles,
  FileCheck,
  Eye,
  Pencil,
  Trash2,
  MapPin,
  Star,
  Plus,
} from 'lucide-react';
import type { MediaAsset } from '@/components/inventory/MediaUploader';

export interface ProjectsGridSliceProps {
  filteredProjects: any[];
  allProjectsCount: number;
  allUnits: any[];
  onOpenMediaStudio: (project: any) => void;
  onOpenFormC: (project: any) => void;
  onInspectProject: (project: any) => void;
  onEditProject: (project: any) => void;
  onDeleteProject: (project: { id: string; name: string; unitCount: number }) => void;
  onAddUnit: (projectId: string) => void;
  onResetFilters: () => void;
}

export function ProjectsGridSlice({
  filteredProjects,
  allProjectsCount,
  allUnits,
  onOpenMediaStudio,
  onOpenFormC,
  onInspectProject,
  onEditProject,
  onDeleteProject,
  onAddUnit,
  onResetFilters,
}: ProjectsGridSliceProps) {
  return (
    <section aria-labelledby="project-catalogue-title" className="space-y-3">
      <div className="flex items-center justify-between gap-3 px-1">
        <div>
          <h2
            id="project-catalogue-title"
            className="font-display text-sm font-bold uppercase tracking-wider text-content"
          >
            Project Catalogue
          </h2>
          <p className="mt-0.5 text-xs text-content-secondary">
            Maintain the story, location context, media, and RERA profile clients will see.
          </p>
        </div>
        <span className="font-mono text-xs font-bold text-accent-text">
          {filteredProjects.length}{' '}
          {filteredProjects.length === allProjectsCount
            ? 'projects'
            : `of ${allProjectsCount} projects`}
        </span>
      </div>

      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => {
            const cover =
              project.coverImageUrl ||
              project.mediaGallery?.find((asset: MediaAsset) => asset.kind === 'image')?.url;

            return (
              <article
                key={project.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-surface shadow-xs hover:shadow-md hover:border-accent/40 transition-all duration-300"
              >
                <div>
                  {/* Card Hero Image Header */}
                  <div className="relative h-44 w-full bg-surface-subtle overflow-hidden">
                    {cover ? (
                      <img
                        src={cover}
                        alt={project.projectName}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                          const fallback = (e.target as HTMLElement).nextElementSibling;
                          if (fallback) (fallback as HTMLElement).classList.remove('hidden');
                        }}
                      />
                    ) : null}

                    {/* Fallback pattern when no image or image fails */}
                    <div
                      className={`h-full w-full bg-gradient-to-br from-surface via-surface-subtle to-accent-soft/30 flex flex-col items-center justify-center p-4 text-center ${
                        cover ? 'hidden' : 'flex'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-2xl bg-accent-soft text-accent flex items-center justify-center mb-2 shadow-2xs">
                        <Building2 className="h-6 w-6 text-accent" />
                      </div>
                      <span className="font-display font-bold text-xs text-content truncate max-w-[200px]">
                        {project.projectName}
                      </span>
                      <span className="text-[10px] text-content-muted">
                        {project.microMarket}
                      </span>
                    </div>

                    {/* Dark/Gradient Scrim Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10 pointer-events-none" />

                    {/* Top Overlay Badge Bar */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-auto">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/15 text-white text-[10px] font-mono font-bold tracking-tight shadow-xs">
                          <ShieldCheck className="w-3 h-3 text-status-success" />
                          <span className="truncate max-w-[120px]">
                            {project.reraNumber || 'RERA VERIFIED'}
                          </span>
                        </span>
                        {project.hasOccupancyCertificate && (
                          <span className="inline-flex items-center px-2 py-1 rounded-lg bg-status-success/80 backdrop-blur-md text-white text-[9px] font-bold tracking-wider uppercase shadow-xs">
                            OC Ready
                          </span>
                        )}
                      </div>

                      {/* Quick Menu Icons on Card Header */}
                      <div className="flex items-center gap-1 bg-black/50 backdrop-blur-md p-1 rounded-xl border border-white/15 shadow-xs">
                        <button
                          type="button"
                          onClick={() => onOpenMediaStudio(project)}
                          aria-label={`Open Elevation & Floor Plan Studio for ${project.projectName}`}
                          title="Elevation & Floor Plan Studio (Brochure Extractor & Cloud Storage)"
                          className="grid h-6 w-6 place-items-center rounded-lg text-amber-300 hover:text-white hover:bg-amber-500/30 transition-colors cursor-pointer"
                        >
                          <Sparkles className="h-3 w-3" />
                        </button>
                        {project.reraCertificateUrl && (
                          <button
                            type="button"
                            onClick={() => onOpenFormC(project)}
                            aria-label={`View ${project.projectName} MahaRERA Form C Certificate`}
                            title="View Official MahaRERA Form 'C' Certificate"
                            className="grid h-6 w-6 place-items-center rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-500/30 transition-colors cursor-pointer"
                          >
                            <FileCheck className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onInspectProject(project)}
                          aria-label={`Inspect ${project.projectName} Specifications`}
                          title="Inspect Full Building & RERA Specs"
                          className="grid h-6 w-6 place-items-center rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
                        >
                          <Eye className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditProject(project)}
                          aria-label={`Edit ${project.projectName}`}
                          title="Edit Project"
                          className="grid h-6 w-6 place-items-center rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onDeleteProject({
                              id: project.id,
                              name: project.projectName,
                              unitCount: project.unitCount || 0,
                            })
                          }
                          aria-label={`Delete ${project.projectName}`}
                          title="Delete Project"
                          className="grid h-6 w-6 place-items-center rounded-lg text-white/80 hover:text-status-danger hover:bg-red-500/20 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {/* Bottom Overlay on Image: Location & Developer */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2 pointer-events-none">
                      <div className="min-w-0">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-white/90 bg-white/15 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10 mb-1">
                          <MapPin className="w-2.5 h-2.5 text-accent-soft" />
                          <span className="truncate max-w-[180px]">{project.microMarket}</span>
                        </span>
                        <h3 className="truncate font-display text-base font-bold text-white drop-shadow-xs">
                          {project.projectName}
                        </h3>
                      </div>
                      <div className="shrink-0 text-right">
                        {(() => {
                          const pUnits =
                            Array.isArray(project.units) && project.units.length > 0
                              ? project.units
                              : allUnits.filter(
                                  (u) =>
                                    u.projectId === project.id || u.project?.id === project.id
                                );
                          const totalCount = project.unitCount ?? pUnits.length;
                          const liveCount =
                            project.activeUnitCount ??
                            pUnits.filter(
                              (u: any) =>
                                u.verificationStatus === 'ACTIVE_MARKETABLE' ||
                                u.freshness?.effectiveMarketableStatus === 'ACTIVE_MARKETABLE'
                            ).length;
                          return (
                            <span className="text-[10px] font-mono font-bold text-white/90 bg-black/50 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 block">
                              {totalCount} {totalCount === 1 ? 'unit' : 'units'} ({liveCount} live)
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Card Body Specs & Highlights */}
                  <div className="p-4 space-y-3">
                    {/* Developer, Rate & Sublocality Row */}
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="font-semibold text-content flex items-center gap-1 truncate">
                        <Building2 className="w-3.5 h-3.5 text-accent shrink-0" />
                        <span className="truncate">{project.developerName}</span>
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {project.basePricePerSqft ? (
                          <span className="text-[11px] font-mono text-accent-text font-bold bg-accent-soft/70 px-2 py-0.5 rounded-md border border-accent/20">
                            ₹{project.basePricePerSqft.toLocaleString('en-IN')}/sq.ft
                          </span>
                        ) : null}
                        {project.distanceToMetroKm ? (
                          <span className="text-[11px] font-mono text-content-secondary font-medium bg-surface-subtle px-1.5 py-0.5 rounded-md border border-border">
                            {project.distanceToMetroKm} km to Metro
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Description */}
                    <p className="line-clamp-2 text-xs text-content-secondary leading-relaxed min-h-[32px]">
                      {project.shortDescription ||
                        project.description ||
                        'Verified residential project in prime sector with standard developer amenities.'}
                    </p>

                    {/* Key Highlights Tags */}
                    {project.keyHighlights && project.keyHighlights.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {project.keyHighlights.slice(0, 2).map((hl: string, idx: number) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 text-[10px] font-medium text-accent-text bg-accent-soft/80 border border-accent/20 px-2 py-0.5 rounded-md truncate max-w-[200px]"
                          >
                            <Star className="w-2.5 h-2.5 text-accent shrink-0" />
                            <span className="truncate">{hl}</span>
                          </span>
                        ))}
                        {project.keyHighlights.length > 2 && (
                          <span className="text-[10px] font-mono font-semibold text-content-muted px-1.5 py-0.5">
                            +{project.keyHighlights.length - 2} more
                          </span>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Card Bottom CTA Actions */}
                <div className="px-4 pb-4 pt-2 border-t border-border flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onInspectProject(project)}
                    className="flex-1 h-8 rounded-xl bg-surface-subtle hover:bg-accent-soft text-content hover:text-accent-text border border-border hover:border-accent/30 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                    title="View full specs, amenities, brochure and map"
                  >
                    <Eye className="w-3.5 h-3.5 text-accent" />
                    <span>View Details</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onAddUnit(project.id)}
                    className="h-8 px-3.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    title="Add unit under this project"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Unit</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center bg-surface rounded-2xl border border-border space-y-2">
          <Building2 className="w-8 h-8 mx-auto text-content-muted/40" />
          <p className="text-xs font-bold text-content">
            No projects match the current search &amp; filter criteria
          </p>
          <p className="text-[11px] text-content-muted">
            Try adjusting your search query or micro-market filter.
          </p>
          <button
            type="button"
            onClick={onResetFilters}
            className="mt-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-accent text-white hover:bg-accent-hover cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      )}
    </section>
  );
}
