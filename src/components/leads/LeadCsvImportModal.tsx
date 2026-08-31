'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  Download, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Users, 
  Phone, 
  ArrowRight,
  Filter,
  RefreshCw,
  Sparkles,
  MapPin,
  Check,
  UserCheck,
  FileText,
  Layers,
  FileCode,
  SlidersHorizontal,
  ChevronDown,
  MessageSquare,
  Building2,
  Database,
  FileCheck2
} from 'lucide-react';
import { 
  parseExcelBuffer, 
  parseDelimitedText, 
  parseJSONContent,
  parseHTMLTable,
  parseUnstructuredText,
  parseUniversalLeadData,
  type FileParseResult 
} from '@/lib/domain/lead-file-parser';
import { type ColumnMapping, STAGE_DISPLAY_NAMES } from '@/lib/domain/lead-auto-adjuster';

interface LeadCsvImportModalProps {
  onClose: () => void;
  onImportSuccess: () => void;
  initialFile?: File | null;
}

const STAGE_OPTIONS = [
  { value: 'AUTO', label: '⚡ Auto-Detect per row (Recommended)' },
  { value: 'new_uncontacted', label: '🟢 New / Uncontacted' },
  { value: 'discovery_call', label: '📞 Discovery Call' },
  { value: 'portal_shared', label: '📱 Portal Shared' },
  { value: 'visit_scheduled', label: '🚗 Site Visit Scheduled' },
  { value: 'visit_done', label: '✅ Site Visit Done' },
  { value: 'revisit_scheduled', label: '🔄 Re-Visit Scheduled' },
  { value: 'negotiation_token', label: '🤝 Negotiation / Token' },
  { value: 'under_registration', label: '📝 Under Registration' },
  { value: 'closed_won', label: '🏆 Closed Won' },
  { value: 'on_hold_nurture', label: '⏳ On Hold / Nurture' },
  { value: 'closed_lost', label: '❌ Closed Lost' },
];

export function LeadCsvImportModal({
  onClose,
  onImportSuccess,
  initialFile = null,
}: LeadCsvImportModalProps) {
  const [rawText, setRawText] = useState('');
  const [binaryBuffer, setBinaryBuffer] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState<string>('raw');
  const [selectedSheetIndex, setSelectedSheetIndex] = useState(0);
  const [customMapping, setCustomMapping] = useState<ColumnMapping>({});
  const [defaultStage, setDefaultStage] = useState('AUTO');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'mapping'>('preview');
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const [parseResult, setParseResult] = useState<FileParseResult | null>(null);

  const processFile = async (file: File) => {
    setFileName(file.name);
    setErrorMsg(null);
    setSelectedSheetIndex(0);

    const name = file.name.toLowerCase();
    if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.xlsm') || name.endsWith('.xlsb') || name.endsWith('.ods')) {
      setFileType('xlsx');
      const buffer = await file.arrayBuffer();
      setBinaryBuffer(buffer);
      setRawText('');
    } else {
      const ext = name.split('.').pop() || 'txt';
      setFileType(ext);
      const text = await file.text();
      setRawText(text);
      setBinaryBuffer(null);
    }
  };

  useEffect(() => {
    if (initialFile) {
      processFile(initialFile);
    }
  }, [initialFile]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await processFile(file);
    } else {
      const text = e.dataTransfer.getData('text');
      if (text) {
        setRawText(text);
        setBinaryBuffer(null);
        setFileName('Pasted / Dropped Content');
        setFileType('text');
      }
    }
  };

  // Re-run universal parser whenever text, buffer, sheetIndex, or customMapping changes
  useEffect(() => {
    if (binaryBuffer) {
      const res = parseExcelBuffer(
        binaryBuffer, 
        Object.keys(customMapping).length > 0 ? customMapping : undefined,
        selectedSheetIndex
      );
      setParseResult(res);
    } else if (rawText.trim()) {
      const res = parseUniversalLeadData(
        rawText,
        fileType,
        Object.keys(customMapping).length > 0 ? customMapping : undefined,
        selectedSheetIndex
      );
      setParseResult(res);
    } else {
      setParseResult(null);
    }
  }, [rawText, binaryBuffer, selectedSheetIndex, customMapping, fileType]);

  const handleImportSubmit = async () => {
    if (!rawText.trim() && !binaryBuffer) {
      setErrorMsg('Please upload or drop any lead file (Excel, CSV, TSV, TXT, JSON, HTML), or paste lead text.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      let bodyData: any = {
        mapping: Object.keys(customMapping).length > 0 ? customMapping : undefined,
        defaultStage: defaultStage !== 'AUTO' ? defaultStage : undefined,
      };

      if (binaryBuffer) {
        // Convert arrayBuffer to base64
        const bytes = new Uint8Array(binaryBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        bodyData.base64Data = btoa(binary);
        bodyData.fileType = 'xlsx';
        bodyData.sheetIndex = selectedSheetIndex;
      } else {
        bodyData.content = rawText;
        bodyData.fileType = fileType;
      }

      const res = await fetch('/api/v1/leads/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessResult(data);
        onImportSuccess();
        setTimeout(() => {
          onClose();
        }, 1400);
      } else {
        setErrorMsg(data.error || 'Failed to import lead records.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error while importing leads.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStageBadgeClass = (stageKey: string) => {
    switch (stageKey) {
      case 'closed_won':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30';
      case 'closed_lost':
        return 'bg-rose-500/10 text-rose-500 border-rose-500/30';
      case 'negotiation_token':
      case 'under_registration':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'visit_scheduled':
      case 'visit_done':
      case 'revisit_scheduled':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'discovery_call':
      case 'portal_shared':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'on_hold_nurture':
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div 
        className={`relative w-full max-w-5xl max-h-[92vh] bg-surface rounded-3xl border ${isDraggingOver ? 'border-accent shadow-accent/20' : 'border-border'} shadow-2xl flex flex-col overflow-hidden text-content font-sans transition-all`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-import-modal-title"
      >
        {/* Drag Overlay visual indicator */}
        {isDraggingOver && (
          <div className="absolute inset-0 z-50 bg-accent-soft/80 backdrop-blur-xs border-2 border-dashed border-accent flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-150">
            <UploadCloud className="w-16 h-16 text-accent animate-bounce mb-3" />
            <span className="text-xl font-extrabold text-content font-display">Drop File to Auto-Adjust Leads</span>
            <span className="text-sm text-content-secondary mt-1">Excel (.xlsx/.xls), CSV, TSV, JSON, HTML, or Text</span>
          </div>
        )}

        {/* Header */}
        <div className="p-5 md:p-6 border-b border-border bg-surface-subtle flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-accent-soft border border-accent/20 rounded-2xl text-accent shadow-2xs">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 id="lead-import-modal-title" className="text-lg md:text-xl font-extrabold text-content font-display tracking-tight">
                  Universal Multi-Format Lead Importer &amp; Engine
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-accent-soft text-accent-text border border-accent/20">
                  Drop-In Any File
                </span>
              </div>
              <p className="text-xs text-content-secondary mt-1 max-w-2xl font-medium">
                Drop or paste <strong>any file format</strong> (Excel, CSV, TSV, JSON, HTML tables, WhatsApp logs, or Key-Value blocks). Auto-normalizes Indian numbers (+91), Lakhs/Cr budgets, micro-markets, and pipeline stages.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-content-muted hover:text-content hover:bg-surface border border-transparent hover:border-border transition-all cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Bar & Controls */}
        <div className="px-6 py-3 bg-surface border-b border-border flex items-center justify-between flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-accent text-white shadow-xs'
                  : 'bg-surface-subtle text-content-secondary hover:text-content hover:bg-surface border border-border'
              }`}
            >
              Adjusted Preview {parseResult && `(${parseResult.leads.length})`}
            </button>
            {parseResult && parseResult.headers.length > 0 && (
              <button
                onClick={() => setActiveTab('mapping')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'mapping'
                    ? 'bg-accent text-white shadow-xs'
                    : 'bg-surface-subtle text-content-secondary hover:text-content hover:bg-surface border border-border'
                }`}
              >
                Column Mapping ({Object.keys(parseResult.mapping).length} detected)
              </button>
            )}
            {parseResult?.detectedFormat && (
              <span className="px-2.5 py-1 rounded-lg bg-status-success-surface border border-status-success/30 text-[11px] font-mono font-bold text-status-success">
                Format: {parseResult.detectedFormat}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Target Stage Override Selector */}
            <div className="flex items-center gap-1.5 bg-surface-subtle border border-border rounded-xl px-2.5 py-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-accent shrink-0" />
              <span className="text-[11px] font-bold text-content-muted">Target Stage:</span>
              <select
                value={defaultStage}
                onChange={(e) => setDefaultStage(e.target.value)}
                className="text-xs font-bold text-content bg-transparent border-0 focus:outline-none cursor-pointer pr-1"
              >
                {STAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-surface text-content">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sheet Selector if Excel has multiple sheets */}
            {parseResult?.sheetNames && parseResult.sheetNames.length > 1 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-content-muted">Sheet:</span>
                <select
                  value={selectedSheetIndex}
                  onChange={(e) => setSelectedSheetIndex(parseInt(e.target.value, 10))}
                  className="px-2.5 py-1 text-xs font-bold text-content select-theme rounded-lg"
                >
                  {parseResult.sheetNames.map((sheet, idx) => (
                    <option key={sheet} value={idx}>{sheet}</option>
                  ))}
                </select>
              </div>
            )}

            <a
              href="/api/v1/leads/template.csv"
              download="zamzam_leads_import_template.csv"
              className="px-3.5 py-1.5 rounded-xl bg-surface hover:bg-surface-subtle border border-border hover:border-accent text-content hover:text-accent font-bold transition-all flex items-center gap-1.5 shadow-2xs text-xs"
            >
              <Download className="w-3.5 h-3.5" /> Template
            </a>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(92vh-230px)] space-y-5">
          
          {/* Upload & Drop Area */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="border-2 border-dashed border-border hover:border-accent bg-surface-subtle/40 hover:bg-accent-soft/10 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all text-center group shadow-2xs hover:shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-surface border border-border group-hover:border-accent/40 flex items-center justify-center text-accent mb-3 shadow-2xs group-hover:scale-105 transition-transform">
                <UploadCloud className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-content group-hover:text-accent transition-colors">
                {fileName ? `Selected: ${fileName}` : 'Drop Any Lead File or Click to Browse'}
              </span>
              <span className="text-[11px] text-content-muted mt-1">
                Supports <strong>.xlsx</strong>, <strong>.xls</strong>, <strong>.csv</strong>, <strong>.tsv</strong>, <strong>.json</strong>, <strong>.html</strong>, <strong>.txt</strong>
              </span>
              <input 
                type="file" 
                accept=".xlsx,.xls,.xlsm,.xlsb,.csv,.tsv,.txt,.json,.html,.htm,text/csv,text/plain,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" 
                onChange={handleFileUpload} 
                className="hidden" 
              />
            </label>

            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                <span className="text-xs font-bold text-content">Or Paste Unstructured Text / Chat Logs:</span>
                
                {/* Format Presets Dropdown */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const sampleText = `Full Name\tMobile Number\tEmail\tBudget\tBHK\tPreferred Location\tLead Stage\tSource\tRemarks
Amitabh Verma\t09820123456\tamitabh.verma@barclays.com\t65L to 80L\t2 BHK\tKharghar Sector 35\tNew Lead\tYouTube\tLooking for 2 BHK near Metro with hill view
Pooja Nair\t9819054321\tpooja.nair@example.com\t1.25 Cr\t3 BHK\tKharghar Sector 36\tSite Visit Scheduled\tInstagram\tInterested in Sai World Empire luxury township
Rajesh Kulkarni\t+91 9820098765\trajesh.k@example.com\t45-55 Lakhs\t1 or 2 BHK\tTaloja Phase 1\tDiscovery Call\tWhatsApp\tBudget buyer looking for Lodha Crown or near Metro
Sneha Deshmukh\t9967712345\tsneha.deshmukh@tcs.com\t75 Lacs\t2 BHK\tKharghar Sector 20\tNegotiation\tDirect Call\tNeeds OC received flat near Central Park Boulevard
Vikramaditya Rao\t9769011223\tvikram.rao@example.com\t1.8 Cr\t3 BHK\tUpper Kharghar\tPortal Shared\tMeta Ads\tHigh floor requirement in Adhiraj Capital City`;
                      setRawText(sampleText);
                      setBinaryBuffer(null);
                      setFileName('Sample Leads (TSV/Excel)');
                      setFileType('tsv');
                      setErrorMsg(null);
                    }}
                    className="text-[10px] font-bold text-accent hover:underline flex items-center gap-1 cursor-pointer bg-accent-soft/40 px-2 py-0.5 rounded-lg border border-accent/20"
                  >
                    <Sparkles className="w-2.5 h-2.5" /> Sample TSV
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const waText = `[27/08/26, 2:30:15 PM] +91 9820445566: Hi Safwan, saw your Sai World Empire video. Looking for 3 BHK in Kharghar Sector 36, budget around 1.5 Cr. Can we schedule a site visit for Saturday?
[27/08/26, 3:15:20 PM] +91 9819998877: Amit Verma here from Barclays. Need 2 BHK in Taloja Phase 1 under 55 Lakhs near Metro station.
[27/08/26, 4:45:00 PM] +91 9967712345: Sneha Deshmukh - interested in Balaji Symphony 2 BHK ready to move. Budget 75L.`;
                      setRawText(waText);
                      setBinaryBuffer(null);
                      setFileName('WhatsApp Chat Export');
                      setFileType('txt');
                      setErrorMsg(null);
                    }}
                    className="text-[10px] font-bold text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20"
                  >
                    <MessageSquare className="w-2.5 h-2.5" /> WhatsApp Log
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const kvText = `Name: Dr. Anil Deshpande
Phone: 9820011223
Email: anil.deshpande@apollo.com
Budget: 2.2 Cr
BHK: 3 BHK + Study
Location: Kharghar Sector 37
Stage: Discovery Call
Source: 99acres
Remarks: Senior surgeon at Apollo, looking for high floor duplex

---

Name: Farhan Qureshi
Phone: 9819022334
Email: farhan.q@gmail.com
Budget: 60 Lakhs
BHK: 1 BHK
Location: Taloja Phase 2 Sector 26
Stage: Site Visit Scheduled
Source: Meta Ads
Remarks: 1st time homebuyer looking for G+14 tower`;
                      setRawText(kvText);
                      setBinaryBuffer(null);
                      setFileName('Key-Value Formatted Data');
                      setFileType('txt');
                      setErrorMsg(null);
                    }}
                    className="text-[10px] font-bold text-purple-400 hover:underline flex items-center gap-1 cursor-pointer bg-purple-500/10 px-2 py-0.5 rounded-lg border border-purple-500/20"
                  >
                    <FileCode className="w-2.5 h-2.5" /> Key-Value
                  </button>
                </div>
              </div>
              <textarea
                value={rawText}
                onChange={(e) => {
                  setRawText(e.target.value);
                  setBinaryBuffer(null);
                  setFileName('');
                  setErrorMsg(null);
                }}
                placeholder="Paste any Excel rows, CSV, TSV, JSON, HTML tables, WhatsApp logs, or Key-Value text blocks here..."
                className="w-full flex-1 min-h-[120px] p-3 rounded-xl bg-surface border border-border font-mono text-[11px] text-content placeholder:text-content-muted focus:outline-none focus:border-accent transition-all"
              />
            </div>
          </div>

          {/* Stats Bar if Parsed */}
          {parseResult && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-surface-subtle border border-border rounded-xl flex items-center gap-3">
                <div className="p-2 rounded-lg bg-surface text-content font-bold text-sm">
                  {parseResult.totalRows}
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-content-muted block">Total Records</span>
                  <span className="text-xs font-extrabold text-content">Parsed Leads</span>
                </div>
              </div>

              <div className="p-3 bg-status-success-surface/50 border border-status-success/30 rounded-xl flex items-center gap-3">
                <div className="p-2 rounded-lg bg-status-success-surface text-status-success font-bold text-sm">
                  {parseResult.readyCount}
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-status-success block">100% Ready</span>
                  <span className="text-xs font-extrabold text-content">Clean Auto-Adjusted</span>
                </div>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-500 font-bold text-sm">
                  {parseResult.warningCount}
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500 block">Warnings</span>
                  <span className="text-xs font-extrabold text-content">Auto-Fixed / Partial</span>
                </div>
              </div>

              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rose-500/20 text-rose-500 font-bold text-sm">
                  {parseResult.invalidCount}
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-rose-500 block">Invalid Rows</span>
                  <span className="text-xs font-extrabold text-content">Skipped on Import</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 1: Preview Table */}
          {activeTab === 'preview' && parseResult && parseResult.leads.length > 0 && (
            <div className="border border-border rounded-2xl overflow-hidden bg-surface shadow-2xs">
              <div className="p-3 bg-surface-subtle border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-accent" />
                  <span className="text-xs font-bold text-content">Auto-Adjusted Lead Preview</span>
                </div>
                <span className="text-[11px] text-content-muted font-medium">
                  Showing {Math.min(parseResult.leads.length, 100)} of {parseResult.leads.length} rows
                </span>
              </div>

              <div className="overflow-x-auto max-h-[340px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-surface-subtle border-b border-border z-10">
                    <tr>
                      <th className="py-2.5 px-3 font-extrabold text-content-secondary uppercase text-[10px] tracking-wider">Status</th>
                      <th className="py-2.5 px-3 font-extrabold text-content-secondary uppercase text-[10px] tracking-wider">Prospect Name</th>
                      <th className="py-2.5 px-3 font-extrabold text-content-secondary uppercase text-[10px] tracking-wider">Mobile (E.164)</th>
                      <th className="py-2.5 px-3 font-extrabold text-content-secondary uppercase text-[10px] tracking-wider">Assigned Stage</th>
                      <th className="py-2.5 px-3 font-extrabold text-content-secondary uppercase text-[10px] tracking-wider">Budget</th>
                      <th className="py-2.5 px-3 font-extrabold text-content-secondary uppercase text-[10px] tracking-wider">BHK</th>
                      <th className="py-2.5 px-3 font-extrabold text-content-secondary uppercase text-[10px] tracking-wider">Micro-Market</th>
                      <th className="py-2.5 px-3 font-extrabold text-content-secondary uppercase text-[10px] tracking-wider">Assigned Broker</th>
                      <th className="py-2.5 px-3 font-extrabold text-content-secondary uppercase text-[10px] tracking-wider">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {parseResult.leads.map((lead, idx) => {
                      const resolvedStage = defaultStage !== 'AUTO' ? defaultStage : lead.stage;
                      const resolvedStageName = STAGE_DISPLAY_NAMES[resolvedStage] || lead.stageFormatted || 'New Lead';

                      return (
                        <tr key={idx} className="hover:bg-surface-subtle/50 transition-colors">
                          <td className="py-2.5 px-3">
                            {lead.status === 'READY' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3" /> Ready
                              </span>
                            ) : lead.status === 'WARNING' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30">
                                <AlertTriangle className="w-3 h-3" /> Adjusted
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/30">
                                <X className="w-3 h-3" /> Invalid
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-content">{lead.fullName}</td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-content">{lead.phoneE164 || lead.phoneValidation?.rawInput || '—'}</td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${getStageBadgeClass(resolvedStage)}`}>
                              {resolvedStageName}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-content">{lead.budgetFormatted}</td>
                          <td className="py-2.5 px-3 text-content-secondary">{lead.bhkPreferences.map((b) => `${b} BHK`).join(', ')}</td>
                          <td className="py-2.5 px-3 text-content">{lead.microMarket}</td>
                          <td className="py-2.5 px-3">
                            <span className="text-[11px] font-semibold text-accent">{lead.assignedBrokerName}</span>
                          </td>
                          <td className="py-2.5 px-3 text-content-muted text-[11px]">{lead.leadSource}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 2: Column Mapping */}
          {activeTab === 'mapping' && parseResult && (
            <div className="border border-border rounded-2xl p-5 bg-surface space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-content">Auto-Detected Column Mapping</h3>
                  <p className="text-xs text-content-secondary">Map your spreadsheet columns to CRM Lead Fields</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCustomMapping({})}
                  className="text-xs font-bold text-accent hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reset to Auto-Detected
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { key: 'fullName', label: 'Full Name' },
                  { key: 'phone', label: 'Mobile / Phone' },
                  { key: 'email', label: 'Email Address' },
                  { key: 'stage', label: 'Pipeline Stage / Status' },
                  { key: 'budget', label: 'Budget' },
                  { key: 'bhk', label: 'BHK Preference' },
                  { key: 'location', label: 'Micro-Market / Location' },
                  { key: 'source', label: 'Lead Source' },
                  { key: 'campaign', label: 'Campaign' },
                  { key: 'notes', label: 'Remarks / Notes' },
                  { key: 'possession', label: 'Possession Timeline' },
                ].map((field) => (
                  <div key={field.key} className="space-y-1">
                    <label className="text-[11px] font-bold text-content-secondary block">
                      {field.label}
                    </label>
                    <select
                      value={customMapping[field.key as keyof ColumnMapping] || parseResult.mapping[field.key as keyof ColumnMapping] || ''}
                      onChange={(e) => {
                        setCustomMapping((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }));
                      }}
                      className="w-full px-3 py-2 text-xs font-semibold text-content select-theme rounded-xl border border-border bg-surface-subtle"
                    >
                      <option value="">-- Skip / Auto-Infer --</option>
                      {parseResult.headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Message */}
          {successResult && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successResult.message}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 md:p-6 border-t border-border bg-surface-subtle flex items-center justify-between flex-wrap gap-4">
          <div className="text-xs text-content-secondary font-medium flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Auto-deduplicates by Phone (E.164) &amp; Email. Zero orphan leads.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-content hover:bg-surface transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={handleImportSubmit}
              disabled={isSubmitting || !parseResult || parseResult.leads.length === 0}
              className="px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-extrabold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Building &amp; Importing Leads...
                </>
              ) : (
                <>
                  <FileCheck2 className="w-4 h-4" />
                  Build &amp; Ingest {parseResult ? `${parseResult.readyCount + parseResult.warningCount} Leads` : 'All Leads'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
