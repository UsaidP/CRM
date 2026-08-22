'use client';

import React, { useState } from 'react';
import { 
  Globe, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Layers, 
  Building2, 
  RefreshCw,
  ImageIcon,
  Sparkles,
  MapPin,
  Check
} from 'lucide-react';
import { type NaviMumbaiNode } from '@/lib/domain/property-scraper';

interface ScraperControlModalProps {
  onClose: () => void;
  onIngestSuccess: () => void;
}

export function ScraperControlModal({
  onClose,
  onIngestSuccess,
}: ScraperControlModalProps) {
  const [selectedNode, setSelectedNode] = useState<NaviMumbaiNode>('ALL');
  const [isScraping, setIsScraping] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRunScraper = async () => {
    setIsScraping(true);
    setResultMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/v1/inventory/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetNode: selectedNode }),
      });

      const data = await res.json();
      if (data.success) {
        setResultMsg(data.message);
        setTimeout(() => {
          onIngestSuccess();
        }, 1200);
      } else {
        setErrorMsg(data.error || 'Failed to scrape property data.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error while running scraper.');
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-surface rounded-2xl border border-border-strong shadow-2xl flex flex-col overflow-hidden text-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="scraper-modal-title"
      >
        {/* Header */}
        <div className="p-5 border-b border-border bg-surface-raised flex items-start justify-between">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-accent-soft border border-accent/30 rounded-xl text-accent">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 id="scraper-modal-title" className="text-lg font-bold text-content font-display">
                  MahaRERA & Portal Web Scraper
                </h2>
                <span className="badge-cobalt">
                  Automated Pipeline
                </span>
              </div>
              <p className="text-xs text-content-muted mt-0.5">
                Ingest verified project shells, building specs, and floor plans directly from MahaRERA & portal cards.
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

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          
          {/* Target Micro-Market Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-content flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-accent" /> Select Target Corridor / Node:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'ALL', label: 'All Nodes', sub: 'Kharghar & Taloja' },
                { id: 'KHARGHAR', label: 'Kharghar', sub: 'Sectors 10-37' },
                { id: 'TALOJA_PHASE_1', label: 'Taloja Phase 1', sub: 'Metro Corridor' },
                { id: 'TALOJA_PHASE_2', label: 'Taloja Phase 2', sub: 'Sector 26 Ext' },
              ].map((node) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => setSelectedNode(node.id as NaviMumbaiNode)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedNode === node.id
                      ? 'bg-accent-soft border-accent text-accent-text shadow-md'
                      : 'bg-surface-raised border-border text-content-muted hover:border-border-strong hover:text-content'
                  }`}
                >
                  <div className="text-xs font-bold">{node.label}</div>
                  <div className="text-[10px] text-content-muted mt-0.5">{node.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Strict Media Rule Banner */}
          <div className="p-4 bg-surface-raised border border-border-strong rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-accent">
              <ImageIcon className="w-4 h-4" />
              <span>Strict Media Sanitization Rule Active</span>
            </div>
            <p className="text-[11px] text-content-muted leading-relaxed">
              In accordance with your quality directive, all interior bedroom, living room, and kitchen staging photos will be automatically excluded. Only <strong>architectural elevations</strong>, <strong>facade renders</strong>, and <strong>floor plans / master layouts</strong> will be retained.
            </p>
            <div className="flex items-center gap-3 pt-1 text-[11px] font-mono text-status-success">
              <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Tower Elevations</span>
              <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Layout Blueprints</span>
              <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Area Matrix (Sqm/Sqft)</span>
            </div>
          </div>

          {/* Success Banner */}
          {resultMsg && (
            <div className="p-3.5 bg-status-success-surface border border-status-success/40 rounded-xl text-status-success text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-status-success shrink-0" />
              <span>{resultMsg}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3.5 bg-status-danger-surface border border-status-danger/40 rounded-xl text-status-danger text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-status-danger shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-surface-raised flex items-center justify-between">
          <div className="text-xs text-content-muted flex items-center gap-1.5 font-mono">
            <ShieldCheck className="w-4 h-4 text-status-success" />
            <span>MahaRERA verified data with 0% GST Ready OC detection.</span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="btn-secondary px-4 py-2 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleRunScraper}
              disabled={isScraping}
              className="btn-cobalt px-5 py-2 text-xs font-bold flex items-center gap-2"
            >
              {isScraping ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Scraping & Ingesting...
                </>
              ) : (
                <>
                  <Globe className="w-3.5 h-3.5" /> Run Scraper ({selectedNode})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
