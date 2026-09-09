'use client';

import React from 'react';
import { Search } from 'lucide-react';
import { CustomSelect, type CustomSelectOption } from '@/components/ui/CustomSelect';

export interface InventoryFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedMarket: string;
  onMarketChange: (value: string) => void;
  selectedBhk: string;
  onBhkChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  marketOptions: CustomSelectOption[];
}

export function InventoryFilterBar({
  searchQuery,
  onSearchChange,
  selectedMarket,
  onMarketChange,
  selectedBhk,
  onBhkChange,
  selectedStatus,
  onStatusChange,
  marketOptions,
}: InventoryFilterBarProps) {
  return (
    <div className="p-3 sm:p-4 rounded-2xl bg-surface border border-border shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center gap-3 text-xs font-sans">
      <div className="relative flex-1 min-w-0 flex items-center">
        <Search className="w-4 h-4 text-content-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <label htmlFor="inventory-search" className="sr-only">
          Search inventory records
        </label>
        <input
          id="inventory-search"
          name="inventorySearch"
          type="text"
          placeholder="Search by project, unit number, RERA ID, or micro-market…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="search-input w-full bg-surface-subtle/70 border border-border rounded-xl pl-9 pr-12 py-2.5 text-xs text-content placeholder:text-content-muted focus:outline-none focus:border-accent shadow-2xs"
        />
        <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-bold text-content-muted bg-surface border border-border rounded-md absolute right-3 top-1/2 -translate-y-1/2 shadow-2xs pointer-events-none">
          ⌘K
        </kbd>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 lg:flex items-center gap-2.5 shrink-0">
        <div className="w-full sm:w-auto lg:w-[220px]">
          <CustomSelect
            options={marketOptions}
            value={selectedMarket}
            onChange={onMarketChange}
          />
        </div>

        <div className="w-full sm:w-auto lg:w-[155px]">
          <CustomSelect
            options={[
              { value: 'ALL', label: 'All Configurations' },
              { value: '1', label: '1 BHK' },
              { value: '2', label: '2 BHK' },
              { value: '3', label: '3 BHK' },
            ]}
            value={selectedBhk}
            onChange={onBhkChange}
          />
        </div>

        <div className="w-full sm:w-auto lg:w-[195px]">
          <CustomSelect
            options={[
              { value: 'ALL', label: 'All Audit Statuses' },
              {
                value: 'ACTIVE_MARKETABLE',
                label: 'Active Marketable (<14d)',
                dotColor: 'bg-emerald-500',
                description: 'Fresh & ready to pitch',
              },
              {
                value: 'STALE_EXPIRED',
                label: 'Stale Expired (>14d)',
                dotColor: 'bg-rose-500',
                description: 'Requires physical audit',
              },
            ]}
            value={selectedStatus}
            onChange={onStatusChange}
          />
        </div>
      </div>
    </div>
  );
}
