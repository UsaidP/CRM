'use client';

import React, { useState, useEffect } from 'react';
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
  ExternalLink
} from 'lucide-react';

export default function DealsLedgerPage() {
  const [deals, setDeals] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({ totalGrossBrokerage: 0, totalCollected: 0, totalPending: 0 });
  const [leads, setLeads] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Register Deal Modal State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
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
    try {
      const [dealRes, leadRes, unitRes] = await Promise.all([
        fetch('/api/v1/deals'),
        fetch('/api/v1/leads'),
        fetch('/api/v1/inventory/units'),
      ]);
      const dealData = await dealRes.json();
      const leadData = await leadRes.json();
      const unitData = await unitRes.json();

      if (dealData.success) {
        setDeals(dealData.data);
        setSummary(dealData.summary);
      }
      if (leadData.success) {
        setLeads(leadData.data);
        if (leadData.data.length > 0 && !selectedLeadId) {
          setSelectedLeadId(leadData.data[0].id);
        }
      }
      if (unitData.success) {
        setUnits(unitData.data);
        if (unitData.data.length > 0 && !selectedUnitId) {
          setSelectedUnitId(unitData.data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching deals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDealsAndData();
  }, []);

  const handleRegisterDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId || !selectedUnitId) {
      alert('Please select a buyer lead and a property unit.');
      return;
    }
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
          coBrokerName,
          coBrokerSharePercent,
          notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowRegisterModal(false);
        fetchDealsAndData();
      } else {
        alert(data.error || 'Failed to register deal');
      }
    } catch (err: any) {
      alert(err.message || 'Error registering deal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateDealStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateDeal) return;
    setSavingStatus(true);
    try {
      const res = await fetch(`/api/v1/deals/${updateDeal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealStatus: newStatus,
          developerInvoiceNumber: invoiceNumber,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setUpdateDeal(null);
        fetchDealsAndData();
      } else {
        alert(data.error || 'Failed to update deal status');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating deal status');
    } finally {
      setSavingStatus(false);
    }
  };

  const filteredDeals = deals.filter((d) => {
    if (selectedStatus !== 'ALL' && d.dealStatus !== selectedStatus) return false;
    return true;
  });

  const selectedUnit = units.find((u) => u.id === selectedUnitId);
  const estAgreementValue = selectedUnit?.agreementValue || 6800000;
  const estGrossBrokerage = Math.round((estAgreementValue * brokeragePercent) / 100);
  const estRepCommission = Math.round((estGrossBrokerage * repSplitPercent) / 100);
  const estFirmNet = estGrossBrokerage - estRepCommission;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#b59658]/20">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1b202c] border border-[#b59658]/40 text-[#ccb67b] text-xs font-semibold mb-2">
            <DollarSign className="w-3.5 h-3.5 text-[#b59658]" />
            Deal Closing &amp; Brokerage Ledger
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white font-display">
            Commission Ledger &amp; Revenue Hub
          </h1>
          <p className="text-slate-400 text-xs mt-0.5 font-sans">
            Track closed sales, developer brokerage invoicing (2%–3%), sales rep splits, and cash collections.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchDealsAndData}
            className="p-2.5 rounded-xl bg-[#1b202c] hover:bg-[#2a3040] text-slate-300 hover:text-white border border-[#b59658]/30 transition-all flex items-center gap-2 text-xs font-semibold shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowRegisterModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8a6f3c] via-[#b59658] to-[#ccb67b] hover:opacity-95 text-[#12151f] text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-lg shadow-[#b59658]/20 border border-[#ccb67b]/60"
          >
            <Plus className="w-4 h-4 text-[#12151f]" />
            Register Closed Deal
          </button>
        </div>
      </div>

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="glass-panel p-5 rounded-2xl border-[#b59658]/30">
          <span className="text-xs text-[#ccb67b] font-bold uppercase tracking-wider block">
            Total Gross Brokerage
          </span>
          <div className="text-2xl font-extrabold text-white mt-1 font-mono">
            ₹{(summary.totalGrossBrokerage / 100000).toFixed(2)} Lakhs
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Across {deals.length} Closed Transactions
          </span>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-[#b59658]/20">
          <span className="text-xs text-[#ccb67b] font-bold uppercase tracking-wider block">
            Brokerage Collected (Paid)
          </span>
          <div className="text-2xl font-extrabold text-[#ccb67b] mt-1 font-mono">
            ₹{(summary.totalCollected / 100000).toFixed(2)} Lakhs
          </div>
          <span className="text-[11px] text-[#ccb67b]/80 mt-1 block">
            RTGS / Direct Payout Received
          </span>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-amber-900/40">
          <span className="text-xs text-amber-400 font-bold uppercase tracking-wider block">
            Invoicing / Pending Receivables
          </span>
          <div className="text-2xl font-extrabold text-amber-400 mt-1 font-mono">
            ₹{(summary.totalPending / 100000).toFixed(2)} Lakhs
          </div>
          <span className="text-[11px] text-amber-300/80 mt-1 block">
            Token / Registration stage
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="glass-panel p-3.5 rounded-2xl flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-400 font-semibold text-[11px] mr-1">Filter Deal Stage:</span>
        {[
          { id: 'ALL', label: 'All Deals' },
          { id: 'TOKEN_RECEIVED', label: 'Token Received' },
          { id: 'AGREEMENT_REGISTERED', label: 'Agreement Registered' },
          { id: 'INVOICE_SENT', label: 'Invoice Sent' },
          { id: 'PAYMENT_RECEIVED', label: 'Payment Received' },
        ].map((st) => (
          <button
            key={st.id}
            onClick={() => setSelectedStatus(st.id)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              selectedStatus === st.id
                ? 'bg-[#1b202c] text-[#ccb67b] border border-[#b59658]/50 shadow-sm font-bold'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {st.label}
          </button>
        ))}
      </div>

      {/* Deals Stream */}
      {loading ? (
        <div className="glass-panel p-12 text-center text-slate-400 text-sm flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-[#ccb67b]" />
          <span>Loading commission ledger...</span>
        </div>
      ) : filteredDeals.length === 0 ? (
        <div className="glass-panel p-12 text-center text-slate-400 text-sm space-y-2">
          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
          <p className="text-white font-semibold">No deal transactions found.</p>
          <p className="text-xs text-slate-400">Click &quot;Register Closed Deal&quot; above to log your first closed booking.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDeals.map((deal) => {
            const isPaid = deal.dealStatus === 'PAYMENT_RECEIVED';
            const isInvoiceSent = deal.dealStatus === 'INVOICE_SENT';

            return (
              <div
                key={deal.id}
                className="glass-panel p-5 rounded-3xl border border-slate-800 hover:border-[#b59658]/40 transition-all space-y-4"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                        <DollarSign className="w-4 h-4 text-[#b59658]" />
                      </span>
                      <h3 className="font-bold text-white text-base font-display">
                        {deal.lead?.fullName}
                      </h3>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                        {deal.lead?.phoneE164}
                      </span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#1b202c] text-[#ccb67b] border border-[#b59658]/40 font-semibold font-mono">
                        {deal.dealStatus.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 pt-1">
                      🏢 <strong>{deal.developerProject?.projectName}</strong> ({deal.propertyUnit?.bhk} BHK • Unit {deal.propertyUnit?.unitNumber || 'N/A'}) • {deal.developerProject?.microMarket}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setUpdateDeal(deal);
                        setNewStatus(deal.dealStatus);
                        setInvoiceNumber(deal.developerInvoiceNumber || 'ZP-INV-2026-08');
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[#ccb67b] font-bold text-xs border border-[#b59658]/30 transition-all flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#b59658]" />
                      Update Invoice / Status
                    </button>
                  </div>
                </div>

                {/* Financial Ledger Breakdown Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Agreement Base Value</span>
                    <strong className="text-white text-sm font-mono">
                      ₹{(deal.agreementValue / 100000).toFixed(2)} Lakhs
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">
                      Gross Brokerage ({deal.brokeragePercent}%)
                    </span>
                    <strong className="text-[#ccb67b] text-sm font-mono font-bold">
                      ₹{(deal.grossBrokerageAmount / 1000).toFixed(1)}k
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Sales Rep Commission</span>
                    <strong className="text-slate-300 text-sm font-mono">
                      ₹{(deal.repCommissionAmount / 1000).toFixed(1)}k
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Firm Net Commission</span>
                    <strong className="text-[#ccb67b] text-sm font-mono font-bold">
                      ₹{(deal.firmNetBrokerageAmount / 1000).toFixed(1)}k
                    </strong>
                  </div>
                </div>

                {/* Footer Notes & Invoice Details */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 pt-1 font-mono">
                  <span>
                    Booking Date:{' '}
                    <strong className="text-slate-300">
                      {new Date(deal.bookingDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </strong>
                  </span>

                  {deal.developerInvoiceNumber && (
                    <span className="font-mono text-slate-300">
                      Invoice: <strong className="text-[#ccb67b]">{deal.developerInvoiceNumber}</strong>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Register Closed Deal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel max-w-lg w-full p-6 rounded-3xl border border-slate-700 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2 font-display">
                <DollarSign className="w-4 h-4 text-[#b59658]" />
                Register Closed Property Booking
              </h3>
              <button onClick={() => setShowRegisterModal(false)} className="text-slate-400 hover:text-white text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterDeal} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Purchaser (Lead Profile)</label>
                <select
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ccb67b]"
                >
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.fullName} ({l.phoneE164})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Purchased Property Unit</label>
                <select
                  value={selectedUnitId}
                  onChange={(e) => setSelectedUnitId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ccb67b]"
                >
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.project.projectName} - Unit {u.unitNumber} ({u.bhk} BHK • ₹{(u.agreementValue / 100000).toFixed(2)}L)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Developer Brokerage %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={brokeragePercent}
                    onChange={(e) => setBrokeragePercent(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Sales Rep Split %</label>
                  <input
                    type="number"
                    step="1"
                    value={repSplitPercent}
                    onChange={(e) => setRepSplitPercent(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Real-time Math Preview */}
              <div className="p-3.5 rounded-2xl bg-[#1b202c] border border-[#b59658]/40 space-y-1.5 text-slate-300">
                <span className="text-[#ccb67b] font-bold text-xs block">Commission Breakdown Preview:</span>
                <div className="flex justify-between">
                  <span>Agreement Value:</span>
                  <span className="font-mono font-bold text-white">₹{(estAgreementValue / 100000).toFixed(2)} Lakhs</span>
                </div>
                <div className="flex justify-between">
                  <span>Gross Brokerage ({brokeragePercent}%):</span>
                  <span className="font-mono font-bold text-[#ccb67b]">₹{(estGrossBrokerage / 1000).toFixed(1)}k</span>
                </div>
                <div className="flex justify-between">
                  <span>Rep Payout ({repSplitPercent}%):</span>
                  <span className="font-mono text-slate-300">₹{(estRepCommission / 1000).toFixed(1)}k</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800 text-white font-bold">
                  <span>Firm Net Income:</span>
                  <span className="font-mono text-[#ccb67b]">₹{(estFirmNet / 1000).toFixed(1)}k</span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Transaction Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#8a6f3c] via-[#b59658] to-[#ccb67b] hover:opacity-95 text-[#12151f] text-xs font-extrabold shadow-md"
                >
                  {submitting ? 'Registering...' : 'Register Deal & Calculate Commission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Update Deal Status */}
      {updateDeal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full p-6 rounded-3xl border border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2 font-display">
                <FileText className="w-4 h-4 text-[#b59658]" />
                Update Invoice &amp; Payment Status
              </h3>
              <button onClick={() => setUpdateDeal(null)} className="text-slate-400 hover:text-white text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateDealStatus} className="space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <strong className="text-white text-sm block font-display">{updateDeal.developerProject?.projectName}</strong>
                <p className="text-slate-400 text-xs">Purchaser: {updateDeal.lead?.fullName}</p>
                <p className="text-[#ccb67b] font-bold font-mono pt-1">
                  Gross Commission: ₹{(updateDeal.grossBrokerageAmount / 1000).toFixed(1)}k
                </p>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Transaction Stage</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ccb67b]"
                >
                  <option value="TOKEN_RECEIVED">Token Received</option>
                  <option value="AGREEMENT_REGISTERED">Agreement Registered</option>
                  <option value="INVOICE_SENT">Invoice Submitted to Builder VP</option>
                  <option value="PAYMENT_RECEIVED">Payment Received (Full Settlement)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Developer Invoice Ref No.</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setUpdateDeal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingStatus}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#8a6f3c] via-[#b59658] to-[#ccb67b] hover:opacity-95 text-[#12151f] text-xs font-extrabold shadow-md"
                >
                  {savingStatus ? 'Saving...' : 'Save Deal Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
