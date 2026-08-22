'use client';

import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Download, 
  Layers, 
  Filter, 
  Building2, 
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import { parseProjectsCSV, type ParsedProjectRow } from '@/lib/domain/inventory-csv-parser';

interface CsvImportModalProps {
  onClose: () => void;
  onImportSuccess: () => void;
}

export function CsvImportModal({
  onClose,
  onImportSuccess,
}: CsvImportModalProps) {
  const [csvText, setCsvText] = useState('');
  const [requireProjectFilter, setRequireProjectFilter] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    message: string;
    stats?: {
      createdCount: number;
      updatedCount: number;
      filteredOutBrokerListings: number;
    };
  } | null>(null);
  const [preview, setPreview] = useState<{
    totalRows: number;
    validProjects: number;
    filteredOutCount: number;
    projects: ParsedProjectRow[];
  } | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setCsvText(text);

      const parsed = parseProjectsCSV(text, requireProjectFilter);
      if (parsed.errors.length > 0 && parsed.projects.length === 0) {
        setErrorMsg(parsed.errors.join(', '));
        setPreview(null);
      } else {
        setPreview({
          totalRows: parsed.totalRows,
          validProjects: parsed.projects.length,
          filteredOutCount: parsed.filteredOutCount,
          projects: parsed.projects,
        });
      }
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = async () => {
    if (!csvText.trim()) {
      setErrorMsg('Please upload or paste CSV data first.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessResult(null);

    try {
      const res = await fetch('/api/v1/inventory/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvData: csvText,
          requireProjectCardType: requireProjectFilter,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessResult(data);
        setTimeout(() => {
          onImportSuccess();
        }, 1500);
      } else {
        setErrorMsg(data.error || 'Failed to import CSV.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error while importing CSV.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl max-h-[92vh] bg-surface rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden text-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="csv-import-modal-title"
      >
        {/* Header */}
        <div className="p-5 border-b border-border bg-surface-raised flex items-start justify-between">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-accent-soft border border-accent/30 rounded-xl text-accent">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 id="csv-import-modal-title" className="text-lg font-bold text-content font-display">
                  Bulk CSV Project Shells Importer
                </h2>
                <span className="badge-cobalt">
                  99acres &amp; MahaRERA
                </span>
              </div>
              <p className="text-xs text-content-muted mt-0.5">
                Import master developer project cards into your CRM with automatic RERA ID deduplication and anti-pollution filters.
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

        {/* Action Bar & Template Download */}
        <div className="px-6 py-3 bg-surface-subtle border-b border-border-subtle flex items-center justify-between flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-content font-medium select-none">
              <input
                type="checkbox"
                checked={requireProjectFilter}
                onChange={(e) => setRequireProjectFilter(e.target.checked)}
                className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
              />
              <span className="flex items-center gap-1.5 text-content-secondary">
                <Filter className="w-3.5 h-3.5 text-accent" />
                Anti-Pollution: Filter only <code className="px-1 py-0.5 bg-surface-inset rounded text-[11px] font-mono text-accent-text">cardType: project</code> (Strips broker spam)
              </span>
            </label>
          </div>

          <a
            href="/api/v1/inventory/template.csv"
            download="zamzam_kharghar_taloja_projects_template.csv"
            className="btn-secondary px-3 py-1.5 text-xs font-medium flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Download Template CSV
          </a>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(92vh-220px)] space-y-5">
          
          {/* Upload Area */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="border-2 border-dashed border-border hover:border-accent bg-surface-raised/50 hover:bg-surface-raised rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all text-center">
              <UploadCloud className="w-8 h-8 text-accent mb-2" />
              <span className="text-xs font-bold text-content">
                {fileName ? `Selected: ${fileName}` : 'Choose CSV File from Laptop'}
              </span>
              <span className="text-[11px] text-content-muted mt-1">
                Drag &amp; drop or click to browse (.csv format from 99acres / Apify / MahaRERA)
              </span>
              <input 
                type="file" 
                accept=".csv,text/csv" 
                onChange={handleFileUpload} 
                className="hidden" 
              />
            </label>

            <div className="flex flex-col">
              <span className="text-xs font-bold text-content mb-1.5">Or Paste Raw CSV Data:</span>
              <textarea
                value={csvText}
                onChange={(e) => {
                  setCsvText(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="cardType,Project Name,MahaRERA ID,Builder Name,Micro-Market,Address,Possession Date..."
                className="w-full flex-1 min-h-[110px] p-3 rounded-xl bg-surface-inset border border-border font-mono text-[11px] text-content placeholder:text-content-muted focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Success Banner */}
          {successResult && (
            <div className="p-4 bg-status-success-surface border border-status-success/40 rounded-xl text-status-success text-xs space-y-1">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 text-status-success" />
                {successResult.message}
              </div>
              <div className="text-[11px] font-mono pl-6">
                Created: {successResult.stats?.createdCount} • Updated: {successResult.stats?.updatedCount} • Filtered Broker Spam: {successResult.stats?.filteredOutBrokerListings}
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3.5 bg-status-danger-surface border border-status-danger/40 rounded-xl text-status-danger text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-status-danger shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Preview Table */}
          {preview && preview.projects.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-content uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-accent" />
                  <span>Parsed Project Shells Preview ({preview.projects.length} valid)</span>
                </div>
                {preview.filteredOutCount > 0 && (
                  <span className="text-[11px] font-mono text-accent-text bg-accent-soft px-2.5 py-0.5 rounded border border-accent/30">
                    {preview.filteredOutCount} broker resale rows filtered out
                  </span>
                )}
              </div>

              <div className="border border-border rounded-xl overflow-hidden bg-surface-raised">
                <div className="max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-surface sticky top-0 border-b border-border text-[11px] font-semibold text-content-muted uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Project Name</th>
                        <th className="py-2.5 px-3">MahaRERA ID</th>
                        <th className="py-2.5 px-3">Builder</th>
                        <th className="py-2.5 px-3">Micro-Market</th>
                        <th className="py-2.5 px-3">Towers/Floors</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {preview.projects.slice(0, 10).map((p, idx) => (
                        <tr key={idx} className="hover:bg-surface/50">
                          <td className="py-2 px-3 font-semibold text-content">{p.projectName}</td>
                          <td className="py-2 px-3 font-mono text-accent-text font-bold">{p.reraNumber}</td>
                          <td className="py-2 px-3 text-content-muted">{p.developerName}</td>
                          <td className="py-2 px-3 text-content">{p.microMarket}</td>
                          <td className="py-2 px-3 font-mono text-content-muted">{p.totalTowers}T / {p.totalFloors}F</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {preview.projects.length > 10 && (
                  <div className="p-2 text-center text-[11px] text-content-muted border-t border-border-subtle bg-surface/40">
                    + {preview.projects.length - 10} more projects ready to import
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-surface-raised flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-content-muted flex items-center gap-1.5 font-mono">
            <ShieldCheck className="w-4 h-4 text-status-success shrink-0" />
            <span>MahaRERA ID is used as the unique Idempotency Key to prevent duplicate project entries.</span>
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="btn-secondary w-full sm:w-auto px-4 py-2 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleImportSubmit}
              disabled={isSubmitting || !csvText.trim()}
              className="btn-cobalt w-full sm:w-auto px-5 py-2 text-xs font-bold flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Ingesting to CRM...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Bulk Import Project Shells
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
