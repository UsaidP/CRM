'use client';

import React, { useState, useEffect } from 'react';
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
  FileCode
} from 'lucide-react';
import { 
  parseExcelBuffer, 
  parseDelimitedText, 
  parseJSONContent, 
  type FileParseResult 
} from '@/lib/domain/lead-file-parser';
import { type ColumnMapping } from '@/lib/domain/lead-auto-adjuster';

interface LeadCsvImportModalProps {
  onClose: () => void;
  onImportSuccess: () => void;
}

export function LeadCsvImportModal({
  onClose,
  onImportSuccess,
}: LeadCsvImportModalProps) {
  const [rawText, setRawText] = useState('');
  const [binaryBuffer, setBinaryBuffer] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState<'csv' | 'xlsx' | 'tsv' | 'txt' | 'json' | 'raw'>('raw');
  const [selectedSheetIndex, setSelectedSheetIndex] = useState(0);
  const [customMapping, setCustomMapping] = useState<ColumnMapping>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'mapping'>('preview');

  const [parseResult, setParseResult] = useState<FileParseResult | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setErrorMsg(null);
    setSelectedSheetIndex(0);

    const name = file.name.toLowerCase();
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      setFileType('xlsx');
      const buffer = await file.arrayBuffer();
      setBinaryBuffer(buffer);
      setRawText('');
    } else if (name.endsWith('.json')) {
      setFileType('json');
      const text = await file.text();
      setRawText(text);
      setBinaryBuffer(null);
    } else if (name.endsWith('.tsv')) {
      setFileType('tsv');
      const text = await file.text();
      setRawText(text);
      setBinaryBuffer(null);
    } else {
      setFileType('csv');
      const text = await file.text();
      setRawText(text);
      setBinaryBuffer(null);
    }
  };

  // Re-run parser whenever text, buffer, sheetIndex, or customMapping changes
  useEffect(() => {
    if (binaryBuffer) {
      const res = parseExcelBuffer(
        binaryBuffer, 
        Object.keys(customMapping).length > 0 ? customMapping : undefined,
        selectedSheetIndex
      );
      setParseResult(res);
    } else if (rawText.trim()) {
      if (fileType === 'json' || rawText.trim().startsWith('[') || rawText.trim().startsWith('{')) {
        const res = parseJSONContent(
          rawText, 
          Object.keys(customMapping).length > 0 ? customMapping : undefined
        );
        setParseResult(res);
      } else {
        const res = parseDelimitedText(
          rawText, 
          Object.keys(customMapping).length > 0 ? customMapping : undefined
        );
        setParseResult(res);
      }
    } else {
      setParseResult(null);
    }
  }, [rawText, binaryBuffer, selectedSheetIndex, customMapping, fileType]);

  const handleImportSubmit = async () => {
    if (!rawText.trim() && !binaryBuffer) {
      setErrorMsg('Please upload an Excel, CSV, TSV, TXT, or JSON file, or paste lead data first.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      let bodyData: any = {
        mapping: Object.keys(customMapping).length > 0 ? customMapping : undefined,
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
        setTimeout(() => {
          onImportSuccess();
        }, 1500);
      } else {
        setErrorMsg(data.error || 'Failed to import lead records.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error while importing leads.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-5xl max-h-[92vh] bg-surface rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden text-content font-sans"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-import-modal-title"
      >
        {/* Header */}
        <div className="p-5 md:p-6 border-b border-border bg-surface-subtle flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-accent-soft border border-accent/20 rounded-2xl text-accent shadow-2xs">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 id="lead-import-modal-title" className="text-lg md:text-xl font-extrabold text-content font-display tracking-tight">
                  Multi-Format Lead Importer &amp; Auto-Adjuster
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-accent-soft text-accent-text border border-accent/20">
                  Excel • CSV • TSV • Text • JSON
                </span>
              </div>
              <p className="text-xs text-content-secondary mt-1 max-w-2xl font-medium">
                Upload lead spreadsheets from Microsoft Excel (.xlsx/.xls), CSV, TSV, Text, or JSON. Automatically normalizes phones to E.164, parses budgets in Lakhs/Cr, extracts BHKs, and routes to assigned brokers.
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

        {/* Action Bar & Template Download */}
        <div className="px-6 py-3 bg-surface border-b border-border flex items-center justify-between flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-2">
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

          <div className="flex items-center gap-2.5">
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
              <Download className="w-3.5 h-3.5" /> Download Sample Template
            </a>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(92vh-230px)] space-y-5">
          
          {/* Upload Area */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="border-2 border-dashed border-border hover:border-accent bg-surface-subtle/40 hover:bg-accent-soft/10 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all text-center group shadow-2xs hover:shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-surface border border-border group-hover:border-accent/40 flex items-center justify-center text-accent mb-3 shadow-2xs group-hover:scale-105 transition-transform">
                <UploadCloud className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-content group-hover:text-accent transition-colors">
                {fileName ? `Selected: ${fileName}` : 'Choose File from Laptop (Excel, CSV, TSV, TXT, JSON)'}
              </span>
              <span className="text-[11px] text-content-muted mt-1">
                Supports <strong>.xlsx</strong>, <strong>.xls</strong>, <strong>.csv</strong>, <strong>.tsv</strong>, <strong>.txt</strong>, <strong>.json</strong>
              </span>
              <input 
                type="file" 
                accept=".xlsx,.xls,.csv,.tsv,.txt,.json,text/csv,text/plain,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" 
                onChange={handleFileUpload} 
                className="hidden" 
              />
            </label>

            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-content">Or Paste Copied Text / Data:</span>
                <button
                  type="button"
                  onClick={() => {
                    const sampleText = `Full Name\tMobile Number\tEmail\tBudget\tBHK\tPreferred Location\tSource
Amitabh Verma\t09820123456\tamitabh.verma@example.com\t65L to 80L\t2 BHK\tKharghar Sector 35\tYouTube
Pooja Nair\t9819054321\tpooja.nair@example.com\t1.25 Cr\t3 BHK\tKharghar Sector 36\tInstagram
Rajesh Kulkarni\t+91 9820098765\trajesh.k@example.com\t45-55 Lakhs\t1 or 2 BHK\tTaloja Phase 1\tWhatsApp
Sneha Deshmukh\t9967712345\t\t75 Lacs\t2 BHK\tKharghar Sector 20\tDirect Call
Vikramaditya Rao\t9769011223\tvikram.rao@example.com\t1.8 Cr\t3 BHK\tUpper Kharghar\tMeta Ads`;
                    setRawText(sampleText);
                    setBinaryBuffer(null);
                    setFileName('Sample Leads Data');
                    setFileType('tsv');
                    setErrorMsg(null);
                  }}
                  className="text-[11px] font-bold text-accent hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" /> Paste Sample Leads
                </button>
              </div>
              <textarea
                value={rawText}
                onChange={(e) => {
                  setRawText(e.target.value);
                  setBinaryBuffer(null);
                  setFileName('');
                  setErrorMsg(null);
                }}
                placeholder="Full Name	Mobile Number	Email	Budget	BHK	Preferred Location
Amitabh Verma	09820123456	amitabh@test.com	65L to 80L	2 BHK	Kharghar Sec 35
Pooja Nair	9819054321	pooja@test.com	1.25 Cr	3 BHK	Kharghar Sec 36"
                className="w-full flex-1 min-h-[120px] p-3 rounded-xl bg-surface border border-border font-mono text-[11px] text-content placeholder:text-content-muted focus:outline-none focus:border-accent transition-all"
              />
            </div>
          </div>

          {/* Success Banner */}
          {successResult && (
            <div className="p-4 bg-status-success-surface border border-status-success/30 rounded-2xl text-status-success text-xs space-y-1 shadow-xs">
              <div className="flex items-center gap-2 font-bold text-status-success">
                <CheckCircle2 className="w-4 h-4 text-status-success" />
                {successResult.message}
              </div>
              <div className="text-[11px] text-status-success font-mono pl-6">
                Leads: {successResult.stats?.createdLeadsCount} • New Contacts: {successResult.stats?.newContactsCount} • Matched Contacts: {successResult.stats?.existingContactsCount}
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-4 bg-status-danger-surface border border-status-danger/30 rounded-2xl text-status-danger text-xs flex items-center gap-2 shadow-xs">
              <AlertTriangle className="w-4 h-4 text-status-danger shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Auto-Adjustment Preview Table */}
          {activeTab === 'preview' && parseResult && parseResult.leads.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="text-xs font-extrabold text-content uppercase tracking-wider flex items-center gap-2 font-display">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <span>Auto-Adjusted Leads Preview ({parseResult.leads.length} total)</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono font-bold">
                  <span className="px-2.5 py-0.5 rounded-full bg-status-success-surface text-status-success border border-status-success/30">
                    {parseResult.readyCount} Ready
                  </span>
                  {parseResult.warningCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-status-warning-surface text-status-warning border border-status-warning/30">
                      {parseResult.warningCount} Warnings
                    </span>
                  )}
                  {parseResult.invalidCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-status-danger-surface text-status-danger border border-status-danger/30">
                      {parseResult.invalidCount} Invalid
                    </span>
                  )}
                </div>
              </div>

              <div className="border border-border rounded-2xl overflow-hidden bg-surface shadow-2xs">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse font-sans">
                    <thead className="bg-surface-subtle sticky top-0 border-b border-border text-[11px] font-bold text-content-muted uppercase">
                      <tr>
                        <th className="py-2.5 px-3.5">Lead Name</th>
                        <th className="py-2.5 px-3.5">Normalized Phone (E.164)</th>
                        <th className="py-2.5 px-3.5">Parsed Budget</th>
                        <th className="py-2.5 px-3.5">BHK</th>
                        <th className="py-2.5 px-3.5">Resolved Location</th>
                        <th className="py-2.5 px-3.5">Assigned Broker</th>
                        <th className="py-2.5 px-3.5">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-xs">
                      {parseResult.leads.map((lead, idx) => (
                        <tr key={idx} className="hover:bg-surface-subtle transition-colors">
                          <td className="py-2.5 px-3.5 font-bold text-content">
                            <div>{lead.fullName}</div>
                            {lead.email && <div className="text-[10px] text-content-muted font-normal">{lead.email}</div>}
                          </td>
                          <td className="py-2.5 px-3.5 font-mono">
                            {lead.phoneValidation.isValid ? (
                              <span className="text-status-success font-bold">{lead.phoneE164}</span>
                            ) : (
                              <span className="text-status-danger font-bold flex items-center gap-1" title={lead.phoneValidation.error}>
                                <AlertTriangle className="w-3 h-3" /> {lead.phoneValidation.rawInput || 'Missing'}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3.5 font-bold text-accent font-mono">
                            {lead.budgetFormatted}
                          </td>
                          <td className="py-2.5 px-3.5 font-mono font-bold text-content">
                            {lead.bhkPreferences.join(', ')} BHK
                          </td>
                          <td className="py-2.5 px-3.5 text-content">
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium">
                              <MapPin className="w-3 h-3 text-accent" />
                              {lead.primaryLocation}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5">
                            <div className="font-bold text-content text-[11px]">{lead.assignedBrokerName.split(' ')[0]}</div>
                            <div className="text-[10px] font-mono text-content-muted">{lead.assignedBrokerPhone}</div>
                          </td>
                          <td className="py-2.5 px-3.5 text-[11px]">
                            <span className="px-2 py-0.5 rounded-md bg-surface-subtle border border-border text-content-muted font-mono font-bold">
                              {lead.leadSource}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Column Mapping Tab */}
          {activeTab === 'mapping' && parseResult && (
            <div className="space-y-4 bg-surface-subtle p-5 rounded-2xl border border-border shadow-2xs">
              <div className="text-xs font-bold text-content flex items-center gap-2">
                <Filter className="w-4 h-4 text-accent" />
                <span>Adjust Detected Column Mappings:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs">
                {[
                  { field: 'fullName', label: 'Full Name' },
                  { field: 'phone', label: 'Phone Number' },
                  { field: 'email', label: 'Email' },
                  { field: 'budget', label: 'Budget' },
                  { field: 'bhk', label: 'BHK Requirement' },
                  { field: 'location', label: 'Location / Micro-Market' },
                  { field: 'source', label: 'Lead Source / Channel' },
                  { field: 'notes', label: 'Remarks / Inquiry Notes' },
                  { field: 'possession', label: 'Possession Preference' },
                ].map(({ field, label }) => (
                  <div key={field} className="space-y-1">
                    <label className="text-[11px] font-bold text-content-muted uppercase tracking-wider">{label}</label>
                    <select
                      value={(customMapping as any)[field] || (parseResult.mapping as any)[field] || ''}
                      onChange={(e) => {
                        setCustomMapping((prev) => ({
                          ...prev,
                          [field]: e.target.value,
                        }));
                      }}
                      className="w-full px-3 py-2 bg-surface text-content text-xs font-bold select-theme rounded-xl"
                    >
                      <option value="">-- Auto / None --</option>
                      {parseResult.headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 md:p-5 border-t border-border bg-surface-subtle flex items-center justify-between flex-wrap gap-3">
          <div className="text-xs text-content-muted flex items-center gap-2 font-medium">
            <ShieldCheck className="w-4 h-4 text-accent shrink-0" />
            <span>Multi-Format Ingestion: Automatically parses Excel binary, TSV, CSV, and JSON data.</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-surface border border-border hover:bg-surface-subtle text-content text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleImportSubmit}
              disabled={isSubmitting || (!rawText.trim() && !binaryBuffer)}
              className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-extrabold flex items-center gap-2 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Ingesting &amp; Routing...
                </>
              ) : (
                <>
                  <UserCheck className="w-3.5 h-3.5" /> Bulk Ingest &amp; Auto-Adjust Leads
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
