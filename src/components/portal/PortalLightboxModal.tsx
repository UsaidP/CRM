'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Building2 } from 'lucide-react';
import { AccessibleDialog } from '@/components/ui/AccessibleDialog';
import { InventoryMediaAsset } from '@/lib/inventory-media';

interface LightboxData {
  unit: any;
  photos: InventoryMediaAsset[];
  currentIndex: number;
}

interface PortalLightboxModalProps {
  lightboxState: LightboxData | null;
  onClose: () => void;
  onNavigate: (newIndex: number) => void;
}

export function PortalLightboxModal({
  lightboxState,
  onClose,
  onNavigate,
}: PortalLightboxModalProps) {
  useEffect(() => {
    if (!lightboxState) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        const prevIdx =
          (lightboxState.currentIndex - 1 + lightboxState.photos.length) %
          lightboxState.photos.length;
        onNavigate(prevIdx);
      } else if (e.key === 'ArrowRight') {
        const nextIdx = (lightboxState.currentIndex + 1) % lightboxState.photos.length;
        onNavigate(nextIdx);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxState, onClose, onNavigate]);

  if (!lightboxState) return null;

  const currentPhoto = lightboxState.photos[lightboxState.currentIndex];

  return (
    <AccessibleDialog
      open={Boolean(lightboxState)}
      onClose={onClose}
      titleId="lightbox-modal-title"
      descriptionId="lightbox-modal-description"
      size="xl"
      panelClassName="p-0 rounded-3xl border border-border shadow-2xl overflow-hidden bg-surface max-h-[92vh] flex flex-col"
    >
      <div className="flex flex-col h-full overflow-y-auto bg-surface text-content">
        {/* Header Bar */}
        <div className="px-5 py-3.5 bg-surface-raised border-b border-border flex items-center justify-between z-10">
          <div className="min-w-0">
            <h3 id="lightbox-modal-title" className="text-sm font-bold text-content font-serif truncate">
              {currentPhoto?.title || 'Verified High-Definition Photography'}
            </h3>
            <p id="lightbox-modal-description" className="text-xs text-content-muted font-mono truncate">
              {lightboxState.unit?.project?.projectName} • Image {lightboxState.currentIndex + 1} of{' '}
              {lightboxState.photos.length}
            </p>
          </div>

          <button
            type="button"
            data-dialog-close
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-surface-subtle hover:bg-surface-raised border border-border grid place-items-center text-content-muted hover:text-content transition-colors cursor-pointer shrink-0"
            aria-label="Close photo lightbox"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main Photo Viewport */}
        <div className="relative flex-1 min-h-[350px] sm:min-h-[500px] flex items-center justify-center p-3 sm:p-6 bg-surface-subtle/40">
          <AnimatePresence mode="wait">
            <motion.img
              key={currentPhoto?.url || lightboxState.currentIndex}
              src={currentPhoto?.url}
              alt={currentPhoto?.title || ''}
              initial={{ opacity: 0.5, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0.5, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="max-h-[65vh] max-w-full object-contain rounded-lg shadow-2xl"
            />
          </AnimatePresence>

          {/* Prev/Next Buttons */}
          {lightboxState.photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => {
                  const prev =
                    (lightboxState.currentIndex - 1 + lightboxState.photos.length) %
                    lightboxState.photos.length;
                  onNavigate(prev);
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-surface/90 hover:bg-surface text-content grid place-items-center border border-border shadow-xl backdrop-blur transition-[background-color,border-color,box-shadow,transform] duration-200 active:scale-95 cursor-pointer"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                type="button"
                onClick={() => {
                  const next = (lightboxState.currentIndex + 1) % lightboxState.photos.length;
                  onNavigate(next);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-surface/90 hover:bg-surface text-content grid place-items-center border border-border shadow-xl backdrop-blur transition-[background-color,border-color,box-shadow,transform] duration-200 active:scale-95 cursor-pointer"
                aria-label="Next image"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnail Filmstrip & Caption */}
        <div className="p-4 bg-surface-raised border-t border-border space-y-3">
          {currentPhoto?.caption && (
            <p className="text-xs text-content-secondary text-center max-w-2xl mx-auto">
              {currentPhoto.caption}
            </p>
          )}

          {lightboxState.photos.length > 1 && (
            <div className="flex items-center justify-center gap-2 overflow-x-auto py-1 max-w-2xl mx-auto">
              {lightboxState.photos.map((ph, idx) => (
                <button
                  key={ph.id || idx}
                  type="button"
                  onClick={() => onNavigate(idx)}
                  className={`w-14 h-11 rounded-lg overflow-hidden shrink-0 border-2 transition-[background-color,border-color,box-shadow,transform] duration-200 cursor-pointer ${
                    lightboxState.currentIndex === idx
                      ? 'border-accent ring-2 ring-accent/40 scale-105'
                      : 'border-border opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={ph.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </AccessibleDialog>
  );
}
