'use client';
import { logger } from '@/lib/logger';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Check,
  Settings,
  MoreVertical,
  ClipboardCheck,
  Receipt,
  CreditCard,
  Sparkles,
  ShieldCheck,
  FileSpreadsheet,
  CheckCheck,
  Clock,
  ExternalLink,
  Inbox,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Button, Badge, Skeleton, formatDate, cn } from '@platform/ui';
import { apiClient } from '@/lib/api-client';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
  snoozedUntil?: string;
}

function getRelativeDateGroup(dateStr: string): 'Today' | 'Yesterday' | 'This week' | 'Earlier' {
  const date = new Date(dateStr);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
  const startOfWeek = new Date(startOfToday.getTime() - 6 * 86400000);

  if (date >= startOfToday) return 'Today';
  if (date >= startOfYesterday) return 'Yesterday';
  if (date >= startOfWeek) return 'This week';
  return 'Earlier';
}

function getRelativeTimeString(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDate(date, 'short');
}

function resolveActionUrl(item: NotificationItem): string | null {
  if (item.actionUrl) return item.actionUrl;
  if (item.entityType === 'INVOICE' && item.entityId) return `/invoices/${item.entityId}`;
  if (item.entityType === 'APPROVAL') return '/approvals';
  if (item.entityType === 'BANK' || item.entityType === 'BANK_TRANSACTION') return '/banking';
  if (item.entityType === 'VOUCHER') return '/vouchers';
  if (item.entityType === 'IMPORT') return '/imports';
  return null;
}

function getNotificationIcon(type: string, entityType?: string) {
  const lower = (type + ' ' + (entityType || '')).toLowerCase();
  if (lower.includes('approval') || lower.includes('task')) {
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-status-warning-subtle text-status-warning-text shrink-0">
        <ClipboardCheck className="h-3.5 w-3.5" />
      </div>
    );
  }
  if (lower.includes('payment') || lower.includes('settle')) {
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-status-success-subtle text-status-success-text shrink-0">
        <CreditCard className="h-3.5 w-3.5" />
      </div>
    );
  }
  if (lower.includes('invoice')) {
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-subtle text-brand-text shrink-0">
        <Receipt className="h-3.5 w-3.5" />
      </div>
    );
  }
  if (lower.includes('security') || lower.includes('lock')) {
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-status-info-subtle text-status-info-text shrink-0">
        <ShieldCheck className="h-3.5 w-3.5" />
      </div>
    );
  }
  if (lower.includes('import') || lower.includes('register')) {
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-surface-sunken text-primary shrink-0">
        <FileSpreadsheet className="h-3.5 w-3.5" />
      </div>
    );
  }
  if (lower.includes('reminder')) {
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-status-warning-subtle text-status-warning-text shrink-0">
        <Clock className="h-3.5 w-3.5" />
      </div>
    );
  }
  return (
    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-surface-sunken text-muted shrink-0">
      <Sparkles className="h-3.5 w-3.5" />
    </div>
  );
}

export function NotificationCenter() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'All' | 'Unread' | 'Mentions' | 'System'>('All');
  const [pulse, setPulse] = useState(false);
  const [limit, setLimit] = useState(20);
  const [hasMore, setHasMore] = useState(true);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const previousUnreadCountRef = useRef<number>(0);

  const unreadCount = useMemo(() => items.filter((it) => !it.isRead).length, [items]);

  const loadNotifications = async (fetchLimit: number = 20, isBackground: boolean = false) => {
    if (!isBackground) setLoading(true);
    setError(null);
    try {
      const data = await apiClient.listNotifications?.(fetchLimit);
      const list = (data || []).map((n: any) => ({
        id: n.id,
        title: n.title || 'Notification',
        message: n.message || '',
        type: n.type || 'SYSTEM',
        entityType: n.entityType,
        entityId: n.entityId,
        actionUrl: n.actionUrl,
        isRead: Boolean(n.isRead),
        createdAt: n.createdAt || new Date().toISOString(),
      }));

      const newUnread = list.filter((it: NotificationItem) => !it.isRead).length;
      if (newUnread > previousUnreadCountRef.current && previousUnreadCountRef.current !== 0) {
        setPulse(true);
        setTimeout(() => setPulse(false), 2000);

        // Native push notification if granted
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          const newest = list.find((it: NotificationItem) => !it.isRead);
          if (newest) {
            new Notification(newest.title, { body: newest.message, icon: '/favicon.ico' });
          }
        }
      }
      previousUnreadCountRef.current = newUnread;

      setItems(list);
      setHasMore(list.length >= fetchLimit);
    } catch (err: unknown) {
      if (!isBackground) {
        setError(err instanceof Error ? err.message : 'Failed to load notifications');
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadNotifications(limit, false);
  }, []);

  // Realtime Polling (30s interval when focused, paused when backgrounded)
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (!intervalId) {
        intervalId = setInterval(() => {
          if (document.visibilityState === 'visible') {
            loadNotifications(limit, true);
          }
        }, 30000);
      }
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadNotifications(limit, true);
        startPolling();
      } else {
        stopPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [limit]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation: 'b' opens, arrows navigate, Enter opens, 'r' marks read, Esc closes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (!isInput && e.key.toLowerCase() === 'b' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        setFocusedIndex(0);
        return;
      }

      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        setOpenMenuId(null);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, filteredItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        if (focusedIndex >= 0 && focusedIndex < filteredItems.length) {
          e.preventDefault();
          handleItemClick(filteredItems[focusedIndex]);
        }
      } else if (e.key.toLowerCase() === 'r') {
        if (focusedIndex >= 0 && focusedIndex < filteredItems.length) {
          e.preventDefault();
          handleToggleRead(filteredItems[focusedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, focusedIndex, items, filter]);

  const handleToggleRead = async (item: NotificationItem) => {
    const newStatus = !item.isRead;
    setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, isRead: newStatus } : n)));
    try {
      if (newStatus) {
        await apiClient.markNotificationRead?.(item.id);
      }
    } catch (err) {
      logger.error('Failed to update notification read status', err);
    }
  };

  const handleMarkAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await apiClient.markAllNotificationsRead?.();
    } catch (err) {
      logger.error('Failed to mark all as read', err);
    }
  };

  const handleItemClick = (item: NotificationItem) => {
    if (!item.isRead) {
      handleToggleRead(item);
    }
    const url = resolveActionUrl(item);
    if (url) {
      setIsOpen(false);
      router.push(url);
    }
  };

  const handleDismiss = (id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    setOpenMenuId(null);
  };

  const handleSnooze = (id: string) => {
    // Snooze by 1 hour locally
    const snoozeTime = new Date(Date.now() + 3600000).toISOString();
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, snoozedUntil: snoozeTime, isRead: true } : n))
    );
    setOpenMenuId(null);
  };

  const handleLoadMore = () => {
    const nextLimit = limit + 20;
    setLimit(nextLimit);
    loadNotifications(nextLimit, false);
  };

  const filteredItems = useMemo(() => {
    return items.filter((n) => {
      if (filter === 'Unread') return !n.isRead;
      if (filter === 'Mentions') return n.type.includes('MENTION') || n.entityType === 'MENTION';
      if (filter === 'System') return n.type.includes('SYSTEM') || n.type.includes('SECURITY');
      return true;
    });
  }, [items, filter]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, NotificationItem[]> = {
      Today: [],
      Yesterday: [],
      'This week': [],
      Earlier: [],
    };
    for (const item of filteredItems) {
      const group = getRelativeDateGroup(item.createdAt);
      groups[group].push(item);
    }
    return groups;
  }, [filteredItems]);

  return (
    <div ref={containerRef} className="relative">
      {/* 5.1 Bell button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen((v) => !v);
          setFocusedIndex(0);
        }}
        aria-label={unreadCount > 0 ? `${unreadCount > 99 ? '99+' : unreadCount} Notifications` : 'Notifications'}
        aria-expanded={isOpen}
        className={cn(
          'relative h-9 w-9 flex items-center justify-center rounded-lg text-secondary hover:text-primary hover:bg-surface-sunken transition-colors',
          pulse && 'animate-pulse ring-2 ring-brand'
        )}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span data-testid="bell-badge" aria-hidden="true" className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-brand text-inverse text-[10px] font-bold tabular-nums shadow-xs">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* 5.2 Dropdown Panel (400px desktop, full-width sheet mobile) */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Notification center"
          className="absolute right-0 top-11 z-50 w-[calc(100vw-2rem)] sm:w-[400px] max-h-[580px] flex flex-col rounded-xl border border-subtle bg-surface-raised shadow-popover overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Sticky Header */}
          <div className="sticky top-0 z-10 border-b border-subtle bg-surface/95 backdrop-blur-xs p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-primary">Notifications</h3>
                {unreadCount > 0 && (
                  <Badge variant="brand" size="xs">
                    {unreadCount} new
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={unreadCount === 0}
                  onClick={handleMarkAllRead}
                  className="h-7 text-xs font-medium text-secondary hover:text-primary px-2"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3.5 w-3.5 mr-1" />
                  Mark all read
                </Button>
                <Link href="/settings/notifications" onClick={() => setIsOpen(false)}>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-7 w-7 text-secondary hover:text-primary"
                    aria-label="Notification Settings"
                  >
                    <Settings className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              {(['All', 'Unread', 'Mentions', 'System'] as const).map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setFilter(chip)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors',
                    filter === chip
                      ? 'bg-brand text-inverse shadow-2xs'
                      : 'bg-surface-sunken text-secondary hover:text-primary hover:bg-surface-raised'
                  )}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Body: Grouped Notifications */}
          <div ref={listRef} className="flex-1 overflow-y-auto divide-y divide-subtle">
            {loading && items.length === 0 ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ) : error ? (
              <div className="p-8 text-center space-y-2">
                <AlertCircle className="h-8 w-8 text-status-danger-text mx-auto" />
                <p className="text-xs text-primary font-medium">{error}</p>
                <Button variant="outline" size="sm" onClick={() => loadNotifications(limit, false)}>
                  <RefreshCw className="h-3 w-3 mr-1" /> Retry
                </Button>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-full bg-surface-sunken text-muted">
                  <Inbox className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-primary">You're all caught up</p>
                <p className="text-xs text-muted max-w-[240px] mx-auto">
                  We'll notify you when new accounting tasks or invoices require your attention.
                </p>
              </div>
            ) : (
              (['Today', 'Yesterday', 'This week', 'Earlier'] as const).map((groupKey) => {
                const groupRows = groupedItems[groupKey];
                if (!groupRows || groupRows.length === 0) return null;

                return (
                  <div key={groupKey} className="py-2">
                    <div className="px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-muted select-none">
                      {groupKey}
                    </div>
                    <div>
                      {groupRows.map((n) => {
                        const globalIndex = filteredItems.indexOf(n);
                        const isFocused = globalIndex === focusedIndex;
                        const actionUrl = resolveActionUrl(n);

                        return (
                          <div
                            key={n.id}
                            tabIndex={0}
                            onClick={() => handleItemClick(n)}
                            className={cn(
                              'group relative px-4 py-3 flex items-start gap-3 transition-colors cursor-pointer select-none',
                              !n.isRead ? 'bg-brand-subtle/30' : 'bg-surface hover:bg-surface-sunken',
                              isFocused && 'ring-1 ring-inset ring-brand'
                            )}
                          >
                            {/* Icon */}
                            {getNotificationIcon(n.type, n.entityType)}

                            {/* Content */}
                            <div className="flex-1 min-w-0 pr-6">
                              <div className="flex items-baseline justify-between gap-2">
                                <h4
                                  className={cn(
                                    'text-xs truncate',
                                    !n.isRead ? 'font-bold text-primary' : 'font-medium text-secondary'
                                  )}
                                >
                                  {n.title}
                                </h4>
                                <span className="text-[11px] text-muted shrink-0 tabular-nums">
                                  {getRelativeTimeString(n.createdAt)}
                                </span>
                              </div>
                              <p className="text-xs text-muted line-clamp-2 mt-0.5 leading-relaxed">
                                {n.message}
                              </p>
                            </div>

                            {/* Unread indicator dot */}
                            {!n.isRead && (
                              <span
                                className="absolute right-3.5 top-4 h-1.5 w-1.5 rounded-full bg-brand"
                                aria-label="Unread"
                              />
                            )}

                            {/* 3-Dot Overflow Menu */}
                            <div
                              className="absolute right-2 bottom-2.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => setOpenMenuId(openMenuId === n.id ? null : n.id)}
                                aria-label="Notification actions"
                                className="h-6 w-6 rounded-md hover:bg-surface-sunken flex items-center justify-center text-muted hover:text-primary"
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
                              </button>

                              {openMenuId === n.id && (
                                <div className="absolute right-0 bottom-7 z-20 w-36 rounded-xl border border-subtle bg-surface-raised shadow-popover py-1 text-xs">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleToggleRead(n);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-primary hover:bg-surface-sunken flex items-center gap-2"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                    {n.isRead ? 'Mark as unread' : 'Mark as read'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSnooze(n.id)}
                                    className="w-full text-left px-3 py-1.5 text-primary hover:bg-surface-sunken flex items-center gap-2"
                                  >
                                    <Clock className="h-3.5 w-3.5" />
                                    Snooze 1 h
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDismiss(n.id)}
                                    className="w-full text-left px-3 py-1.5 text-status-danger-text hover:bg-surface-sunken flex items-center gap-2"
                                  >
                                    Dismiss
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}

            {/* Load More Button inside Panel */}
            {hasMore && filteredItems.length > 0 && !loading && (
              <div className="p-2 text-center border-t border-subtle">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLoadMore}
                  className="w-full text-xs text-secondary hover:text-primary h-8"
                >
                  Load older notifications...
                </Button>
              </div>
            )}
          </div>

          {/* Sticky Footer */}
          <div className="sticky bottom-0 z-10 border-t border-subtle bg-surface-sunken px-4 py-2 flex items-center justify-between">
            <span className="text-[11px] text-muted">Press 'b' to toggle</span>
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-brand-text hover:underline inline-flex items-center gap-1"
            >
              View all notifications
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
