'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  HelpCircle,
  Copy,
  Check,
  Sparkles,
  ChevronDown,
  ChevronUp,
  MessageSquare
} from 'lucide-react';

interface ObjectionItem {
  id: string;
  title: string;
  category: 'PRICE' | 'RISK' | 'LOCATION' | 'TIMING' | 'FAMILY';
  talkingPoints: string[];
  rebuttalScript: string;
}

const OBJECTIONS: ObjectionItem[] = [
  {
    id: 'price-high',
    title: 'Budget Too High / Price Mismatch',
    category: 'PRICE',
    talkingPoints: [
      'Highlight 10:90 or 20:80 Construction-Linked Payment (CLP) plans.',
      'Kharghar/Taloja corridor capital values increased 12-14% post-metro commissioning.',
      'Bank tie-ups with SBI/HDFC for zero-processing fee and pre-approved home loan rates.',
    ],
    rebuttalScript:
      'Sir, I completely understand budget sensitivity. The advantage with this project is the developer\'s Construction-Linked Plan (CLP)—you only disburse 10% now. With Navi Mumbai Metro operational, capital values here are compounding at 12% annually, making this the lowest entry price before the next price revision.',
  },
  {
    id: 'construction-risk',
    title: 'Under-Construction Delay Risk',
    category: 'RISK',
    talkingPoints: [
      'MahaRERA registered with 70% statutory escrow bank ring-fencing.',
      'Developer track record of delivering 4+ residential towers on schedule.',
      'MahaRERA section 18 penalty ensures monthly interest protection for any developer delay.',
    ],
    rebuttalScript:
      'I appreciate your caution, sir. That is exactly why we only represent 100% MahaRERA-certified developers with verified escrow accounts. Under MahaRERA law, 70% of buyer collections are locked in escrow strictly for construction, and all approvals from CIDCO are already in place.',
  },
  {
    id: 'distance-commute',
    title: 'Distance from Station / Commute to Office',
    category: 'LOCATION',
    talkingPoints: [
      'Metro Line 1 station is within 5–8 mins walking / auto distance.',
      'Kharghar-Turbhe link road will slash BKC travel time to 35 minutes.',
      'Navi Mumbai International Airport (NMIA) commercial cluster is only 20 mins away.',
    ],
    rebuttalScript:
      'Ma\'am, with the newly opened Navi Mumbai Metro Line 1, you can reach Kharghar Belapur in just 12 minutes without any traffic. Plus, once the Kharghar-Turbhe tunnel opens, the commute to BKC and South Mumbai drops to under 40 minutes.',
  },
  {
    id: 'ready-possession',
    title: 'Looking Only for Ready Possession (OC)',
    category: 'TIMING',
    talkingPoints: [
      'We have select OC-received inventory where 5% GST is completely waived.',
      'Immediate rental yield starting from ₹18,000 to ₹32,000/month.',
      'Instant possession with zero interest-during-construction burden.',
    ],
    rebuttalScript:
      'Understood sir. We actually have OC-ready inventory in Sector 35 Kharghar where you save the 5% GST completely! You get key handover within 30 days and can either move in immediately or generate ₹20,000+ monthly rental yield.',
  },
  {
    id: 'family-decision',
    title: 'Need to Discuss with Family / Spouse First',
    category: 'FAMILY',
    talkingPoints: [
      'Real estate is a collective family decision—invite entire family.',
      'Complimentary weekend cab pickup and drop arranged by ZamZam.',
      'Sample flat, kids play area, and clubhouse tour ready for inspection.',
    ],
    rebuttalScript:
      'Sir, purchasing a home is a milestone family decision. How about we arrange a private VIP visit this Saturday morning? We can organize a complimentary cab pickup for you and your family so you can experience the sample flat, views, and clubhouse together before deciding.',
  },
];

interface ObjectionBattlecardsProps {
  leadPhone?: string | null;
  leadName?: string | null;
}

export function ObjectionBattlecards({ leadPhone, leadName }: ObjectionBattlecardsProps) {
  const [activeObjectionId, setActiveObjectionId] = useState<string>('price-high');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeObjection = OBJECTIONS.find((o) => o.id === activeObjectionId) || OBJECTIONS[0];

  const handleCopyScript = (script: string, id: string) => {
    navigator.clipboard.writeText(script);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendToWhatsApp = (script: string) => {
    if (!leadPhone) return;
    const text = encodeURIComponent(
      `Hello ${leadName || 'Sir/Ma\'am'}, Safwan here following up on our call:\n\n${script}\n\nLet me know if you would like me to share more details.`
    );
    window.open(`https://wa.me/${leadPhone.replace(/\D/g, '')}?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-accent" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-content">
            Objection Battlecards ({OBJECTIONS.length})
          </h4>
        </div>
        <span className="text-[10px] text-content-muted font-medium">Navi Mumbai Market Rebuttals</span>
      </div>

      {/* Objection Category Selector Pills */}
      <div className="flex flex-wrap gap-1.5">
        {OBJECTIONS.map((obj) => (
          <button
            key={obj.id}
            type="button"
            onClick={() => setActiveObjectionId(obj.id)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
              activeObjectionId === obj.id
                ? 'bg-accent text-white shadow-2xs font-bold'
                : 'bg-surface-subtle text-content-secondary hover:text-content border border-border'
            }`}
          >
            {obj.title.split('/')[0].trim()}
          </button>
        ))}
      </div>

      {/* Active Battlecard Card */}
      <div className="p-3.5 rounded-xl bg-surface-subtle border border-border space-y-3 animate-in fade-in duration-150">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-accent tracking-wider">
              {activeObjection.category} OBJECTION
            </span>
            <h5 className="text-xs font-bold text-content font-display">{activeObjection.title}</h5>
          </div>

          <button
            type="button"
            onClick={() => handleCopyScript(activeObjection.rebuttalScript, activeObjection.id)}
            className="p-1.5 rounded-lg bg-surface hover:bg-surface-raised border border-border text-content-secondary hover:text-content transition-all cursor-pointer text-[10px] flex items-center gap-1 shrink-0"
            title="Copy Rebuttal Script to Clipboard"
          >
            {copiedId === activeObjection.id ? (
              <>
                <Check className="w-3 h-3 text-status-success" />
                <span className="text-status-success font-bold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy Script</span>
              </>
            )}
          </button>
        </div>

        {/* 3 Key Talking Points */}
        <div className="space-y-1.5 text-[11px] text-content-secondary">
          <span className="text-[10px] font-bold uppercase tracking-wider text-content-muted">Key Talking Points:</span>
          <ul className="space-y-1">
            {activeObjection.talkingPoints.map((point, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-accent font-bold">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Suggested Verbatim Script */}
        <div className="p-2.5 rounded-lg bg-surface border border-border/80 text-[11px] text-content italic leading-relaxed">
          &ldquo;{activeObjection.rebuttalScript}&rdquo;
        </div>

        {/* WhatsApp Send Action */}
        {leadPhone && (
          <button
            type="button"
            onClick={() => handleSendToWhatsApp(activeObjection.rebuttalScript)}
            className="w-full py-1.5 rounded-lg bg-status-success-surface hover:bg-status-success/20 border border-status-success/40 text-status-success text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <MessageSquare className="w-3 h-3 text-status-success" />
            <span>Send Follow-Up Rebuttal on WhatsApp</span>
          </button>
        )}
      </div>
    </div>
  );
}
