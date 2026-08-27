'use client';

import React, { forwardRef } from 'react';
import { RefreshCw } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      xs: 'px-2.5 py-1.5 text-[11px] rounded-lg gap-1.5',
      sm: 'px-3.5 py-2 text-xs rounded-xl gap-2 font-bold',
      md: 'px-5 py-2.5 text-xs rounded-xl gap-2 font-bold',
      lg: 'px-6 py-3 text-sm rounded-2xl gap-2.5 font-extrabold',
    }[size];

    const variantClasses = {
      primary:
        'bg-accent text-white hover:bg-accent-hover shadow-xs border border-accent/30 active:scale-98',
      secondary:
        'bg-surface border border-border text-content hover:bg-surface-subtle shadow-2xs hover:border-border-strong active:scale-98',
      danger:
        'bg-status-danger text-white hover:bg-red-600 shadow-xs border border-status-danger/30 active:scale-98',
      ghost:
        'bg-transparent text-content-muted hover:text-content hover:bg-surface-subtle border border-transparent',
      outline:
        'bg-transparent border border-border text-content hover:border-accent hover:text-accent-text hover:bg-accent-soft/20',
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center transition-all duration-150 cursor-pointer select-none font-display disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${variantClasses} ${sizeClasses} ${className}`}
        {...props}
      >
        {isLoading ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
