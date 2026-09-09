'use client';

import React from 'react';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { HallmarkStamp } from '@/components/ui/HallmarkStamp';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatINR } from '@/lib/formatters';

export interface UnitsTableSliceProps {
  viewMode: 'table' | 'cards';
  filteredUnits: any[];
  allUnitsCount: number;
  allProjects: any[];
  onInspectUnit: (unit: any, project?: any) => void;
  onEditUnit: (unit: any) => void;
  onDeleteUnit: (unit: { id: string; unitNumber: string; projectName: string }) => void;
  onOpenCalcModal: (unit: any) => void;
  onOpenVerifyModal: (unit: any) => void;
  onResetFilters: () => void;
}

export function UnitsTableSlice({
  viewMode,
  filteredUnits,
  allUnitsCount,
  allProjects,
  onInspectUnit,
  onEditUnit,
  onDeleteUnit,
  onOpenCalcModal,
  onOpenVerifyModal,
  onResetFilters,
}: UnitsTableSliceProps) {
  return (
    <section aria-labelledby="marketable-units-title" className="space-y-3">
      <div className="flex items-center justify-between gap-3 px-1">
        <div>
          <h2
            id="marketable-units-title"
            className="font-display text-sm font-bold uppercase tracking-wider text-content"
          >
            Marketable Units Matrix
          </h2>
          <p className="mt-0.5 text-xs text-content-secondary">
            Individual floor plate flats, statutory tax schedules, and 14-day broker verification
            status.
          </p>
        </div>
        <span className="font-mono text-xs font-bold text-accent-text">
          {filteredUnits.length}{' '}
          {filteredUnits.length === allUnitsCount ? 'units' : `of ${allUnitsCount} units`}
        </span>
      </div>

      {/* TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="rounded-2xl bg-surface border border-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-subtle text-content-secondary uppercase text-[10px] font-bold border-b border-border">
                <tr>
                  <th className="p-3.5 pl-4">Project &amp; Developer</th>
                  <th className="p-3.5">Unit / Floor</th>
                  <th className="p-3.5">Config &amp; Carpet</th>
                  <th className="p-3.5 text-right">Agreement Value</th>
                  <th className="p-3.5 text-right">
                    <div
                      className="flex items-center justify-end gap-1"
                      title="All-Inclusive Total Cost including Stamp Duty, Registration, GST and Society charges"
                    >
                      <span>All-In Cost</span>
                      <span className="text-[9px] font-mono text-content-muted font-normal lowercase">
                        (all taxes incl.)
                      </span>
                    </div>
                  </th>
                  <th className="p-3.5">RERA ID</th>
                  <th className="p-3.5 text-center">Broker Update</th>
                  <th className="p-3.5 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-content-secondary">
                {filteredUnits.map((unit) => {
                  const isFresh = unit.freshness?.effectiveMarketableStatus === 'ACTIVE_MARKETABLE';
                  const isStale = unit.freshness?.effectiveMarketableStatus === 'STALE_EXPIRED';
                  const daysAgo = unit.freshness?.daysSinceVerification ?? 0;

                  return (
                    <tr
                      key={unit.id}
                      className={`hover:bg-surface-subtle/80 transition-colors ${
                        isStale ? 'bg-status-danger-surface/30' : ''
                      }`}
                    >
                      <td className="p-3.5 pl-4">
                        <div className="font-bold text-content font-sans text-sm">
                          {unit.project?.projectName}
                        </div>
                        <div className="text-[11px] text-content-muted mt-0.5">
                          {unit.project?.developerName} • {unit.project?.microMarket}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-semibold text-content">
                          Unit {unit.unitNumber || 'N/A'}
                        </div>
                        <div className="text-[11px] text-content-muted mt-0.5">
                          Floor {unit.floorNumber} of {unit.totalFloors}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="text-accent-text font-bold">
                          {unit.bhk} BHK • {unit.facing}
                        </div>
                        <div className="text-[11px] text-content-muted mt-0.5 font-mono">
                          {unit.carpetAreaSqft} sq.ft carpet
                        </div>
                      </td>

                      <td className="p-3.5 text-right font-bold text-content font-mono">
                        {formatINR(unit.agreementValue)}
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="font-bold text-accent-text font-mono">
                          {formatINR(unit.allInTotalCost)}
                        </div>
                        <button
                          onClick={() => onOpenCalcModal(unit)}
                          className="text-[11px] text-content-muted hover:text-accent underline cursor-pointer"
                        >
                          View Breakdown
                        </button>
                      </td>

                      <td className="p-3.5">
                        <HallmarkStamp
                          type="rera"
                          code={unit.project?.reraNumber}
                          label="Format checked"
                          size="sm"
                        />
                      </td>

                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${
                            isFresh
                              ? 'bg-status-success-surface text-status-success border-status-success/30'
                              : 'bg-status-danger-surface text-status-danger border-status-danger/30 animate-pulse'
                          }`}
                        >
                          {isFresh ? `Updated ${daysAgo}d ago` : `Stale: ${daysAgo}d old`}
                        </span>
                      </td>

                      <td className="p-3.5 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              onInspectUnit(
                                unit,
                                unit.project || allProjects.find((p) => p.id === unit.projectId)
                              )
                            }
                            aria-label={`Inspect ${unit.project?.projectName} specifications for Unit ${unit.unitNumber}`}
                            title="Inspect Unit & Building Specs"
                            className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-surface text-content-secondary hover:text-accent hover:border-accent/40 shadow-2xs transition-all"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditUnit(unit)}
                            aria-label={`Edit unit ${unit.unitNumber || 'record'}`}
                            title="Edit unit"
                            className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-surface text-content-secondary hover:text-content shadow-2xs transition-all cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onDeleteUnit({
                                id: unit.id,
                                unitNumber: unit.unitNumber || 'Unit',
                                projectName: unit.project?.projectName || 'Project',
                              })
                            }
                            aria-label={`Delete unit ${unit.unitNumber || 'record'}`}
                            title="Delete property unit"
                            className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-surface text-content-secondary hover:text-status-danger hover:border-status-danger/30 hover:bg-status-danger-surface shadow-2xs transition-all cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenVerifyModal(unit)}
                            className="rounded-xl bg-surface hover:bg-surface-subtle px-3 py-1.5 text-xs font-bold text-accent-text border border-border hover:border-accent/40 shadow-2xs transition-all cursor-pointer"
                          >
                            Record Update
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredUnits.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8">
                      <EmptyState
                        type="filter"
                        title="No Units Found"
                        description="No property units match the selected filters or search keyword. Try clearing filters or selecting another project."
                        actionLabel="Clear Filters"
                        onAction={onResetFilters}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CARD GRID VIEW */}
      {viewMode === 'cards' &&
        (filteredUnits.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredUnits.map((unit) => {
              return (
                <div
                  key={unit.id}
                  className="p-5 rounded-2xl bg-surface border border-border shadow-xs space-y-3 font-sans text-xs hover:border-accent/40 transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-content text-base font-display">
                        {unit.project?.projectName}
                      </h3>
                      <p className="text-xs text-content-muted mt-0.5">
                        Unit {unit.unitNumber} ({unit.bhk} BHK • {unit.carpetAreaSqft} sqft)
                      </p>
                    </div>
                    <HallmarkStamp type="rera" code={unit.project?.reraNumber} size="sm" />
                  </div>
                  <div className="pt-3 border-t border-border flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-content-muted uppercase font-semibold block">
                        Total All-In Cost
                      </span>
                      <strong className="text-content text-sm font-bold font-mono">
                        {formatINR(unit.allInTotalCost)}
                      </strong>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          onInspectUnit(
                            unit,
                            unit.project || allProjects.find((p) => p.id === unit.projectId)
                          )
                        }
                        aria-label={`Inspect ${unit.project?.projectName} specifications for Unit ${unit.unitNumber}`}
                        title="Inspect Unit & Building Specs"
                        className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-surface text-content-secondary hover:text-accent hover:border-accent/40 shadow-2xs transition-all cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditUnit(unit)}
                        aria-label={`Edit unit ${unit.unitNumber || 'record'}`}
                        title="Edit unit"
                        className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-surface text-content-secondary hover:text-content shadow-2xs transition-all cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onDeleteUnit({
                            id: unit.id,
                            unitNumber: unit.unitNumber || 'Unit',
                            projectName: unit.project?.projectName || 'Project',
                          })
                        }
                        aria-label={`Delete unit ${unit.unitNumber || 'record'}`}
                        title="Delete property unit"
                        className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-surface text-content-secondary hover:text-status-danger hover:border-status-danger/30 hover:bg-status-danger-surface shadow-2xs transition-all cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenVerifyModal(unit)}
                        className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-subtle text-accent-text border border-border hover:border-accent/40 font-bold text-xs shadow-2xs transition-all cursor-pointer"
                      >
                        Record Update
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center bg-surface rounded-2xl border border-border text-content-muted text-xs">
            No property units match the current criteria.
          </div>
        ))}
    </section>
  );
}
