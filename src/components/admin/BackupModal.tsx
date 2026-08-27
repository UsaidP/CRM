'use client';

import React, { useState, useEffect } from 'react';
import {
  Cloud,
  Database,
  Download,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Clock,
  Zap,
  ShieldCheck,
  RefreshCw,
  X,
  FileText,
  HardDrive,
  Users,
  CalendarDays,
  Flame,
  Check,
  Copy
} from 'lucide-react';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'BACKUP' | 'DUTY_END';
  currentUser?: {
    id: string;
    fullName: string;
    role: string;
    email: string;
  } | null;
}

export function BackupModal({
  isOpen,
  onClose,
  initialMode = 'BACKUP',
  currentUser,
}: BackupModalProps) {
  const [activeTab, setActiveTab] = useState<'BACKUP' | 'DUTY_END'>(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingInfo, setIsFetchingInfo] = useState(false);
  const [progressStep, setProgressStep] = useState<string | null>(null);
  const [backupResult, setBackupResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [backupHistory, setBackupHistory] = useState<any[]>([]);
  const [gdriveFolderUrl, setGdriveFolderUrl] = useState<string>('https://drive.google.com/drive/my-drive');
  const [dbStats, setDbStats] = useState<any>({
    totalLeads: 0,
    totalContacts: 0,
    totalVisits: 0,
    totalDeals: 0,
    totalReminders: 0,
  });
  const [copiedLink, setCopiedLink] = useState(false);

  // Sync mode when prop changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode);
      setBackupResult(null);
      setError(null);
      fetchBackupInfo();
    }
  }, [isOpen, initialMode]);

  const fetchBackupInfo = async () => {
    setIsFetchingInfo(true);
    try {
      const res = await fetch('/api/v1/admin/backup');
      const data = await res.json();
      if (data.success) {
        setBackupHistory(data.backups || []);
        if (data.gdriveFolderUrl) setGdriveFolderUrl(data.gdriveFolderUrl);
        if (data.databaseStats) setDbStats(data.databaseStats);
      }
    } catch {
      // Non-blocking
    } finally {
      setIsFetchingInfo(false);
    }
  };

  const handleRunBackup = async (isDutyEnd = false) => {
    setIsLoading(true);
    setError(null);
    setProgressStep('1/4 Creating consistent SQLite snapshot...');

    const stepInterval = setInterval(() => {
      setProgressStep((prev) => {
        if (prev?.startsWith('1/4')) return '2/4 Exporting 14 JSON tables...';
        if (prev?.startsWith('2/4')) return '3/4 Compressing media and assets...';
        if (prev?.startsWith('3/4')) return '4/4 Securing archive for Google Drive...';
        return prev;
      });
    }, 1500);

    try {
      const res = await fetch('/api/v1/admin/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dutyEnd: isDutyEnd }),
      });
      const data = await res.json();
      clearInterval(stepInterval);

      if (data.success) {
        setBackupResult(data);
        fetchBackupInfo();
      } else {
        setError(data.error || 'Backup failed to complete.');
      }
    } catch (err: any) {
      clearInterval(stepInterval);
      setError(err?.message || 'Network error while generating backup.');
    } finally {
      setIsLoading(false);
      setProgressStep(null);
    }
  };

  const handleCopyGdriveUrl = () => {
    navigator.clipboard.writeText(gdriveFolderUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-border bg-surface-subtle flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent-soft text-accent-text flex items-center justify-center font-bold shadow-xs">
              <Cloud className="w-5 h-5 text-accent" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-content font-display">
                  Google Drive Cloud Backup
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-status-success-surface text-status-success border border-status-success/30 font-mono">
                  ● Live Sync
                </span>
              </div>
              <p className="text-xs text-content-secondary">
                ZamZam Real Estate Database • SQLite Snapshot • Portable JSON Tables
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-content-muted hover:text-content hover:bg-surface transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border bg-surface/50 px-5 pt-2 gap-2">
          <button
            onClick={() => {
              setActiveTab('BACKUP');
              setBackupResult(null);
              setError(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
              activeTab === 'BACKUP'
                ? 'border-accent text-accent bg-surface font-extrabold shadow-xs'
                : 'border-transparent text-content-muted hover:text-content'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>General Cloud Backup</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('DUTY_END');
              setBackupResult(null);
              setError(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
              activeTab === 'DUTY_END'
                ? 'border-accent text-accent bg-surface font-extrabold shadow-xs'
                : 'border-transparent text-content-muted hover:text-content'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-status-warning" />
            <span>Telecaller End-of-Duty Backup</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Duty End Banner */}
          {activeTab === 'DUTY_END' && (
            <div className="p-4 rounded-2xl bg-status-warning-surface/30 border border-status-warning/30 space-y-2">
              <div className="flex items-center gap-2 text-status-warning font-bold text-xs">
                <Flame className="w-4 h-4" />
                <span>Shift Handover & End-of-Duty Protocol</span>
              </div>
              <p className="text-xs text-content-secondary leading-relaxed">
                Telecallers & Agents: When wrapping up your calling shift, click below to log your completed duty and generate the daily Google Drive data snapshot for team recordkeeping.
              </p>
              <div className="flex items-center gap-4 pt-1 text-[11px] text-content-muted font-mono">
                <span>👤 Agent: <strong className="text-content">{currentUser?.fullName || 'Active Telecaller'}</strong></span>
                <span>📅 Date: <strong className="text-content">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></span>
              </div>
            </div>
          )}

          {/* Database Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-2xl bg-surface-subtle border border-border">
              <div className="text-[10px] uppercase font-bold text-content-muted font-mono flex items-center gap-1.5">
                <Users className="w-3 h-3 text-accent" /> Leads & Inquiries
              </div>
              <div className="text-lg font-extrabold text-content mt-1">
                {dbStats.totalLeads}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-surface-subtle border border-border">
              <div className="text-[10px] uppercase font-bold text-content-muted font-mono flex items-center gap-1.5">
                <Database className="w-3 h-3 text-status-success" /> Contacts & Profiles
              </div>
              <div className="text-lg font-extrabold text-content mt-1">
                {dbStats.totalContacts}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-surface-subtle border border-border">
              <div className="text-[10px] uppercase font-bold text-content-muted font-mono flex items-center gap-1.5">
                <CalendarDays className="w-3 h-3 text-status-warning" /> Site Visits & Tours
              </div>
              <div className="text-lg font-extrabold text-content mt-1">
                {dbStats.totalVisits}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-surface-subtle border border-border">
              <div className="text-[10px] uppercase font-bold text-content-muted font-mono flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-accent" /> Deals Closed
              </div>
              <div className="text-lg font-extrabold text-content mt-1">
                {dbStats.totalDeals}
              </div>
            </div>
          </div>

          {/* Success Result View */}
          {backupResult && (
            <div className="p-5 rounded-2xl bg-status-success-surface border border-status-success/30 space-y-3 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-2.5 text-status-success">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <h4 className="font-extrabold text-sm font-display">
                  {backupResult.message || 'Backup Successfully Created & Secured!'}
                </h4>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-surface/80 p-3 rounded-xl border border-status-success/20 font-mono">
                <div>
                  <span className="text-content-muted text-[10px] block">Archive Size</span>
                  <strong className="text-content">{backupResult.sizeMB} MB</strong>
                </div>
                <div>
                  <span className="text-content-muted text-[10px] block">Total Records</span>
                  <strong className="text-content">{backupResult.totalRecords} Records</strong>
                </div>
                <div>
                  <span className="text-content-muted text-[10px] block">Duration</span>
                  <strong className="text-content">{backupResult.durationSec}s</strong>
                </div>
              </div>

              <p className="text-xs text-status-success font-medium">
                {backupResult.gdriveMessage}
              </p>

              {/* Action Buttons: Direct Download + Open GDrive */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <a
                  href={backupResult.downloadUrl}
                  download
                  className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-98"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Backup File (.tar.gz)</span>
                </a>

                <a
                  href={gdriveFolderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface-subtle text-content border border-border rounded-xl text-xs font-bold transition-all shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-accent" />
                  <span>Open Google Drive Folder</span>
                </a>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-2xl bg-status-danger-surface border border-status-danger/30 flex items-center gap-3 text-status-danger text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Primary Action Button */}
          {!backupResult && (
            <div className="space-y-3">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleRunBackup(activeTab === 'DUTY_END')}
                className={`w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl text-sm font-extrabold shadow-md transition-all active:scale-99 cursor-pointer ${
                  isLoading
                    ? 'bg-surface-subtle text-content-muted border border-border cursor-not-allowed'
                    : activeTab === 'DUTY_END'
                    ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white'
                    : 'bg-accent hover:bg-accent-hover text-white'
                }`}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-accent" />
                    <span>{progressStep || 'Executing Backup...'}</span>
                  </>
                ) : activeTab === 'DUTY_END' ? (
                  <>
                    <Flame className="w-4 h-4 text-amber-200" />
                    <span>End Duty & Take Daily Backup to Google Drive</span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-4 h-4" />
                    <span>Start Full Backup to Google Drive Now</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-[11px] text-content-muted px-1">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-status-success" />
                  Non-blocking safe SQLite VACUUM snapshot
                </span>
                <span>Auto 30-day retention</span>
              </div>
            </div>
          )}

          {/* Google Drive Configuration & Folder Link */}
          <div className="p-4 rounded-2xl bg-surface-subtle border border-border space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-accent" />
                <span className="text-xs font-bold text-content">Target Google Drive Folder</span>
              </div>
              <a
                href={gdriveFolderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-accent hover:underline flex items-center gap-1"
              >
                <span>Open in Drive</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex items-center gap-2 bg-surface p-2 rounded-xl border border-border text-xs font-mono text-content-secondary truncate">
              <span className="truncate flex-1">{gdriveFolderUrl}</span>
              <button
                type="button"
                onClick={handleCopyGdriveUrl}
                className="p-1 rounded-lg text-content-muted hover:text-content hover:bg-surface-subtle transition-colors shrink-0"
                title="Copy URL"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-status-success" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Recent Backup History List */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-content-muted font-mono">
                Recent Saved Backups ({backupHistory.length})
              </h4>
              <button
                onClick={fetchBackupInfo}
                className="p-1 text-content-muted hover:text-content text-xs font-mono flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isFetchingInfo ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {backupHistory.length === 0 ? (
              <div className="p-4 text-center rounded-xl bg-surface-subtle border border-dashed border-border text-xs text-content-muted">
                No past backups recorded yet. Click above to create your first snapshot!
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {backupHistory.slice(0, 5).map((item) => (
                  <div
                    key={item.fileName}
                    className="flex items-center justify-between p-2.5 bg-surface hover:bg-surface-subtle border border-border rounded-xl text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-accent shrink-0" />
                      <div className="min-w-0">
                        <div className="font-semibold text-content truncate font-mono text-[11px]">
                          {item.fileName}
                        </div>
                        <div className="text-[10px] text-content-muted flex items-center gap-2">
                          <span>{new Date(item.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                          <span>•</span>
                          <span className="font-mono">{item.sizeMB} MB</span>
                        </div>
                      </div>
                    </div>

                    <a
                      href={`/api/v1/admin/backup/download/${item.fileName}`}
                      download
                      className="p-1.5 rounded-lg bg-surface-subtle hover:bg-accent hover:text-white text-content-secondary border border-border transition-colors cursor-pointer shrink-0 ml-2"
                      title="Download Backup"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border bg-surface-subtle flex items-center justify-between text-xs text-content-muted">
          <span className="font-mono text-[11px]">
            ⚡ SQLite + 14 JSON Tables + Uploads (.tar.gz)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-surface hover:bg-surface-subtle text-content border border-border rounded-xl font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
