'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  label?: string;
  fallbackUrl?: string;
  className?: string;
  variant?: 'button' | 'link' | 'icon' | 'pill';
  title?: string;
}

export function BackButton({
  label = 'Back',
  fallbackUrl = '/reports',
  className = '',
  variant = 'button',
  title = 'Go back to previous page',
}: BackButtonProps) {
  const router = useRouter();

  const handleBack = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackUrl);
    }
  };

  if (variant === 'link') {
    return (
      <button
        type="button"
        onClick={handleBack}
        title={title}
        aria-label={title}
        className={`inline-flex items-center gap-1.5 text-xs text-muted hover:text-brand-text hover:text-brand transition font-medium cursor-pointer ${className}`}
      >
        <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
        <span>{label}</span>
      </button>
    );
  }

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleBack}
        title={title}
        aria-label={title}
        className={`flex h-8 w-8 items-center justify-center rounded-lg border border border-strong bg-white bg-surface text-secondary hover:text-primary text-muted hover:text-primary hover:bg-canvas hover:bg-surface-raised transition shadow-xs cursor-pointer ${className}`}
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
    );
  }

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={handleBack}
        title={title}
        aria-label={title}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border border border-strong bg-canvas bg-surface text-secondary text-muted hover:bg-surface-sunken hover:bg-surface-raised hover:text-primary hover:text-primary transition shadow-xs cursor-pointer ${className}`}
      >
        <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
        <span>{label}</span>
      </button>
    );
  }

  // Default 'button'
  return (
    <button
      type="button"
      onClick={handleBack}
      title={title}
      aria-label={title}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border border-strong bg-white bg-surface text-secondary text-primary-inverse hover:bg-canvas hover:bg-surface-raised hover:text-brand-text hover:text-brand transition shadow-xs cursor-pointer ${className}`}
    >
      <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
      <span>{label}</span>
    </button>
  );
}
