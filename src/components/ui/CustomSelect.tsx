'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export interface CustomSelectOption {
  value: string;
  label: string;
  shortLabel?: string;
  icon?: React.ReactNode;
  description?: string;
  dotColor?: string;
  badge?: string;
  badgeColor?: string;
  group?: string;
  disabled?: boolean;
}

export interface CustomSelectProps {
  options: CustomSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  icon?: React.ReactNode;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  disabled?: boolean;
  align?: 'left' | 'right';
  direction?: 'auto' | 'down' | 'up';
  searchable?: boolean;
  searchPlaceholder?: string;
  id?: string;
  'aria-label'?: string;
  usePortal?: boolean;
}

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  label,
  icon,
  className = '',
  triggerClassName = '',
  menuClassName = '',
  size = 'sm',
  disabled = false,
  align = 'left',
  direction = 'auto',
  searchable,
  searchPlaceholder = 'Search...',
  id,
  'aria-label': ariaLabel,
  usePortal = true,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openUpward, setOpenUpward] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [maxMenuHeight, setMaxMenuHeight] = useState<number>(280);
  const [portalCoords, setPortalCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const isKeyboardNavRef = useRef(false);

  const isSearchEnabled = searchable ?? options.length > 8;

  // Resilient option matching (exact value -> case-insensitive value -> label match -> normalized value)
  const selectedOption = useMemo(() => {
    if (value === undefined || value === null) return undefined;
    const strVal = String(value).trim();
    if (!strVal) return undefined;

    // 1. Exact value match
    let found = options.find((opt) => opt.value === strVal);
    if (found) return found;

    // 2. Case-insensitive value match
    const lowerVal = strVal.toLowerCase();
    found = options.find((opt) => opt.value.toLowerCase() === lowerVal);
    if (found) return found;

    // 3. Exact label match (case-insensitive)
    found = options.find((opt) => opt.label.toLowerCase() === lowerVal);
    if (found) return found;

    // 4. Normalized match (replace underscores/dashes with spaces, strip parens)
    const normalizedVal = lowerVal.replace(/[_\-()]/g, ' ').replace(/\s+/g, ' ').trim();
    found = options.find((opt) => {
      const optValNorm = opt.value.toLowerCase().replace(/[_\-()]/g, ' ').replace(/\s+/g, ' ').trim();
      const optLabelNorm = opt.label.toLowerCase().replace(/[_\-()]/g, ' ').replace(/\s+/g, ' ').trim();
      return (
        optValNorm === normalizedVal ||
        optValNorm.startsWith(normalizedVal) ||
        normalizedVal.startsWith(optValNorm) ||
        optLabelNorm === normalizedVal ||
        optLabelNorm.startsWith(normalizedVal) ||
        normalizedVal.startsWith(optLabelNorm)
      );
    });
    if (found) return found;

    return undefined;
  }, [options, value]);

  // Display label resolution for the trigger button
  const triggerDisplay = useMemo(() => {
    if (selectedOption) {
      return {
        label: selectedOption.shortLabel || selectedOption.label,
        isPlaceholder: false,
      };
    }
    if (value !== undefined && value !== null && String(value).trim() !== '' && String(value).trim() !== 'ALL') {
      const raw = String(value).trim();
      // Humanize raw constant values (e.g. UNDER_CONSTRUCTION -> Under Construction)
      const humanized = raw
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
      return {
        label: humanized,
        isPlaceholder: false,
      };
    }
    return {
      label: placeholder,
      isPlaceholder: true,
    };
  }, [selectedOption, value, placeholder]);

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.description && opt.description.toLowerCase().includes(q)) ||
        (opt.group && opt.group.toLowerCase().includes(q)) ||
        opt.value.toLowerCase().includes(q)
    );
  }, [options, searchQuery]);

  // Compute open direction and dimensions based on viewport clearance
  const computePosition = useCallback(() => {
    if (!triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();

    // If trigger has scrolled completely out of the visible viewport, dismiss menu
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      return null;
    }

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let shouldOpenUpward = false;
    if (direction === 'up') {
      shouldOpenUpward = true;
    } else if (direction === 'down') {
      shouldOpenUpward = false;
    } else {
      // Auto: prefer opening downward. Only flip upward if space below is cramped (< 180px) and space above has substantially more room
      if (spaceBelow < 180 && spaceAbove > spaceBelow + 40) {
        shouldOpenUpward = true;
      } else {
        shouldOpenUpward = false;
      }
    }

    // Dynamic max-height bounded to viewport space with padding
    const availableSpace = shouldOpenUpward ? spaceAbove - 16 : spaceBelow - 16;
    const calculatedMaxHeight = Math.min(Math.max(availableSpace, 120), 320);

    const minW = size === 'xs' ? Math.max(rect.width, 130) : Math.max(rect.width, 160);
    const computedWidth = Math.max(rect.width, minW);
    const initialLeft = align === 'right' ? rect.right - computedWidth : rect.left;
    const maxLeft = Math.max(8, window.innerWidth - computedWidth - 8);
    const computedLeft = Math.min(Math.max(8, initialLeft), maxLeft);

    return {
      shouldOpenUpward,
      calculatedMaxHeight,
      coords: {
        top: shouldOpenUpward ? undefined : rect.bottom + 4,
        bottom: shouldOpenUpward ? Math.max(0, window.innerHeight - rect.top + 4) : undefined,
        left: computedLeft,
        width: computedWidth,
      },
    };
  }, [direction, align, size]);

  const updatePosition = useCallback(() => {
    const pos = computePosition();
    if (!pos) {
      setIsOpen(false);
      return;
    }

    setOpenUpward(pos.shouldOpenUpward);
    setMaxMenuHeight(pos.calculatedMaxHeight);
    if (usePortal) {
      setPortalCoords(pos.coords);
    }
  }, [computePosition, usePortal]);

  const openDropdown = useCallback(() => {
    if (disabled) return;
    const pos = computePosition();
    if (pos) {
      setOpenUpward(pos.shouldOpenUpward);
      setMaxMenuHeight(pos.calculatedMaxHeight);
      if (usePortal) {
        setPortalCoords(pos.coords);
      }
      setIsOpen(true);
    }
  }, [disabled, computePosition, usePortal]);

  const toggleDropdown = useCallback(() => {
    if (disabled) return;
    if (!isOpen) {
      openDropdown();
    } else {
      setIsOpen(false);
    }
  }, [disabled, isOpen, openDropdown]);

  // Open/Close effect & auto-focus
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setFocusedIndex(-1);
      isKeyboardNavRef.current = false;
      setPortalCoords(null);
      return;
    }

    updatePosition();

    if (isSearchEnabled) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else if (filteredOptions.length > 0) {
      const activeIdx = filteredOptions.findIndex((opt) => opt.value === value);
      setFocusedIndex(activeIdx >= 0 ? activeIdx : 0);
    }

    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }

    // Dismiss dropdown immediately when user scrolls anywhere on the page or outer containers.
    // Allow smooth scrolling inside the dropdown's own options list.
    const handleScroll = (event: Event) => {
      const target = event.target as Node | null;
      if (menuRef.current && target && menuRef.current.contains(target)) {
        return;
      }
      setIsOpen(false);
    };

    const handleResize = () => {
      setIsOpen(false);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, updatePosition, isSearchEnabled, filteredOptions, value]);

  // Close on outside click / touch (supports both local and portaled menu)
  useEffect(() => {
    if (!isOpen) return;

    function handleOutsideClick(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      const clickedTrigger = containerRef.current && containerRef.current.contains(target);
      const clickedMenu = menuRef.current && menuRef.current.contains(target);
      if (!clickedTrigger && !clickedMenu) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  // Scroll focused option into view ONLY during keyboard navigation
  useEffect(() => {
    if (!isOpen || focusedIndex < 0 || !listRef.current) return;
    if (!isKeyboardNavRef.current) return; // Prevent unexpected scroll jumps when hovering with mouse!
    const items = listRef.current.querySelectorAll<HTMLButtonElement>('[role="option"]');
    if (items[focusedIndex]) {
      items[focusedIndex].scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex, isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === 'Enter' || e.key === ' ') {
      if (!isOpen) {
        e.preventDefault();
        openDropdown();
      } else if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
        e.preventDefault();
        const targetOpt = filteredOptions[focusedIndex];
        if (!targetOpt.disabled) {
          onChange(targetOpt.value);
          setIsOpen(false);
          triggerRef.current?.focus();
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      isKeyboardNavRef.current = true;
      if (!isOpen) {
        openDropdown();
      } else {
        setFocusedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      isKeyboardNavRef.current = true;
      if (!isOpen) {
        openDropdown();
      } else {
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
      }
    } else if (e.key === 'Tab') {
      if (isOpen) {
        setIsOpen(false);
      }
    }
  };

  // Group options if applicable
  const groupedOptions = useMemo(() => {
    const groups: { [group: string]: CustomSelectOption[] } = {};
    const ungrouped: CustomSelectOption[] = [];

    filteredOptions.forEach((opt) => {
      if (opt.group) {
        if (!groups[opt.group]) groups[opt.group] = [];
        groups[opt.group].push(opt);
      } else {
        ungrouped.push(opt);
      }
    });

    return { groups, ungrouped, hasGroups: Object.keys(groups).length > 0 };
  }, [filteredOptions]);

  // Size styling tokens
  const sizeClasses = {
    xs: 'px-2.5 py-1 text-[11px] rounded-lg gap-1.5 min-h-[30px]',
    sm: 'px-3 py-2 text-xs rounded-xl gap-2 min-h-[36px]',
    md: 'px-3.5 py-2.5 text-xs font-semibold rounded-xl gap-2.5 min-h-[40px]',
    lg: 'px-4 py-3 text-sm font-semibold rounded-2xl gap-3 min-h-[46px]',
  }[size];

  const itemSizeClasses = {
    xs: 'px-2 py-1.5 text-[11px] rounded-lg min-h-[28px] gap-1.5',
    sm: 'px-3 py-2 text-xs rounded-xl min-h-[34px] gap-2.5',
    md: 'px-3.5 py-2 text-xs rounded-xl min-h-[36px] gap-2.5',
    lg: 'px-4 py-2.5 text-sm rounded-xl min-h-[40px] gap-3',
  }[size];

  const menuMinWidthClasses = {
    xs: 'min-w-[120px]',
    sm: 'min-w-[160px]',
    md: 'min-w-[190px]',
    lg: 'min-w-[220px]',
  }[size];

  function renderOptionItem(opt: CustomSelectOption, index: number) {
    const isSelected = selectedOption?.value === opt.value || opt.value === value;
    const isFocused = index === focusedIndex;

    return (
      <button
        key={opt.value}
        type="button"
        role="option"
        aria-selected={isSelected}
        disabled={opt.disabled}
        onClick={() => {
          if (opt.disabled) return;
          onChange(opt.value);
          setIsOpen(false);
          triggerRef.current?.focus();
        }}
        onMouseEnter={() => {
          isKeyboardNavRef.current = false;
          setFocusedIndex(index);
        }}
        className={`w-full flex items-center justify-between transition-all text-left cursor-pointer group select-none ${itemSizeClasses} ${
          opt.disabled
            ? 'opacity-40 cursor-not-allowed'
            : isSelected
            ? 'bg-accent text-white font-bold shadow-xs'
            : isFocused
            ? 'bg-accent-soft/80 text-accent-text font-semibold'
            : 'text-content hover:bg-surface-subtle hover:text-content font-medium'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {opt.dotColor && (
            <span
              className={`w-2 h-2 rounded-full ${opt.dotColor} shrink-0 transition-transform ${
                isSelected ? 'ring-2 ring-white/60' : 'group-hover:scale-125'
              }`}
            />
          )}
          {opt.icon && <span className={`shrink-0 ${isSelected ? 'text-white' : 'text-accent'}`}>{opt.icon}</span>}
          <div className="truncate flex-1">
            <div className="truncate leading-tight">{opt.label}</div>
            {opt.description && (
              <div
                className={`text-[10px] font-normal mt-0.5 truncate ${
                  isSelected ? 'text-white/80' : 'text-content-muted'
                }`}
              >
                {opt.description}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
          {opt.badge && (
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider ${
                opt.badgeColor
                  ? opt.badgeColor
                  : isSelected
                  ? 'bg-white/20 text-white'
                  : 'bg-surface-subtle text-content-secondary border border-border'
              }`}
            >
              {opt.badge}
            </span>
          )}
          {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
        </div>
      </button>
    );
  }

  const menuContent = (
    <div
      ref={menuRef}
      role="listbox"
      tabIndex={-1}
      className={`${
        usePortal
          ? 'fixed'
          : `absolute ${align === 'right' ? 'right-0' : 'left-0'} ${
              openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
            }`
      } w-full ${menuMinWidthClasses} z-[9999] flex flex-col rounded-xl bg-surface/95 border border-border shadow-xl p-1.5 backdrop-blur-md overflow-hidden ${
        openUpward ? 'shadcn-dropdown-up' : 'shadcn-dropdown-down'
      } ${menuClassName}`}
      style={{
        maxHeight: `${maxMenuHeight}px`,
        transition: 'none',
        ...(usePortal && portalCoords
          ? {
              top: portalCoords.top !== undefined ? `${portalCoords.top}px` : 'auto',
              bottom: portalCoords.bottom !== undefined ? `${portalCoords.bottom}px` : 'auto',
              left: `${portalCoords.left}px`,
              width: `${portalCoords.width}px`,
            }
          : {}),
      }}
    >
      {/* Optional Search Bar */}
      {isSearchEnabled && (
        <div className="p-1.5 border-b border-border/60 pb-2 mb-1 shrink-0">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-content-muted absolute left-2.5 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setFocusedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              className="w-full bg-surface-subtle border border-border rounded-xl pl-8 pr-7 py-1.5 text-xs text-content placeholder-content-muted focus:outline-hidden focus:border-accent font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                className="p-1 text-content-muted hover:text-content absolute right-1.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Options List */}
      <div ref={listRef} className="overflow-y-auto overscroll-contain space-y-0.5 custom-scrollbar flex-1">
        {filteredOptions.length === 0 ? (
          <div className="p-4 text-center text-xs text-content-muted">
            No matching options found
          </div>
        ) : groupedOptions.hasGroups ? (
          <>
            {groupedOptions.ungrouped.map((opt, i) => renderOptionItem(opt, i))}
            {Object.entries(groupedOptions.groups).map(([groupName, groupOpts]) => (
              <div key={groupName} className="mt-1 first:mt-0">
                <div className="px-2.5 py-1 text-[10px] font-bold font-mono text-content-muted uppercase tracking-wider border-b border-border/40 mb-1">
                  {groupName}
                </div>
                {groupOpts.map((opt, i) =>
                  renderOptionItem(opt, groupedOptions.ungrouped.length + i)
                )}
              </div>
            ))}
          </>
        ) : (
          filteredOptions.map((opt, i) => renderOptionItem(opt, i))
        )}
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className={`relative inline-block w-full ${className}`}>
      {label && (
        <label className="block text-xs font-bold text-content mb-1">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        id={id}
        aria-label={ariaLabel || label || placeholder}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={toggleDropdown}
        onKeyDown={handleKeyDown}
        className={`w-full flex items-center justify-between border font-semibold transition-all cursor-pointer select-none text-left ${
          isOpen
            ? 'border-accent ring-2 ring-accent/20 bg-surface shadow-xs'
            : 'border-border hover:border-accent/70 hover:bg-surface-subtle/50'
        } ${sizeClasses} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${
          triggerClassName ? triggerClassName : 'bg-surface-subtle text-content shadow-2xs'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 truncate flex-1">
          {icon && <span className="text-accent shrink-0">{icon}</span>}
          {selectedOption?.dotColor && (
            <span className={`w-2 h-2 rounded-full ${selectedOption.dotColor} shrink-0`} />
          )}
          {selectedOption?.icon && <span className="shrink-0 text-accent">{selectedOption.icon}</span>}
          <span
            className={`truncate text-xs ${
              triggerDisplay.isPlaceholder ? 'text-content-muted font-normal' : 'text-content font-medium'
            }`}
          >
            {triggerDisplay.label}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
          {selectedOption?.badge && (
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider hidden sm:inline-block ${
                selectedOption.badgeColor
                  ? selectedOption.badgeColor
                  : 'bg-surface text-content-secondary border border-border'
              }`}
            >
              {selectedOption.badge}
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-content-muted shrink-0 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-accent' : ''
            }`}
          />
        </div>
      </button>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        usePortal && typeof document !== 'undefined'
          ? (portalCoords
              ? createPortal(
                  menuContent,
                  containerRef.current?.closest('dialog') || document.body
                )
              : null)
          : menuContent
      )}
    </div>
  );
}
