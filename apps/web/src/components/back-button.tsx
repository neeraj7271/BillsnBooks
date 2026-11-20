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
        className={`inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 transition font-medium cursor-pointer ${className}`}
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
        className={`flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs cursor-pointer ${className}`}
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
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition shadow-xs cursor-pointer ${className}`}
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
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-purple-600 dark:hover:text-purple-400 transition shadow-xs cursor-pointer ${className}`}
    >
      <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
      <span>{label}</span>
    </button>
  );
}
