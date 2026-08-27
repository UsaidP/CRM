'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

export interface CustomSelectOption {
  value: string;
  label: string;
  shortLabel?: string;
  icon?: React.ReactNode;
  description?: string;
  dotColor?: string;
  group?: string;
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
  size?: 'xs' | 'sm' | 'md';
  disabled?: boolean;
  align?: 'left' | 'right';
  direction?: 'auto' | 'down' | 'up';
  id?: string;
  'aria-label'?: string;
}

interface MenuCoords {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
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
  id,
  'aria-label': ariaLabel,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<MenuCoords | null>(null);
  const [openUpward, setOpenUpward] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Compute fixed position relative to viewport
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();

    // Check if trigger is off-screen
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      setIsOpen(false);
      return;
    }

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let isUp = false;
    if (direction === 'up') {
      isUp = true;
    } else if (direction === 'down') {
      isUp = false;
    } else {
      // Auto: prefer downward unless insufficient space below and more space above
      if (spaceBelow < 280 && spaceAbove > spaceBelow) {
        isUp = true;
      } else {
        isUp = false;
      }
    }

    setOpenUpward(isUp);

    const minMenuWidth = 220;
    const menuWidth = Math.max(rect.width, minMenuWidth);

    let left = align === 'right' ? rect.right - menuWidth : rect.left;
    const margin = 8;

    // Viewport horizontal clamping
    if (left + menuWidth > window.innerWidth - margin) {
      left = window.innerWidth - menuWidth - margin;
    }
    if (left < margin) {
      left = margin;
    }

    const availableHeight = isUp ? spaceAbove - 16 : spaceBelow - 16;
    const maxHeight = Math.max(120, Math.min(320, availableHeight));

    setCoords({
      top: isUp ? undefined : rect.bottom + 6,
      bottom: isUp ? window.innerHeight - rect.top + 6 : undefined,
      left,
      width: menuWidth,
      maxHeight,
    });
  }, [align, direction]);

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleScroll = () => {
      updatePosition();
    };

    const handleResize = () => {
      updatePosition();
    };

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, updatePosition]);

  // Close on click outside (checking both container and portalled menu)
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const clickedTrigger = containerRef.current && containerRef.current.contains(target);
      const clickedMenu = menuRef.current && menuRef.current.contains(target);

      if (!clickedTrigger && !clickedMenu) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        const currentIndex = options.findIndex((opt) => opt.value === value);
        const nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
        onChange(options[nextIndex].value);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        const currentIndex = options.findIndex((opt) => opt.value === value);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
        onChange(options[prevIndex].value);
      }
    }
  };

  // Group options if applicable
  const groupedOptions: { [group: string]: CustomSelectOption[] } = {};
  const ungroupedOptions: CustomSelectOption[] = [];

  options.forEach((opt) => {
    if (opt.group) {
      if (!groupedOptions[opt.group]) {
        groupedOptions[opt.group] = [];
      }
      groupedOptions[opt.group].push(opt);
    } else {
      ungroupedOptions.push(opt);
    }
  });

  const hasGroups = Object.keys(groupedOptions).length > 0;

  // Size styling
  const sizeClasses = {
    xs: 'px-2.5 py-1 text-[11px] rounded-lg gap-1.5',
    sm: 'px-3.5 py-2.5 text-xs rounded-xl gap-2',
    md: 'px-4 py-2.5 text-xs font-semibold rounded-xl gap-2.5',
  }[size];

  function renderOptionItem(opt: CustomSelectOption) {
    const isSelected = opt.value === value;

    return (
      <button
        key={opt.value}
        type="button"
        role="option"
        aria-selected={isSelected}
        onClick={() => {
          onChange(opt.value);
          setIsOpen(false);
          triggerRef.current?.focus();
        }}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer group ${
          isSelected
            ? 'bg-accent-soft text-accent-text font-bold shadow-2xs'
            : 'text-content hover:bg-accent-soft/30 hover:text-accent-text'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {opt.dotColor && (
            <span
              className={`w-2 h-2 rounded-full ${opt.dotColor} shrink-0 transition-transform group-hover:scale-125`}
            />
          )}
          {opt.icon && <span className="shrink-0">{opt.icon}</span>}
          <div className="truncate">
            <div className="truncate leading-tight font-medium">{opt.label}</div>
            {opt.description && (
              <div className="text-[10px] text-content-muted font-normal mt-0.5 truncate">
                {opt.description}
              </div>
            )}
          </div>
        </div>

        {isSelected && <Check className="w-3.5 h-3.5 text-accent shrink-0 ml-2" />}
      </button>
    );
  }

  const portalTarget =
    mounted && typeof document !== 'undefined'
      ? (containerRef.current?.closest('dialog') || document.body)
      : null;

  const dropdownMenu =
    isOpen && mounted && coords && portalTarget
      ? createPortal(
          <div
            ref={menuRef}
            role="listbox"
            tabIndex={-1}
            style={{
              position: 'fixed',
              top: coords.top !== undefined ? `${coords.top}px` : 'auto',
              bottom: coords.bottom !== undefined ? `${coords.bottom}px` : 'auto',
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              maxHeight: `${coords.maxHeight}px`,
              zIndex: 99999,
            }}
            className={`overflow-y-auto rounded-2xl bg-surface border border-border/80 shadow-2xl p-1.5 animate-in fade-in-0 zoom-in-95 duration-150 backdrop-blur-md ${menuClassName}`}
          >
            {hasGroups ? (
              <>
                {ungroupedOptions.map((opt) => renderOptionItem(opt))}
                {Object.entries(groupedOptions).map(([groupName, groupOpts]) => (
                  <div key={groupName} className="mt-1 first:mt-0">
                    <div className="px-2.5 py-1.5 text-[10px] font-bold font-mono text-content-muted uppercase tracking-wider border-b border-border/40 mb-1">
                      {groupName}
                    </div>
                    {groupOpts.map((opt) => renderOptionItem(opt))}
                  </div>
                ))}
              </>
            ) : (
              options.map((opt) => renderOptionItem(opt))
            )}
          </div>,
          portalTarget
        )
      : null;

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {label && (
        <label className="block text-[11px] font-bold text-content-muted uppercase tracking-wider mb-1">
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
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => {
              const next = !prev;
              if (next) updatePosition();
              return next;
            });
          }
        }}
        onKeyDown={handleKeyDown}
        className={`w-full flex items-center justify-between border font-semibold transition-all cursor-pointer select-none ${
          isOpen
            ? 'border-accent ring-2 ring-accent/20 bg-surface shadow-md'
            : 'border-border hover:border-accent/70 hover:bg-surface-subtle/60 hover:shadow-xs'
        } ${sizeClasses} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${
          triggerClassName ? triggerClassName : 'bg-surface text-content shadow-2xs'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 truncate">
          {icon && <span className="text-accent shrink-0">{icon}</span>}
          {selectedOption?.dotColor && (
            <span className={`w-2 h-2 rounded-full ${selectedOption.dotColor} shrink-0`} />
          )}
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span className={`truncate font-semibold ${selectedOption ? 'text-content' : 'text-content-muted'}`}>
            {selectedOption ? (selectedOption.shortLabel || selectedOption.label) : placeholder}
          </span>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-content-muted shrink-0 transition-transform duration-200 ml-1.5 ${
            isOpen ? 'rotate-180 text-accent' : ''
          }`}
        />
      </button>

      {/* Portalled Dropdown Menu */}
      {dropdownMenu}
    </div>
  );
}
