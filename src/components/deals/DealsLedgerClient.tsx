'use client';

import React, { useState } from 'react';
import { 
  DollarSign, 
  Building2, 
  TrendingUp, 
  Users, 
  Sparkles, 
  RefreshCw, 
  Plus, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Calendar, 
  Check, 
  Layers, 
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Search,
  Filter,
  Kanban,
  Table,
  ArrowRight,
  ChevronRight,
  AlertTriangle,
  Download,
  Printer
} from 'lucide-react';
import { HallmarkStamp } from '@/components/ui/HallmarkStamp';
import { AccessibleDialog } from '@/components/ui/AccessibleDialog';
import { formatDateFull, formatTimeShort } from '@/lib/date-utils';
import { exportDealsToCsv } from '@/lib/export-utils';

export function DealsLedgerClient({
  initialDeals = [],
  initialLeads = [],
  initialUnits = [],
  initialSummary = { totalGrossBrokerage: 0, totalCollected: 0, totalPending: 0 },
}: {
  initialDeals?: any[];
  initialLeads?: any[];
  initialUnits?: any[];
  initialSummary?: any;
}) {
  const [deals, setDeals] = useState<any[]>(initialDeals);
  const [summary, setSummary] = useState<any>(initialSummary);
  const [leads, setLeads] = useState<any[]>(initialLeads);
  const [units, setUnits] = useState<any[]>(initialUnits);
  const [loading, setLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingStageIds, setPendingStageIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'pipeline' | 'ledger'>('pipeline');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Register Deal Modal State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(initialLeads[0]?.id || '');
  const [selectedUnitId, setSelectedUnitId] = useState(initialUnits[0]?.id || '');
  const [brokeragePercent, setBrokeragePercent] = useState(2.5);
  const [repSplitPercent, setRepSplitPercent] = useState(50);
  const [coBrokerName, setCoBrokerName] = useState('');
  const [coBrokerSharePercent, setCoBrokerSharePercent] = useState(0);
  const [notes, setNotes] = useState('Closed after physical sample flat inspection tour');
  const [submitting, setSubmitting] = useState(false);

  // Status Update Modal State
  const [updateDeal, setUpdateDeal] = useState<any | null>(null);
  const [invoiceDeal, setInvoiceDeal] = useState<any | null>(null);
  const [newStatus, setNewStatus] = useState('INVOICE_SENT');
  const [invoiceNumber, setInvoiceNumber] = useState('ZP-INV-2026-08');
  const [savingStatus, setSavingStatus] = useState(false);

  const fetchDealsAndData = async () => {
    setLoading(true);
    setRequestError(null);
    try {
      const [dealRes, leadRes, unitRes] = await Promise.all([
        fetch('/api/v1/deals'),
        fetch('/api/v1/leads'),
        fetch('/api/v1/inventory/units'),
      ]);
      const dealData = await dealRes.json();
      const leadData = await leadRes.json();
      const unitData = await unitRes.json();

      if (!dealRes.ok || !dealData.success) throw new Error(dealData.error || 'Deal records could not be loaded.');
      if (!leadRes.ok || !leadData.success) throw new Error(leadData.error || 'Lead profiles could not be loaded.');
      if (!unitRes.ok || !unitData.success) throw new Error(unitData.error || 'Inventory units could not be loaded.');
      if (dealData.success) {
        setDeals(dealData.data);
        setSummary(dealData.summary || { totalGrossBrokerage: 0, totalCollected: 0, totalPending: 0 });
      }
      if (leadData.success) setLeads(leadData.data);
      if (unitData.success) setUnits(unitData.data);
    } catch (err: any) {
      setRequestError(err.message || 'Deal data could not be loaded. Check your connection, then try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId || !selectedUnitId) {
      setActionError('Select a buyer lead and a property unit before registering the deal.');
      return;
    }
    setActionError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedLeadId,
          propertyUnitId: selectedUnitId,
          brokeragePercent,
          repSplitPercent,
          coBrokerName: coBrokerName || null,
          coBrokerSharePercent,
          notes,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowRegisterModal(false);
        fetchDealsAndData();
      } else {
        setActionError(data.error || 'The deal could not be registered. Review the selected records, then try again.');
      }
    } catch (err: any) {
      setActionError(err.message || 'The deal request could not be completed. Check your connection, then try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateDeal) return;
    setActionError(null);
    setSavingStatus(true);
    try {
      const res = await fetch(`/api/v1/deals/${updateDeal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealStatus: newStatus,
          developerInvoiceNumber: invoiceNumber,
          paymentReceivedDate: newStatus === 'PAYMENT_RECEIVED' ? new Date().toISOString() : null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUpdateDeal(null);
        fetchDealsAndData();
      } else {
        setActionError(data.error || 'The deal milestone could not be updated. Review the status and invoice number, then try again.');
      }
    } catch (err: any) {
      setActionError(err.message || 'The milestone request could not be completed. Check your connection, then try again.');
    } finally {
      setSavingStatus(false);
    }
  };

  const advanceDealStage = async (deal: any, nextStatus: string) => {
    if (pendingStageIds.has(deal.id)) return;
    const previousDeals = deals;
    setActionError(null);
    setPendingStageIds((ids) => new Set(ids).add(deal.id));
    setDeals((currentDeals) => currentDeals.map((currentDeal) => (
      currentDeal.id === deal.id ? { ...currentDeal, dealStatus: nextStatus, updatedAt: new Date().toISOString() } : currentDeal
    )));
    try {
      const res = await fetch(`/api/v1/deals/${deal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealStatus: nextStatus,
          paymentReceivedDate: nextStatus === 'PAYMENT_RECEIVED' ? new Date().toISOString() : null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchDealsAndData();
      } else {
        throw new Error(data.error || 'The deal stage was rejected.');
      }
    } catch (err: any) {
      setDeals(previousDeals);
      setActionError(err.message || 'The deal stage could not be updated. The previous stage has been restored.');
    } finally {
      setPendingStageIds((ids) => {
        const next = new Set(ids);
        next.delete(deal.id);
        return next;
      });
    }
  };

  const formatINR = (val: number) => {
    if (!val && val !== 0) return '₹0';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
    return `₹${Number(val).toLocaleString('en-IN')}`;
  };

  const filteredDeals = deals.filter((d) => {
    const matchesStatus = selectedStatus === 'ALL' || d.dealStatus === selectedStatus;
    const matchesSearch =
      !searchQuery ||
      (d.developerProject?.projectName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.lead?.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.closingBroker?.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.propertyUnit?.unitNumber || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const calculateDaysInStatus = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  };

  const PIPELINE_COLUMNS = [
    {
      id: 'TOKEN_RECEIVED',
      label: 'Token & Booking Advance',
      description: 'Initial token deposit logged',
      color: 'border-amber-500/40 text-amber-300',
      nextStage: 'AGREEMENT_REGISTERED',
      nextLabel: 'Registered',
    },
    {
      id: 'AGREEMENT_REGISTERED',
      label: 'Agreement Registered',
      description: 'Registration milestone recorded',
      color: 'border-blue-500/40 text-blue-300',
      nextStage: 'INVOICE_SENT',
      nextLabel: 'Send Invoice',
    },
    {
      id: 'INVOICE_SENT',
      label: 'GST Invoice Dispatched',
      description: 'Awaiting developer disbursement',
      color: 'border-purple-500/40 text-purple-300',
      nextStage: 'PAYMENT_RECEIVED',
      nextLabel: 'Payment Cleared',
    },
    {
      id: 'PAYMENT_RECEIVED',
      label: 'Brokerage Cleared (RTGS)',
      description: 'Firm & Rep revenue realized',
      color: 'border-emerald-500/40 text-emerald-300',
      nextStage: null,
      nextLabel: 'Done',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-mono text-xs">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#b59658]/20">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1b202c] text-[#ccb67b] border border-[#b59658]/40 uppercase tracking-wider flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-[#b59658]" /> DUAL-VIEW DEAL ENGINE
            </span>
            <HallmarkStamp type="ledger" label="Calculated deal ledger" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white font-display">
            Deals &amp; Commission {viewMode === 'pipeline' ? 'Pipeline Board' : 'Accounting Ledger'}
          </h1>
          <p className="text-slate-400 text-xs mt-0.5">
            {viewMode === 'pipeline'
              ? 'Sequential deal stage workflow, bottleneck diagnostics, and fast transition cards.'
              : 'Dispute-proof timestamped source records, GST developer invoicing, and rep incentives.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Toggle: Pipeline (Kanban) vs Ledger (Table) */}
          <div className="flex items-center bg-surface-subtle border border-border rounded-xl p-1">
            <button
              type="button"
              onClick={() => setViewMode('pipeline')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all ${
                viewMode === 'pipeline'
                  ? 'bg-accent text-white font-bold shadow-xs'
                  : 'text-content-secondary hover:text-content'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              Pipeline (Kanban)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('ledger')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all ${
                viewMode === 'ledger'
                  ? 'bg-accent text-white font-bold shadow-xs'
                  : 'text-content-secondary hover:text-content'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              Ledger (Table)
            </button>
          </div>

          <button
            type="button"
            onClick={() => exportDealsToCsv(filteredDeals, summary, { status: selectedStatus, search: searchQuery })}
            title="Export deals ledger to CSV spreadsheet"
            className="min-h-10 px-3.5 py-2 rounded-xl bg-surface hover:bg-surface-subtle text-content border border-border text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-accent" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => { setActionError(null); setShowRegisterModal(true); }}
            className="min-h-10 px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Register Closed Deal</span>
          </button>
          <button
            type="button"
            onClick={fetchDealsAndData}
            disabled={loading}
            aria-label="Refresh deal records"
            className="min-h-10 min-w-10 px-3 py-2 rounded-xl bg-surface hover:bg-surface-subtle text-content border border-border text-xs font-semibold shadow-xs transition-all flex items-center justify-center cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-accent' : 'text-content-secondary'}`} />
          </button>
        </div>
      </div>

      {(requestError || actionError) && (
        <div role="alert" className="rounded-xl border border-status-danger/40 bg-status-danger-surface p-3.5 text-xs text-status-danger font-semibold shadow-xs">
          <p>{requestError || actionError}</p>
          {requestError && <button type="button" onClick={fetchDealsAndData} className="mt-1 font-bold text-status-danger underline underline-offset-2">Retry deal records</button>}
        </div>
      )}

      {/* Financial Overview Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-surface border border-border shadow-xs hover:border-border-strong transition-all">
          <div className="text-[11px] text-content-muted font-bold uppercase tracking-wider flex justify-between items-center">
            <span>Total Gross Brokerage Pipeline</span>
            <DollarSign className="w-4 h-4 text-accent" />
          </div>
          <div className="text-2xl font-bold text-content mt-1.5">
            {formatINR(summary.totalGrossBrokerage)}
          </div>
          <div className="text-[11px] text-content-muted mt-1">
            {deals.length} Active Deals Across Pipeline
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-status-success/30 shadow-xs hover:border-status-success/50 transition-all">
          <div className="text-[11px] text-status-success font-bold uppercase tracking-wider flex justify-between items-center">
            <span>Bank Cleared &amp; Realized</span>
            <CheckCircle2 className="w-4 h-4 text-status-success" />
          </div>
          <div className="text-2xl font-bold text-status-success mt-1.5">
            {formatINR(summary.totalCollected)}
          </div>
          <div className="text-[11px] text-content-muted mt-1">
            RTGS &amp; Developer Disbursements In
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-status-warning/30 shadow-xs hover:border-status-warning/50 transition-all">
          <div className="text-[11px] text-status-warning font-bold uppercase tracking-wider flex justify-between items-center">
            <span>Pending Receivables / Invoiced</span>
            <Clock className="w-4 h-4 text-status-warning" />
          </div>
          <div className="text-2xl font-bold text-status-warning mt-1.5">
            {formatINR(summary.totalPending)}
          </div>
          <div className="text-[11px] text-content-muted mt-1">
            Token / Registration / Invoicing stage
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 rounded-2xl bg-surface border border-border shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 w-full flex items-center">
          <Search className="w-4 h-4 text-content-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <label htmlFor="deals-search" className="sr-only">Search deal records</label>
          <input
            id="deals-search"
            name="dealSearch"
            type="text"
            placeholder="Search deals by project, purchaser, advisor, or unit…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input w-full bg-surface-inset border border-border rounded-xl pr-4 py-2.5 text-xs text-content placeholder:text-content-muted focus:outline-none focus:border-accent shadow-2xs"
          />
        </div>

        <fieldset className="flex min-w-0 max-w-full items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          <legend className="sr-only">Filter deals by stage</legend>
          {[
            { id: 'ALL', label: 'All Stages' },
            { id: 'TOKEN_RECEIVED', label: 'Token' },
            { id: 'AGREEMENT_REGISTERED', label: 'Registered' },
            { id: 'INVOICE_SENT', label: 'Invoiced' },
            { id: 'PAYMENT_RECEIVED', label: 'Paid' },
          ].map((st) => (
            <button
              type="button"
              key={st.id}
              onClick={() => setSelectedStatus(st.id)}
              aria-pressed={selectedStatus === st.id}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedStatus === st.id
                  ? 'bg-accent text-white font-bold shadow-xs'
                  : 'bg-surface hover:bg-surface-subtle text-content-secondary hover:text-content border border-border'
              }`}
            >
              {st.label}
            </button>
          ))}
        </fieldset>
      </div>

      {/* VIEW 1: PIPELINE KANBAN BOARD */}
      {viewMode === 'pipeline' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {PIPELINE_COLUMNS.map((col) => {
            const colDeals = filteredDeals.filter((d) => d.dealStatus === col.id);
            const colTotal = colDeals.reduce((acc, d) => acc + (d.grossBrokerageAmount || 0), 0);

            return (
              <div
                key={col.id}
                className="rounded-2xl bg-surface border border-border shadow-xs overflow-hidden flex flex-col min-h-[460px]"
              >
                {/* Column Header */}
                <div className="p-3.5 bg-surface-subtle border-b border-border space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-content uppercase text-[11px] tracking-wider">
                      {col.label}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-accent-soft text-accent-text border border-accent/20 text-[10px] font-bold">
                      {colDeals.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 pt-0.5">
                    <span>{col.description}</span>
                    <strong className="text-white font-bold">{formatINR(colTotal)}</strong>
                  </div>
                </div>

                {/* Cards Container */}
                <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[620px]">
                  {colDeals.map((deal) => {
                    const daysInStatus = calculateDaysInStatus(deal.updatedAt || deal.bookingDate);
                    const isStale = daysInStatus > 14;
                    const isWarning = daysInStatus > 7 && daysInStatus <= 14;

                    return (
                      <div
                        key={deal.id}
                        className="p-4 rounded-xl bg-surface border border-border hover:border-accent/50 transition-all space-y-3 shadow-xs group"
                      >
                        {/* Card Top: Buyer Name & Status Staleness Flag */}
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <h4 className="font-bold text-content font-sans text-sm">{deal.lead?.fullName}</h4>
                            <p className="text-[11px] text-content-muted font-mono">{deal.lead?.phoneE164}</p>
                          </div>

                          {/* Staleness Bottleneck Tag */}
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 border ${
                              isStale
                                ? 'bg-status-danger-surface text-status-danger border-status-danger/40 animate-pulse'
                                : isWarning
                                ? 'bg-status-warning-surface text-status-warning border-status-warning/40'
                                : 'bg-status-success-surface text-status-success border-status-success/40'
                            }`}
                            title={`${daysInStatus} days in this stage`}
                          >
                            <Clock className="w-3 h-3" />
                            {daysInStatus}d
                          </span>
                        </div>

                        {/* Project & Unit Details */}
                        <div className="text-xs text-content-secondary">
                          <strong className="text-content">{deal.developerProject?.projectName}</strong>
                          <span className="text-[11px] text-content-muted block mt-0.5">
                            Unit {deal.propertyUnit?.unitNumber || 'N/A'} ({deal.propertyUnit?.bhk} BHK • {deal.developerProject?.microMarket})
                          </span>
                        </div>

                        {/* Financial Snapshot */}
                        <div className="p-2.5 rounded-xl bg-surface-inset border border-border flex justify-between items-center text-xs">
                          <div>
                            <span className="text-[10px] text-content-muted block uppercase font-semibold">Agreement</span>
                            <strong className="text-content font-mono font-bold">{formatINR(deal.agreementValue)}</strong>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-accent-text block uppercase font-bold">Gross ({deal.brokeragePercent}%)</span>
                            <strong className="text-accent-text font-mono font-bold">{formatINR(deal.grossBrokerageAmount)}</strong>
                          </div>
                        </div>

                        {/* Card Footer: Advisor Tag & Fast Stage Advancement */}
                        <div className="flex items-center justify-between pt-2 border-t border-border text-[11px]">
                          <span className="text-content-muted truncate max-w-[110px]">
                            {deal.closingBroker?.fullName || 'Senior Broker'}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {col.nextStage && (
                              <button
                                type="button"
                                onClick={() => advanceDealStage(deal, col.nextStage!)}
                                disabled={pendingStageIds.has(deal.id)}
                                aria-label={`Advance ${deal.lead?.fullName || 'deal'} to ${col.nextLabel}`}
                                className="px-2.5 py-1.5 rounded-lg bg-surface hover:bg-surface-subtle text-accent-text hover:text-accent border border-border hover:border-accent/40 font-bold text-xs flex items-center gap-1 transition-all shadow-2xs disabled:opacity-50"
                              >
                                <span>{col.nextLabel}</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setInvoiceDeal(deal)}
                              className="p-1.5 rounded-lg hover:bg-surface-subtle text-content-muted hover:text-accent transition-colors cursor-pointer"
                              title="View & Print Official Commission Invoice"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setUpdateDeal(deal);
                                setNewStatus(deal.dealStatus);
                                setInvoiceNumber(deal.developerInvoiceNumber || 'ZP-INV-2026-08');
                              }}
                              className="p-1.5 rounded-lg hover:bg-surface-subtle text-content-muted hover:text-content transition-colors cursor-pointer"
                              title="Edit milestone or invoice details"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {colDeals.length === 0 && (
                    <div className="p-6 text-center text-slate-500 text-[11px]">
                      No deals currently in {col.label.toLowerCase()}.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: FULL LEDGER DATA TABLE */}
      {viewMode === 'ledger' && (
        <div className="rounded-2xl bg-surface border border-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-subtle text-content-secondary uppercase text-[10px] font-bold border-b border-border">
                <tr>
                  <th className="p-3.5 pl-4">Project &amp; Unit</th>
                  <th className="p-3.5">Purchaser Lead</th>
                  <th className="p-3.5">Brokerage Lock / Rep</th>
                  <th className="p-3.5 text-right">Agreement Value</th>
                  <th className="p-3.5 text-right">Gross Commission</th>
                  <th className="p-3.5 text-right">Firm Net Net</th>
                  <th className="p-3.5 text-right">Agent Commission</th>
                  <th className="p-3.5 text-center">Milestone Status</th>
                  <th className="p-3.5 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-content-secondary">
                {filteredDeals.map((deal) => {
                  const daysInStatus = calculateDaysInStatus(deal.updatedAt || deal.bookingDate);
                  const isPaid = deal.dealStatus === 'PAYMENT_RECEIVED';

                  return (
                    <tr key={deal.id} className="hover:bg-surface-subtle/80 transition-colors">
                      <td className="p-3.5 pl-4">
                        <div className="font-bold text-content font-sans text-sm">
                          {deal.developerProject?.projectName}
                        </div>
                        <div className="text-[11px] text-content-muted mt-0.5">
                          Unit {deal.propertyUnit?.unitNumber || 'N/A'} ({deal.propertyUnit?.bhk} BHK • {deal.developerProject?.microMarket})
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-semibold text-content">{deal.lead?.fullName}</div>
                        <div className="text-[11px] font-mono text-accent-text">{deal.lead?.phoneE164}</div>
                      </td>

                      {/* Dispute-Proof Timestamped Registration Field */}
                      <td className="p-3.5">
                        <div className="text-[11px] text-content font-semibold flex items-center gap-1">
                          <HallmarkStamp type="ledger" label="Recorded" size="sm" />
                          <span>{deal.closingBroker?.fullName || 'Senior Broker'}</span>
                        </div>
                        <div className="text-[10px] text-content-muted mt-0.5 font-mono">
                          {formatDateFull(deal.bookingDate)} • {formatTimeShort(deal.createdAt)}
                        </div>
                      </td>

                      <td className="p-3.5 text-right font-bold text-content font-mono">
                        {formatINR(deal.agreementValue)}
                      </td>

                      <td className="p-3.5 text-right font-bold text-accent-text font-mono">
                        <div>{formatINR(deal.grossBrokerageAmount)}</div>
                        <div className="text-[10px] text-content-muted">@{deal.brokeragePercent}%</div>
                      </td>

                      <td className="p-3.5 text-right font-bold text-status-success font-mono">
                        {formatINR(deal.firmNetBrokerageAmount)}
                      </td>

                      <td className="p-3.5 text-right text-content font-mono">
                        <div>{formatINR(deal.repCommissionAmount)}</div>
                        <div className="text-[10px] text-content-muted">Rep Incentive</div>
                      </td>

                      <td className="p-3.5 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${
                          isPaid
                            ? 'bg-status-success-surface text-status-success border-status-success/30'
                            : deal.dealStatus === 'INVOICE_SENT'
                            ? 'bg-accent-soft text-accent-text border-accent/20'
                            : 'bg-status-warning-surface text-status-warning border-status-warning/30'
                        }`}>
                          {deal.dealStatus.replace('_', ' ')}
                        </span>
                        <div className="text-[10px] text-content-muted mt-0.5 font-mono">
                          {daysInStatus}d in status
                        </div>
                      </td>

                      <td className="p-3.5 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setInvoiceDeal(deal)}
                            className="px-2.5 py-1.5 rounded-xl bg-surface hover:bg-surface-subtle text-content-secondary hover:text-content border border-border text-xs font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                            title="View & Print Official Commission Invoice"
                          >
                            <Printer className="w-3.5 h-3.5 text-accent" />
                            <span>Invoice</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setUpdateDeal(deal);
                              setNewStatus(deal.dealStatus);
                              setInvoiceNumber(deal.developerInvoiceNumber || 'ZP-INV-2026-08');
                            }}
                            aria-label={`Edit milestone for ${deal.lead?.fullName || 'deal'}`}
                            className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-subtle text-accent-text hover:text-accent border border-border hover:border-accent/40 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Update</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredDeals.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 text-xs">
                      No closed deal records found matching current status filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Register Closed Deal */}
      <AccessibleDialog
        open={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        titleId="register-deal-title"
        descriptionId="register-deal-description"
        size="lg"
      >
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <h2 id="register-deal-title" className="font-bold text-content text-base font-display flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-accent" />
              Register Property Deal &amp; Commission Split
            </h2>
            <p id="register-deal-description" className="mt-1 text-xs text-content-muted">
              Create a verified ledger record for the buyer, unit, and agreed brokerage split.
            </p>
          </div>
          <button
            type="button"
            data-dialog-close
            aria-label="Close register deal form"
            onClick={() => setShowRegisterModal(false)}
            className="p-1 rounded-lg text-content-muted hover:text-content hover:bg-surface-subtle transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {actionError && (
          <div role="alert" className="rounded-xl border border-status-danger/40 bg-status-danger-surface p-3 text-xs text-status-danger font-medium mt-3">
            {actionError}
          </div>
        )}

        <form onSubmit={handleRegisterDeal} className="space-y-4 pt-3">
          <div>
            <label htmlFor="deal-lead" className="text-xs font-bold text-content block mb-1">Purchaser Lead:</label>
            <select
              id="deal-lead"
              name="leadId"
              data-dialog-autofocus
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              className="w-full bg-surface-subtle border border-border rounded-xl p-2.5 text-xs text-content focus:outline-hidden focus:border-accent focus:ring-1 focus:ring-accent font-medium"
            >
              {leads.map((l) => (
                <option key={l.id} value={l.id} className="bg-surface text-content">
                  {l.fullName} ({l.phoneE164})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="deal-unit" className="text-xs font-bold text-content block mb-1">Purchased Property Unit:</label>
            <select
              id="deal-unit"
              name="propertyUnitId"
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
              className="w-full bg-surface-subtle border border-border rounded-xl p-2.5 text-xs text-content focus:outline-hidden focus:border-accent focus:ring-1 focus:ring-accent font-medium"
            >
              {units.map((u) => (
                <option key={u.id} value={u.id} className="bg-surface text-content">
                  {u.project?.projectName} - Unit {u.unitNumber} ({u.bhk} BHK • ₹{(u.agreementValue / 100000).toFixed(2)}L)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="deal-brokerage" className="text-xs font-bold text-content block mb-1">Developer Brokerage (%):</label>
              <input
                id="deal-brokerage"
                name="brokeragePercent"
                type="number"
                step="0.1"
                value={brokeragePercent}
                onChange={(e) => setBrokeragePercent(Number(e.target.value))}
                className="w-full bg-surface-subtle border border-border rounded-xl p-2.5 text-xs text-content font-mono focus:outline-hidden focus:border-accent focus:ring-1 focus:ring-accent font-medium"
              />
            </div>

            <div>
              <label htmlFor="deal-rep-split" className="text-xs font-bold text-content block mb-1">Sales Rep Split (%):</label>
              <input
                id="deal-rep-split"
                name="repSplitPercent"
                type="number"
                step="1"
                value={repSplitPercent}
                onChange={(e) => setRepSplitPercent(Number(e.target.value))}
                className="w-full bg-surface-subtle border border-border rounded-xl p-2.5 text-xs text-content font-mono focus:outline-hidden focus:border-accent focus:ring-1 focus:ring-accent font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="deal-co-broker" className="text-xs font-bold text-content block mb-1">Co-Broker Firm (Optional):</label>
              <input
                id="deal-co-broker"
                name="coBrokerName"
                type="text"
                placeholder="e.g. Shree Ganesh Properties"
                value={coBrokerName}
                onChange={(e) => setCoBrokerName(e.target.value)}
                className="w-full bg-surface-subtle border border-border rounded-xl p-2.5 text-xs text-content placeholder-content-muted focus:outline-hidden focus:border-accent focus:ring-1 focus:ring-accent font-medium"
              />
            </div>

            <div>
              <label htmlFor="deal-co-broker-share" className="text-xs font-bold text-content block mb-1">Co-Broker Share (%):</label>
              <input
                id="deal-co-broker-share"
                name="coBrokerSharePercent"
                type="number"
                step="1"
                value={coBrokerSharePercent}
                onChange={(e) => setCoBrokerSharePercent(Number(e.target.value))}
                className="w-full bg-surface-subtle border border-border rounded-xl p-2.5 text-xs text-content font-mono focus:outline-hidden focus:border-accent focus:ring-1 focus:ring-accent font-medium"
              />
            </div>
          </div>

          <div>
            <label htmlFor="deal-notes" className="text-xs font-bold text-content block mb-1">Transaction Notes:</label>
            <textarea
              id="deal-notes"
              name="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-surface-subtle border border-border rounded-xl p-2.5 text-xs text-content placeholder-content-muted focus:outline-hidden focus:border-accent focus:ring-1 focus:ring-accent font-medium"
            />
          </div>

          <div className="pt-3 border-t border-border flex flex-col-reverse sm:flex-row justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowRegisterModal(false)}
              className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-subtle text-content border border-border text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              {submitting ? 'Recording…' : 'Register Deal'}
            </button>
          </div>
        </form>
      </AccessibleDialog>

      {/* MODAL: Update Milestone Status */}
      <AccessibleDialog
        open={Boolean(updateDeal)}
        onClose={() => setUpdateDeal(null)}
        titleId="update-milestone-title"
        descriptionId="update-milestone-description"
        size="md"
      >
        {updateDeal && (
          <>
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h2 id="update-milestone-title" className="font-bold text-content text-base font-display">
                  Update Payment Milestone
                </h2>
                <p id="update-milestone-description" className="mt-1 text-xs text-content-muted">
                  Record the next confirmed payment or invoice state.
                </p>
              </div>
              <button
                type="button"
                data-dialog-close
                aria-label="Close update milestone form"
                onClick={() => setUpdateDeal(null)}
                className="p-1 rounded-lg text-content-muted hover:text-content hover:bg-surface-subtle transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {actionError && (
              <div role="alert" className="rounded-xl border border-status-danger/40 bg-status-danger-surface p-3 text-xs text-status-danger font-medium mt-3">
                {actionError}
              </div>
            )}

            <form onSubmit={handleUpdateStatus} className="space-y-4 pt-3">
              <div>
                <label htmlFor="milestone-status" className="text-xs font-bold text-content block mb-1">
                  Target Milestone Status:
                </label>
                <select
                  id="milestone-status"
                  name="dealStatus"
                  data-dialog-autofocus
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-surface-subtle border border-border rounded-xl p-2.5 text-xs text-content focus:outline-hidden focus:border-accent focus:ring-1 focus:ring-accent font-medium"
                >
                  <option value="TOKEN_RECEIVED" className="bg-surface text-content">TOKEN_RECEIVED (Booking Advance)</option>
                  <option value="AGREEMENT_REGISTERED" className="bg-surface text-content">AGREEMENT_REGISTERED (Sub-Registrar)</option>
                  <option value="INVOICE_SENT" className="bg-surface text-content">INVOICE_SENT (GST Tax Invoice)</option>
                  <option value="PAYMENT_RECEIVED" className="bg-surface text-content">PAYMENT_RECEIVED (RTGS Cleared)</option>
                  <option value="CANCELLED" className="bg-surface text-content">CANCELLED</option>
                </select>
              </div>

              <div>
                <label htmlFor="invoice-number" className="text-xs font-bold text-content block mb-1">
                  GST Tax Invoice Number:
                </label>
                <input
                  id="invoice-number"
                  name="developerInvoiceNumber"
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full bg-surface-subtle border border-border rounded-xl p-2.5 text-xs text-content font-mono focus:outline-hidden focus:border-accent focus:ring-1 focus:ring-accent font-medium"
                />
              </div>

              <div className="pt-3 border-t border-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUpdateDeal(null)}
                  className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-subtle text-content border border-border text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingStatus}
                  className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  {savingStatus ? 'Saving…' : 'Update status'}
                </button>
              </div>
            </form>
          </>
        )}
      </AccessibleDialog>

      {/* MODAL 3: OFFICIAL ZAMZAM REAL ESTATE COMMISSION TAX INVOICE */}
      <AccessibleDialog
        open={Boolean(invoiceDeal)}
        onClose={() => setInvoiceDeal(null)}
        titleId="deal-invoice-title"
        size="lg"
      >
        {invoiceDeal && (
          <div className="space-y-4 text-xs font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-accent text-white flex items-center justify-center font-bold font-mono">
                  ZP
                </div>
                <div>
                  <h2 id="deal-invoice-title" className="text-base font-bold text-content font-display">
                    ZamZam Properties — Commission Tax Invoice
                  </h2>
                  <p className="text-[10px] text-content-muted font-mono">
                    Official Brokerage Billing Document • MahaRERA Reg: A52000028714
                  </p>
                </div>
              </div>
              <button
                type="button"
                data-dialog-close
                aria-label="Close invoice"
                onClick={() => setInvoiceDeal(null)}
                className="p-1 rounded-lg text-content-muted hover:text-content cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Printable Invoice Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border space-y-4 text-slate-900 bg-white">
              {/* Letterhead */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                <div>
                  <h3 className="font-extrabold text-lg text-[#1B4332] font-display">ZAMZAM REAL ESTATE</h3>
                  <p className="text-[10px] text-slate-500 font-mono">GSTIN: 27AABCZ1234F1Z5 • MahaRERA: A52000028714</p>
                  <p className="text-[10px] text-slate-500">Sector 35, Kharghar &amp; Sector 14, Taloja, Navi Mumbai</p>
                </div>
                <div className="text-right font-mono text-[10px] space-y-0.5">
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold">
                    TAX INVOICE
                  </span>
                  <p className="mt-1 font-bold text-slate-800">Inv #: {invoiceDeal.developerInvoiceNumber || 'ZP-INV-2026-08'}</p>
                  <p className="text-slate-500">Date: {new Date().toLocaleDateString('en-IN')}</p>
                </div>
              </div>

              {/* Billed To & Transaction Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-[10px]">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 font-mono">Billed To (Developer / Builder):</span>
                  <p className="font-bold text-slate-800 text-xs mt-0.5">{invoiceDeal.developerProject?.developerName || 'Developer Partner'}</p>
                  <p className="text-slate-600">Project: {invoiceDeal.developerProject?.projectName || invoiceDeal.projectName || 'Navi Mumbai Project'}</p>
                  <p className="text-slate-600">Allotted Unit: {invoiceDeal.propertyUnit?.unitNumber || invoiceDeal.unitNo || 'Standard Unit'}</p>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 font-mono">Purchaser &amp; Brokerage Reference:</span>
                  <p className="font-bold text-slate-800 text-xs mt-0.5">Buyer: {invoiceDeal.lead?.fullName || 'Client'}</p>
                  <p className="text-slate-600">Agreement Value: <strong>{formatINR(invoiceDeal.agreementValue)}</strong></p>
                  <p className="text-slate-600">Agreed Brokerage Rate: <strong>{invoiceDeal.brokeragePercent}%</strong></p>
                </div>
              </div>

              {/* Financial Calculation Table */}
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100 text-slate-700 uppercase font-mono text-[9px]">
                    <th className="py-2 px-3 text-left">Description</th>
                    <th className="py-2 px-3 text-right">Taxable Value</th>
                    <th className="py-2 px-3 text-right">GST Rate</th>
                    <th className="py-2 px-3 text-right">Total Amount (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2 px-3">
                      <strong>Real Estate Brokerage Professional Fees</strong>
                      <div className="text-[9px] text-slate-500">Service for facilitating acquisition of {invoiceDeal.developerProject?.projectName} Unit {invoiceDeal.propertyUnit?.unitNumber}</div>
                    </td>
                    <td className="py-2 px-3 text-right font-mono">{formatINR(invoiceDeal.grossBrokerageAmount)}</td>
                    <td className="py-2 px-3 text-right font-mono">18.0%</td>
                    <td className="py-2 px-3 text-right font-mono font-bold">{formatINR(invoiceDeal.grossBrokerageAmount * 1.18)}</td>
                  </tr>
                  <tr className="bg-slate-50 font-bold">
                    <td colSpan={3} className="py-2 px-3 text-right text-slate-700">Net Receivable Commission (Incl GST 18%):</td>
                    <td className="py-2 px-3 text-right font-mono text-[#1B4332] text-xs">
                      {formatINR(invoiceDeal.grossBrokerageAmount * 1.18)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Payout & Banking Details */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[10px] space-y-1 text-slate-700">
                <div className="font-bold text-[#1B4332] flex items-center justify-between">
                  <span>RTGS / NEFT Direct Settlement Details:</span>
                  <span className="font-mono text-emerald-800">Current A/C • HDFC Bank Kharghar</span>
                </div>
                <p className="font-mono">Account Name: <strong>ZAMZAM REAL ESTATE SERVICES LLP</strong></p>
                <p className="font-mono">Account No: <strong>50200084920194</strong> • IFSC Code: <strong>HDFC0001234</strong></p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setInvoiceDeal(null)}
                className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-subtle text-content border border-border text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Save PDF Invoice</span>
              </button>
            </div>
          </div>
        )}
      </AccessibleDialog>
    </div>
  );
}
