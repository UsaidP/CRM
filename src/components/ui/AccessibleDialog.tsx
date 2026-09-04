'use client';

import React, { useEffect, useRef } from 'react';

interface AccessibleDialogProps {
  open: boolean;
  onClose: () => void;
  titleId: string;
  descriptionId?: string;
  panelClassName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  children: React.ReactNode;
  closeOnClickOutside?: boolean;
}

const sizeClasses: Record<string, string> = {
  sm: '!max-w-md',
  md: '!max-w-lg',
  lg: '!max-w-2xl',
  xl: '!max-w-4xl',
  '2xl': '!max-w-6xl',
  full: '!max-w-[95vw]',
};

export function AccessibleDialog({
  open,
  onClose,
  titleId,
  descriptionId,
  panelClassName = '',
  size = 'md',
  children,
  closeOnClickOutside = true,
}: AccessibleDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const isBackdropMouseDownRef = useRef(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      returnFocusRef.current = document.activeElement as HTMLElement | null;
      try {
        dialog.showModal();
      } catch (err) {
        console.warn('[AccessibleDialog] showModal caught:', err);
      }
      requestAnimationFrame(() => {
        const firstControl = dialog.querySelector<HTMLElement>(
          '[data-dialog-autofocus], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]):not([data-dialog-close]), a[href], [tabindex]:not([tabindex="-1"])'
        );
        firstControl?.focus();
      });
    } else if (!open && dialog.open) {
      try {
        dialog.close();
      } catch (err) {
        console.warn('[AccessibleDialog] close caught:', err);
      }
    }

    return () => {
      if (dialog.open) {
        try {
          dialog.close();
        } catch {}
      }
      if (open) {
        try {
          returnFocusRef.current?.focus();
        } catch {}
      }
    };
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (event: Event) => {
      event.preventDefault();
      onCloseRef.current();
    };
    const handleClose = () => {
      try {
        returnFocusRef.current?.focus();
      } catch {}
    };

    dialog.addEventListener('cancel', handleCancel);
    dialog.addEventListener('close', handleClose);
    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      dialog.removeEventListener('close', handleClose);
    };
  }, []);

  const sizeClass = sizeClasses[size] || 'max-w-xl';

  return (
    <dialog
      ref={dialogRef}
      className="app-dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onMouseDown={(event) => {
        // Only mark true if the click originated on the backdrop itself,
        // preventing accidental closes when users select text inside form inputs and drag outward.
        isBackdropMouseDownRef.current = event.target === dialogRef.current;
      }}
      onMouseUp={(event) => {
        if (event.target !== dialogRef.current) {
          isBackdropMouseDownRef.current = false;
        }
      }}
      onClick={(event) => {
        // If user was selecting text, do not close modal
        const hasTextSelection =
          typeof window !== 'undefined' &&
          (window.getSelection()?.toString().length || 0) > 0;

        if (
          closeOnClickOutside &&
          event.target === dialogRef.current &&
          isBackdropMouseDownRef.current &&
          !hasTextSelection
        ) {
          onCloseRef.current();
        }
        isBackdropMouseDownRef.current = false;
      }}
    >
      <div className={`app-dialog__panel w-full ${sizeClass} ${panelClassName}`}>{children}</div>
    </dialog>
  );
}
