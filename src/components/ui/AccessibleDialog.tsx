'use client';

import React, { useEffect, useRef } from 'react';

interface AccessibleDialogProps {
  open: boolean;
  onClose: () => void;
  titleId: string;
  descriptionId?: string;
  panelClassName?: string;
  children: React.ReactNode;
}

export function AccessibleDialog({
  open,
  onClose,
  titleId,
  descriptionId,
  panelClassName = '',
  children,
}: AccessibleDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      returnFocusRef.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
      requestAnimationFrame(() => {
        const firstControl = dialog.querySelector<HTMLElement>(
          '[data-dialog-autofocus], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]):not([data-dialog-close]), a[href], [tabindex]:not([tabindex="-1"])'
        );
        firstControl?.focus();
      });
    } else if (!open && dialog.open) {
      dialog.close();
    }

    return () => {
      if (dialog.open) dialog.close();
      if (open) returnFocusRef.current?.focus();
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
      returnFocusRef.current?.focus();
    };

    dialog.addEventListener('cancel', handleCancel);
    dialog.addEventListener('close', handleClose);
    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      dialog.removeEventListener('close', handleClose);
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="app-dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <div className={`app-dialog__panel ${panelClassName}`}>{children}</div>
    </dialog>
  );
}
