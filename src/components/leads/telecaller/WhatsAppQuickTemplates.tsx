'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  FileText,
  Calendar,
  Layers,
  Clock,
  DollarSign,
  Copy,
  Check
} from 'lucide-react';

interface QuickTemplate {
  id: string;
  name: string;
  icon: any;
  category: string;
  generateText: (leadName: string, projectName: string, bhk: string) => string;
}

const TEMPLATES: QuickTemplate[] = [
  {
    id: 'site-visit-invite',
    name: 'VIP Site Visit Pass',
    icon: Calendar,
    category: 'MEETING',
    generateText: (name, project, bhk) =>
      `Hello ${name || 'Sir/Ma\'am'},\n\n` +
      `Thank you for speaking with me. We are pleased to reserve your VIP Site Visit Pass for *${project || 'our luxury residential project'}* (${bhk || '1 & 2 BHK'}):\n\n` +
      `📅 Date: This Saturday / Sunday\n` +
      `⏰ Time: 11:30 AM (or as per your convenience)\n` +
      `📍 Location: Sector 35 Kharghar, Navi Mumbai (Direct Metro Line 1 connectivity)\n` +
      `🚗 Complimentary pickup & drop can be arranged for your family.\n\n` +
      `Could you please confirm if Saturday or Sunday morning suits you better?`,
  },
  {
    id: 'brochure-overview',
    name: 'Verified Brochure & Elevation',
    icon: FileText,
    category: 'ASSET',
    generateText: (name, project) =>
      `Hello ${name || 'Sir/Ma\'am'},\n\n` +
      `As discussed on our call, here is the official developer brochure and architectural master plan for *${project || 'our premium Navi Mumbai project'}*.\n\n` +
      `• MahaRERA Registered & CIDCO Approved\n` +
      `• 30+ Lifestyle Amenities (Clubhouse, Infinity Pool, Rooftop Deck)\n` +
      `• Zero brokerage through ZamZam direct developer mandate\n\n` +
      `Please let me know when you have had a moment to review, and I can share the sample flat walkthrough video.`,
  },
  {
    id: 'floor-plan-specs',
    name: 'Floor Plan & Layout Specs',
    icon: Layers,
    category: 'ASSET',
    generateText: (name, project, bhk) =>
      `Hello ${name || 'Sir/Ma\'am'},\n\n` +
      `Sharing the official architectural floor plan layout for the *${bhk || '2 BHK'}* unit at *${project || 'Kharghar'}*:\n\n` +
      `• Optimal carpet area with zero space wastage\n` +
      `• East-West Vastu compliant entrance options\n` +
      `• Large sundeck with panoramic hill views\n\n` +
      `Let me know if you would like me to calculate the exact all-in costing including stamp duty and registration.`,
  },
  {
    id: 'cost-sheet-transparent',
    name: 'Statutory Cost Sheet Breakdown',
    icon: DollarSign,
    category: 'COMMERCIAL',
    generateText: (name, project, bhk) =>
      `Hello ${name || 'Sir/Ma\'am'},\n\n` +
      `Here is the 100% transparent statutory costing breakdown for *${project || 'your selected unit'}* (${bhk || 'Residential'}):\n\n` +
      `• Agreement Value: Direct developer price\n` +
      `• Maharashtra Stamp Duty: 6% (MahaRERA compliant)\n` +
      `• GST: 5% (Under-construction) or 0% (OC Ready)\n` +
      `• Registration: ₹30,000 flat\n` +
      `• Zero Brokerage / Direct Mandate\n\n` +
      `We also have pre-approved home loan sanction letters ready with SBI and HDFC for quick disbursement.`,
  },
  {
    id: 'callback-polite',
    name: 'Polite Callback Reschedule',
    icon: Clock,
    category: 'FOLLOW_UP',
    generateText: (name) =>
      `Hello ${name || 'Sir/Ma\'am'},\n\n` +
      `Safwan Diwan here from ZamZam Properties. I tried reaching you just now regarding your real estate inquiry, but you may have been tied up.\n\n` +
      `Could you let me know what time today or tomorrow would be convenient for a quick 2-minute conversation? Thank you!`,
  },
];

interface WhatsAppQuickTemplatesProps {
  leadPhone?: string | null;
  leadName?: string | null;
  projectName?: string | null;
  preferredBhk?: number | string | null;
}

export function WhatsAppQuickTemplates({
  leadPhone,
  leadName,
  projectName,
  preferredBhk,
}: WhatsAppQuickTemplatesProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('site-visit-invite');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeTemplate = TEMPLATES.find((t) => t.id === selectedTemplateId) || TEMPLATES[0];
  const bhkString = preferredBhk ? `${preferredBhk} BHK` : '1 & 2 BHK';
  const resolvedText = activeTemplate.generateText(
    leadName || '',
    projectName || 'Emerald Heights / Premium Kharghar Project',
    bhkString
  );

  const handleSendWhatsApp = () => {
    if (!leadPhone) return;
    const url = `https://wa.me/${leadPhone.replace(/\D/g, '')}?text=${encodeURIComponent(resolvedText)}`;
    window.open(url, '_blank');
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(resolvedText);
    setCopiedId(activeTemplate.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-content">
            1-Click WhatsApp Templates ({TEMPLATES.length})
          </h4>
        </div>
        <span className="text-[10px] text-content-muted font-medium">Personalized for Lead</span>
      </div>

      {/* Template Selector Pills */}
      <div className="flex flex-wrap gap-1.5">
        {TEMPLATES.map((tmpl) => {
          const Icon = tmpl.icon;
          return (
            <button
              key={tmpl.id}
              type="button"
              onClick={() => setSelectedTemplateId(tmpl.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                selectedTemplateId === tmpl.id
                  ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                  : 'bg-surface-subtle text-content-secondary hover:text-content border border-border'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{tmpl.name}</span>
            </button>
          );
        })}
      </div>

      {/* Template Preview Card */}
      <div className="p-3 rounded-xl bg-surface-subtle border border-border space-y-2.5 animate-in fade-in duration-150">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-content flex items-center gap-1">
            <activeTemplate.icon className="w-3.5 h-3.5 text-emerald-500" />
            {activeTemplate.name}
          </span>
          <button
            type="button"
            onClick={handleCopyText}
            className="p-1 rounded hover:bg-surface text-content-muted hover:text-content transition-colors text-[10px] flex items-center gap-1 cursor-pointer"
            title="Copy message text"
          >
            {copiedId === activeTemplate.id ? (
              <>
                <Check className="w-3 h-3 text-status-success" />
                <span className="text-status-success font-bold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        <div className="p-2.5 rounded-lg bg-surface border border-border/80 text-[11px] text-content whitespace-pre-line leading-relaxed font-sans max-h-48 overflow-y-auto">
          {resolvedText}
        </div>

        {/* 1-Click Send Button */}
        <button
          type="button"
          onClick={handleSendWhatsApp}
          disabled={!leadPhone}
          className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send Personalized Template to {leadPhone || 'WhatsApp'}</span>
        </button>
      </div>
    </div>
  );
}
