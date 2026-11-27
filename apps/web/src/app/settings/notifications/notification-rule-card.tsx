'use client';

import React from 'react';
import { Badge, Input } from '@platform/ui';

export interface NotificationRuleData {
  eventType: string;
  isEnabled: boolean;
  enableInApp: boolean;
  enableEmail: boolean;
  enableWhatsapp: boolean;
  offsetsDays?: number[];
  dispatchTime?: string;
  templateSubject?: string;
  templateBody?: string;
}

interface NotificationRuleCardProps {
  rule: NotificationRuleData;
  title: string;
  description?: string;
  hasCustomOffset?: boolean;
  offsetLabel?: string;
  offsetPlaceholder?: string;
  offsetHelper?: string;
  fixedOffsetNote?: string;
  onUpdateField: (eventType: string, field: string, val: any) => void;
}

export function NotificationRuleCard({
  rule,
  title,
  description,
  hasCustomOffset = false,
  offsetLabel = 'Offset Days',
  offsetPlaceholder = 'e.g. 7, 3, 1',
  offsetHelper = 'Comma-separated days',
  fixedOffsetNote,
  onUpdateField,
}: NotificationRuleCardProps) {
  const inputId = `rule-${rule.eventType}-enabled`;

  return (
    <div className="p-4 rounded-xl border border-default bg-surface-sunken space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={inputId}
            checked={rule.isEnabled}
            onChange={(e) => onUpdateField(rule.eventType, 'isEnabled', e.target.checked)}
            className="h-4 w-4 rounded text-brand-text"
          />
          <div>
            <label htmlFor={inputId} className="text-xs font-bold text-primary block cursor-pointer">
              {title}
            </label>
            {description && <span className="text-[11px] text-muted">{description}</span>}
          </div>
        </div>
        <Badge variant={rule.isEnabled ? 'success' : 'neutral'} size="xs">
          {rule.isEnabled ? 'Active' : 'Disabled'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div>
          <label className="text-[11px] font-semibold text-secondary block mb-1">
            {offsetLabel}
          </label>
          {hasCustomOffset ? (
            <>
              <Input
                placeholder={offsetPlaceholder}
                value={rule.offsetsDays?.join(', ') || ''}
                onChange={(e) => {
                  const vals = e.target.value
                    .split(',')
                    .map((v) => parseInt(v.trim(), 10))
                    .filter((n) => !isNaN(n));
                  onUpdateField(rule.eventType, 'offsetsDays', vals);
                }}
                className="h-8 text-xs font-mono"
              />
              <span className="text-[10px] text-muted mt-0.5 block">{offsetHelper}</span>
            </>
          ) : (
            <div className="h-8 flex items-center text-xs font-medium text-primary">
              {fixedOffsetNote || 'Real-time Event Trigger'}
            </div>
          )}
        </div>

        <div>
          <label className="text-[11px] font-semibold text-secondary block mb-1">
            Dispatch Time (HH:MM)
          </label>
          <Input
            type="time"
            value={rule.dispatchTime || '09:30:00'}
            onChange={(e) => onUpdateField(rule.eventType, 'dispatchTime', e.target.value)}
            className="h-8 text-xs"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-secondary block mb-1">
            Active Delivery Channels
          </label>
          <div className="flex items-center gap-3 mt-1.5">
            <label className="flex items-center gap-1 text-[11px] cursor-pointer">
              <input
                type="checkbox"
                checked={rule.enableInApp}
                onChange={(e) => onUpdateField(rule.eventType, 'enableInApp', e.target.checked)}
              />
              In-App
            </label>
            <label className="flex items-center gap-1 text-[11px] cursor-pointer">
              <input
                type="checkbox"
                checked={rule.enableEmail}
                onChange={(e) => onUpdateField(rule.eventType, 'enableEmail', e.target.checked)}
              />
              Email
            </label>
            <label className="flex items-center gap-1 text-[11px] cursor-pointer">
              <input
                type="checkbox"
                checked={rule.enableWhatsapp}
                onChange={(e) => onUpdateField(rule.eventType, 'enableWhatsapp', e.target.checked)}
              />
              WhatsApp
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
