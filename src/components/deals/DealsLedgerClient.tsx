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
  AlertTriangle
} from 'lucide-react';
import { HallmarkStamp } from '@/components/ui/HallmarkStamp';
import { AccessibleDialog } from '@/components/ui/AccessibleDialog';

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
          <div className="flex items-center p-1 rounded-lg bg-[#12151f] border border-[#b59658]/30 mr-1 shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode('pipeline')}
              aria-pressed={viewMode === 'pipeline'}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 text-xs transition-all ${
                viewMode === 'pipeline'
                  ? 'bg-[#1b202c] text-[#ccb67b] font-bold border border-[#b59658]/50 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              Pipeline (Board)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('ledger')}
              aria-pressed={viewMode === 'ledger'}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 text-xs transition-all ${
                viewMode === 'ledger'
                  ? 'bg-[#1b202c] text-[#ccb67b] font-bold border border-[#b59658]/50 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              Ledger (Table)
            </button>
          </div>

          <button
            type="button"
            onClick={() => { setActionError(null); setShowRegisterModal(true); }}
            className="min-h-11 px-4 py-2 rounded-lg bg-gradient-to-r from-[#8a6f3c] via-[#b59658] to-[#ccb67b] hover:opacity-95 text-[#12151f] text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-[#b59658]/20 border border-[#ccb67b]/60"
          >
            <Plus className="w-3.5 h-3.5" />
            Register Closed Deal
          </button>
          <button
            type="button"
            onClick={fetchDealsAndData}
            disabled={loading}
            aria-label="Refresh deal records"
            className="min-h-11 min-w-11 px-3 py-2 rounded-lg bg-[#12151f] hover:bg-[#1b202c] text-slate-300 border border-[#b59658]/20 text-xs font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {(requestError || actionError) && (
        <div role="alert" className="rounded-lg border border-red-500/40 bg-red-950/50 p-3 text-xs text-red-200">
          <p>{requestError || actionError}</p>
          {requestError && <button type="button" onClick={fetchDealsAndData} className="mt-1 min-h-11 font-bold text-white underline underline-offset-2">Retry deal records</button>}
        </div>
      )}

      {/* Financial Overview Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[#1b202c]/90 border border-[#b59658]/30 shadow-md">
          <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider flex justify-between items-center">
            <span>Total Gross Brokerage Pipeline</span>
            <DollarSign className="w-3.5 h-3.5 text-[#ccb67b]" />
          </div>
          <div className="text-2xl font-bold text-white mt-1.5">
            {formatINR(summary.totalGrossBrokerage)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {deals.length} Active Deals Across Pipeline
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#1b202c]/90 border border-emerald-500/30 shadow-md">
          <div className="text-[11px] text-emerald-400 font-semibold uppercase tracking-wider flex justify-between items-center">
            <span>Bank Cleared &amp; Realized</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-300 mt-1.5">
            {formatINR(summary.totalCollected)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            RTGS &amp; Developer Disbursements In
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#1b202c]/90 border border-amber-500/30 shadow-md">
          <div className="text-[11px] text-amber-400 font-semibold uppercase tracking-wider flex justify-between items-center">
            <span>Pending Receivables / Invoiced</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300 mt-1.5">
            {formatINR(summary.totalPending)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Token / Registration / Invoicing stage
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 rounded-xl bg-[#1b202c]/90 border border-[#b59658]/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <label htmlFor="deals-search" className="sr-only">Search deal records</label>
          <input
            id="deals-search"
            name="dealSearch"
            type="text"
            placeholder="Search deals by project, purchaser, advisor, or unit…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#12151f] border border-[#b59658]/20 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ccb67b]"
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
              className={`min-h-11 px-2.5 py-1.5 rounded text-[11px] whitespace-nowrap ${
                selectedStatus === st.id
                  ? 'bg-gradient-to-r from-[#8a6f3c] to-[#ccb67b] text-[#12151f] font-bold shadow-sm'
                  : 'bg-[#12151f] text-slate-400 hover:text-white border border-[#b59658]/20'
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
                className="rounded-2xl bg-[#1b202c]/90 border border-[#b59658]/30 shadow-xl overflow-hidden flex flex-col min-h-[460px]"
              >
                {/* Column Header */}
                <div className="p-3.5 bg-[#12151f]/90 border-b border-[#b59658]/20 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white uppercase text-[11px] tracking-wider">
                      {col.label}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#1b202c] text-[#ccb67b] border border-[#b59658]/40 text-[10px] font-bold">
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
                        className="p-3.5 rounded-xl bg-[#12151f] border border-[#b59658]/20 hover:border-[#b59658]/60 transition-all space-y-2.5 shadow-md group"
                      >
                        {/* Card Top: Buyer Name & Status Staleness Flag */}
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-white font-sans text-sm">{deal.lead?.fullName}</h4>
                            <p className="text-[10px] text-slate-400 font-mono">{deal.lead?.phoneE164}</p>
                          </div>

                          {/* Staleness Bottleneck Tag */}
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 ${
                              isStale
                                ? 'bg-red-950/80 text-red-300 border border-red-500/40 animate-pulse'
                                : isWarning
                                ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                                : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                            }`}
                            title={`${daysInStatus} days in this stage`}
                          >
                            <Clock className="w-2.5 h-2.5" />
                            {daysInStatus}d
                          </span>
                        </div>

                        {/* Project & Unit Details */}
                        <div className="text-xs text-slate-200">
                          <strong className="text-white">{deal.developerProject?.projectName}</strong>
                          <span className="text-[10px] text-slate-400 block">
                            Unit {deal.propertyUnit?.unitNumber || 'N/A'} ({deal.propertyUnit?.bhk} BHK • {deal.developerProject?.microMarket})
                          </span>
                        </div>

                        {/* Financial Snapshot */}
                        <div className="p-2 rounded-lg bg-[#1b202c] border border-[#b59658]/10 flex justify-between items-center text-[11px]">
                          <div>
                            <span className="text-[9px] text-slate-400 block uppercase">Agreement</span>
                            <strong className="text-slate-200">{formatINR(deal.agreementValue)}</strong>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] text-[#ccb67b] block uppercase">Gross ({deal.brokeragePercent}%)</span>
                            <strong className="text-[#ccb67b]">{formatINR(deal.grossBrokerageAmount)}</strong>
                          </div>
                        </div>

                        {/* Card Footer: Advisor Tag & Fast Stage Advancement */}
                        <div className="flex items-center justify-between pt-1 border-t border-[#b59658]/10 text-[10px]">
                          <span className="text-slate-400 truncate max-w-[110px]">
                            {deal.closingBroker?.fullName || 'Senior Broker'}
                          </span>

                          <div className="flex items-center gap-1">
                            {col.nextStage && (
                              <button
                                type="button"
                                onClick={() => advanceDealStage(deal, col.nextStage!)}
                                disabled={pendingStageIds.has(deal.id)}
                                aria-label={`Advance ${deal.lead?.fullName || 'deal'} to ${col.nextLabel}`}
                                className="min-h-11 px-2 py-1 rounded bg-[#1b202c] hover:bg-[#2a3040] text-[#ccb67b] border border-[#b59658]/30 font-bold flex items-center gap-0.5 disabled:opacity-50"
                              >
                                <span>{col.nextLabel}</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setUpdateDeal(deal);
                                setNewStatus(deal.dealStatus);
                                setInvoiceNumber(deal.developerInvoiceNumber || 'ZP-INV-2026-08');
                              }}
                              aria-label={`Edit milestone for ${deal.lead?.fullName || 'deal'}`}
                              className="min-h-11 min-w-11 grid place-items-center rounded hover:bg-[#2a3040] text-slate-400 hover:text-white"
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

      {/* VIEW 2: ACCOUNTING LEDGER TABLE */}
      {viewMode === 'ledger' && (
        <div className="rounded-xl bg-[#1b202c]/90 border border-[#b59658]/30 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#12151f]/90 text-slate-400 uppercase text-[10px] border-b border-[#b59658]/20">
                <tr>
                  <th className="p-3 pl-4">Project &amp; Unit</th>
                  <th className="p-3">Purchaser</th>
                  <th className="p-3">Registered By / Sourced At</th>
                  <th className="p-3 text-right">Agreement Val</th>
                  <th className="p-3 text-right">Gross Brokerage</th>
                  <th className="p-3 text-right">Firm Net</th>
                  <th className="p-3 text-right">Rep Share</th>
                  <th className="p-3 text-center">Status / Days</th>
                  <th className="p-3 pr-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#b59658]/10 text-slate-300">
                {filteredDeals.map((deal) => {
                  const daysInStatus = calculateDaysInStatus(deal.updatedAt || deal.bookingDate);
                  const isPaid = deal.dealStatus === 'PAYMENT_RECEIVED';

                  return (
                    <tr key={deal.id} className="hover:bg-[#12151f]/70 transition-colors">
                      <td className="p-3 pl-4">
                        <div className="font-bold text-white font-sans text-sm">
                          {deal.developerProject?.projectName}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Unit {deal.propertyUnit?.unitNumber || 'N/A'} ({deal.propertyUnit?.bhk} BHK • {deal.developerProject?.microMarket})
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="font-semibold text-slate-200">{deal.lead?.fullName}</div>
                        <div className="text-[10px] text-[#ccb67b]">{deal.lead?.phoneE164}</div>
                      </td>

                      {/* Dispute-Proof Timestamped Registration Field */}
                      <td className="p-3">
                        <div className="text-[11px] text-white font-semibold flex items-center gap-1">
                          <HallmarkStamp type="ledger" label="Recorded" size="sm" />
                          <span>{deal.closingBroker?.fullName || 'Senior Broker'}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(deal.bookingDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })} • {new Date(deal.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      <td className="p-3 text-right font-bold text-white">
                        {formatINR(deal.agreementValue)}
                      </td>

                      <td className="p-3 text-right font-bold text-[#ccb67b]">
                        <div>{formatINR(deal.grossBrokerageAmount)}</div>
                        <div className="text-[10px] text-slate-400">@{deal.brokeragePercent}%</div>
                      </td>

                      <td className="p-3 text-right font-bold text-emerald-400">
                        {formatINR(deal.firmNetBrokerageAmount)}
                      </td>

                      <td className="p-3 text-right text-slate-300">
                        <div>{formatINR(deal.repCommissionAmount)}</div>
                        <div className="text-[10px] text-slate-500">Rep Incentive</div>
                      </td>

                      <td className="p-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          isPaid
                            ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40'
                            : deal.dealStatus === 'INVOICE_SENT'
                            ? 'bg-purple-950/70 text-purple-300 border border-purple-500/40'
                            : 'bg-amber-950/70 text-amber-300 border border-amber-500/40'
                        }`}>
                          {deal.dealStatus.replace('_', ' ')}
                        </span>
                        <div className="text-[9px] text-slate-500 mt-0.5">
                          {daysInStatus}d in status
                        </div>
                      </td>

                      <td className="p-3 pr-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setUpdateDeal(deal);
                            setNewStatus(deal.dealStatus);
                            setInvoiceNumber(deal.developerInvoiceNumber || 'ZP-INV-2026-08');
                          }}
                          aria-label={`Edit milestone for ${deal.lead?.fullName || 'deal'}`}
                          className="min-h-11 px-2.5 py-1 rounded bg-[#12151f] hover:bg-[#2a3040] text-[#ccb67b] border border-[#b59658]/30 text-[11px] font-semibold flex items-center gap-1 ml-auto shadow-sm"
                        >
                          <FileText className="w-3 h-3" />
                          Milestone
                        </button>
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
        panelClassName="max-w-lg bg-[#1b202c] border border-[#b59658]/40 rounded-2xl p-6 space-y-4 shadow-2xl"
      >
            <div className="flex items-center justify-between pb-3 border-b border-[#b59658]/20">
              <div>
              <h2 id="register-deal-title" className="font-bold text-white text-base font-display flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#b59658]" />
                Register property deal and commission split
              </h2>
              <p id="register-deal-description" className="mt-1 text-[11px] text-slate-400">Create a ledger record for the buyer, unit, and agreed brokerage split.</p>
              </div>
              <button type="button" data-dialog-close aria-label="Close register deal form" onClick={() => setShowRegisterModal(false)} className="min-h-11 min-w-11 text-slate-400 hover:text-white">✕</button>
            </div>

            {actionError && <div role="alert" className="rounded-lg border border-red-500/40 bg-red-950/50 p-3 text-xs text-red-200">{actionError}</div>}

            <form onSubmit={handleRegisterDeal} className="space-y-3.5">
              <div>
                <label htmlFor="deal-lead" className="text-slate-300 block mb-1">Purchaser lead:</label>
                <select
                  id="deal-lead"
                  name="leadId"
                  data-dialog-autofocus
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white"
                >
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.fullName} ({l.phoneE164})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="deal-unit" className="text-slate-300 block mb-1">Purchased property unit:</label>
                <select
                  id="deal-unit"
                  name="propertyUnitId"
                  value={selectedUnitId}
                  onChange={(e) => setSelectedUnitId(e.target.value)}
                  className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white"
                >
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.project?.projectName} - Unit {u.unitNumber} ({u.bhk} BHK • ₹{(u.agreementValue / 100000).toFixed(2)}L)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="deal-brokerage" className="text-slate-300 block mb-1">Developer brokerage percentage:</label>
                  <input
                    id="deal-brokerage"
                    name="brokeragePercent"
                    type="number"
                    step="0.1"
                    value={brokeragePercent}
                    onChange={(e) => setBrokeragePercent(Number(e.target.value))}
                    className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white"
                  />
                </div>

                <div>
                  <label htmlFor="deal-rep-split" className="text-slate-300 block mb-1">Sales representative split percentage:</label>
                  <input
                    id="deal-rep-split"
                    name="repSplitPercent"
                    type="number"
                    step="1"
                    value={repSplitPercent}
                    onChange={(e) => setRepSplitPercent(Number(e.target.value))}
                    className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="deal-co-broker" className="text-slate-300 block mb-1">Co-broker firm (optional):</label>
                  <input
                    id="deal-co-broker"
                    name="coBrokerName"
                    type="text"
                    placeholder="e.g. Shree Ganesh Properties"
                    value={coBrokerName}
                    onChange={(e) => setCoBrokerName(e.target.value)}
                    className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white"
                  />
                </div>

                <div>
                  <label htmlFor="deal-co-broker-share" className="text-slate-300 block mb-1">Co-broker share percentage:</label>
                  <input
                    id="deal-co-broker-share"
                    name="coBrokerSharePercent"
                    type="number"
                    step="1"
                    value={coBrokerSharePercent}
                    onChange={(e) => setCoBrokerSharePercent(Number(e.target.value))}
                    className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="deal-notes" className="text-slate-300 block mb-1">Transaction notes:</label>
                <textarea
                  id="deal-notes"
                  name="notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="min-h-11 px-3 py-1.5 rounded-lg bg-[#12151f] text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-11 px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#8a6f3c] via-[#b59658] to-[#ccb67b] text-[#12151f] font-bold shadow-md"
                >
                  {submitting ? 'Recording…' : 'Register deal'}
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
        panelClassName="max-w-md bg-[#1b202c] border border-[#b59658]/40 rounded-2xl p-6 space-y-4 shadow-2xl"
      >
        {updateDeal && (
          <>
            <div className="flex items-center justify-between pb-3 border-b border-[#b59658]/20">
              <div>
                <h2 id="update-milestone-title" className="font-bold text-white text-base font-display">Update payment milestone</h2>
                <p id="update-milestone-description" className="mt-1 text-[11px] text-slate-400">Record the next confirmed payment or invoice state.</p>
              </div>
              <button type="button" data-dialog-close aria-label="Close update milestone form" onClick={() => setUpdateDeal(null)} className="min-h-11 min-w-11 text-slate-400 hover:text-white">✕</button>
            </div>

            {actionError && <div role="alert" className="rounded-lg border border-red-500/40 bg-red-950/50 p-3 text-xs text-red-200">{actionError}</div>}

            <form onSubmit={handleUpdateStatus} className="space-y-3.5">
              <div>
                <label htmlFor="milestone-status" className="text-slate-300 block mb-1">Target milestone status:</label>
                <select
                  id="milestone-status"
                  name="dealStatus"
                  data-dialog-autofocus
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white"
                >
                  <option value="TOKEN_RECEIVED">TOKEN_RECEIVED (Booking Advance)</option>
                  <option value="AGREEMENT_REGISTERED">AGREEMENT_REGISTERED (Sub-Registrar)</option>
                  <option value="INVOICE_SENT">INVOICE_SENT (GST Tax Invoice)</option>
                  <option value="PAYMENT_RECEIVED">PAYMENT_RECEIVED (RTGS Cleared)</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <div>
                <label htmlFor="invoice-number" className="text-slate-300 block mb-1">GST tax invoice number:</label>
                <input
                  id="invoice-number"
                  name="developerInvoiceNumber"
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUpdateDeal(null)}
                  className="min-h-11 px-3 py-1.5 rounded-lg bg-[#12151f] text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingStatus}
                  className="min-h-11 px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#8a6f3c] via-[#b59658] to-[#ccb67b] text-[#12151f] font-bold shadow-md"
                >
                  {savingStatus ? 'Saving…' : 'Update status'}
                </button>
              </div>
            </form>
          </>
        )}
      </AccessibleDialog>
    </div>
  );
}
