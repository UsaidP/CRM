'use client';

import React, { forwardRef } from 'react';

export interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  containerClassName?: string;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  (
    {
      label,
      helperText,
      error,
      icon,
      rightElement,
      className = '',
      containerClassName = '',
      id,
      required,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/[^a-z0-9]+/g, '-') : undefined);

    return (
      <div className={`space-y-1.5 ${containerClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[11px] font-bold text-content-muted uppercase tracking-wider font-display"
          >
            {label} {required && <span className="text-status-danger">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-content-muted">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            required={required}
            className={`w-full h-11 px-4 bg-surface border rounded-xl text-xs font-semibold text-content placeholder:text-content-muted transition-all duration-150 shadow-2xs focus:outline-none ${
              icon ? 'pl-11' : ''
            } ${rightElement ? 'pr-11' : ''} ${
              error
                ? 'border-status-danger ring-2 ring-status-danger/20 focus:border-status-danger'
                : 'border-border focus:border-accent focus:ring-2 focus:ring-accent/20 hover:border-border-strong'
            } ${className}`}
            {...props}
          />

          {rightElement && (
            <div className="absolute right-3 flex items-center">{rightElement}</div>
          )}
        </div>

        {error ? (
          <p className="text-[11px] font-bold text-status-danger">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] text-content-muted">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';

export interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  containerClassName?: string;
}

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ label, helperText, error, className = '', containerClassName = '', id, required, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/[^a-z0-9]+/g, '-') : undefined);

    return (
      <div className={`space-y-1.5 ${containerClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[11px] font-bold text-content-muted uppercase tracking-wider font-display"
          >
            {label} {required && <span className="text-status-danger">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          id={inputId}
          required={required}
          className={`w-full p-3.5 bg-surface border rounded-xl text-xs font-medium text-content placeholder:text-content-muted transition-all duration-150 shadow-2xs focus:outline-none ${
            error
              ? 'border-status-danger ring-2 ring-status-danger/20 focus:border-status-danger'
              : 'border-border focus:border-accent focus:ring-2 focus:ring-accent/20 hover:border-border-strong'
          } ${className}`}
          {...props}
        />

        {error ? (
          <p className="text-[11px] font-bold text-status-danger">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] text-content-muted">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

FormTextarea.displayName = 'FormTextarea';
