'use client';

import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Input,
  Select,
} from '@platform/ui';
import { Bell, Clock } from 'lucide-react';

interface NotificationDeliveryCardProps {
  timezone: string;
  onTimezoneChange: (val: string) => void;
  dailyDispatchTime: string;
  onDailyDispatchTimeChange: (val: string) => void;
  testChannel: string;
  onTestChannelChange: (val: string) => void;
  quietHoursEnabled: boolean;
  onQuietHoursEnabledChange: (val: boolean) => void;
  quietHoursStart: string;
  quietHoursEnd: string;
  onShowToast: (type: 'success' | 'error', text: string) => void;
}

export function NotificationDeliveryCard({
  timezone,
  onTimezoneChange,
  dailyDispatchTime,
  onDailyDispatchTimeChange,
  testChannel,
  onTestChannelChange,
  quietHoursEnabled,
  onQuietHoursEnabledChange,
  quietHoursStart,
  quietHoursEnd,
  onShowToast,
}: NotificationDeliveryCardProps) {
  const handleRequestPush = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        onShowToast('success', 'Browser native push notifications enabled successfully!');
      } else {
        onShowToast('error', 'Browser notification permission was not granted.');
      }
    } else {
      onShowToast('error', 'Browser push notifications are not supported in this environment.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Browser Native Push Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-brand-subtle text-brand-text flex items-center justify-center font-bold">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">Browser Native Push Notifications</CardTitle>
                <CardDescription>
                  Receive real-time system alerts on your desktop even when Antigravity Books is not in focus.
                </CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={handleRequestPush}
            >
              Request Browser Permission
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Global Dispatch & Delivery Window */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-brand-text" />
                Global Delivery Window & Quiet Hours
              </CardTitle>
              <CardDescription>
                Define default timezones, master dispatch time, and anti-disturbance quiet periods.
              </CardDescription>
            </div>
            <Badge variant="neutral" size="sm">
              Tenant Master
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-secondary block mb-1.5">
                Standard Business Timezone
              </label>
              <Select
                size="sm"
                value={timezone}
                onValueChange={onTimezoneChange}
                options={[
                  { label: 'Asia/Kolkata (IST - UTC+05:30)', value: 'Asia/Kolkata' },
                  { label: 'UTC (Universal Coordinated Time)', value: 'UTC' },
                  { label: 'America/New_York (EST/EDT)', value: 'America/New_York' },
                  { label: 'Europe/London (GMT/BST)', value: 'Europe/London' },
                  { label: 'Asia/Dubai (GST - UTC+04:00)', value: 'Asia/Dubai' },
                ]}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-secondary block mb-1.5">
                Daily Master Dispatch Time
              </label>
              <Input
                type="time"
                value={dailyDispatchTime}
                onChange={(e) => onDailyDispatchTimeChange(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-secondary block mb-1.5">
                Test Alert Channel
              </label>
              <Select
                size="sm"
                value={testChannel}
                onValueChange={onTestChannelChange}
                options={[
                  { label: 'In-App Notification Bell', value: 'IN_APP' },
                  { label: 'Email (SMTP / SES)', value: 'EMAIL' },
                  { label: 'WhatsApp Business API', value: 'WHATSAPP' },
                  { label: 'SMS (DLT Registered)', value: 'SMS' },
                ]}
              />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-subtle flex items-center justify-between">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="quiet-hours-toggle"
                checked={quietHoursEnabled}
                onChange={(e) => onQuietHoursEnabledChange(e.target.checked)}
                className="h-4 w-4 rounded text-brand-text focus:ring-focus-ring border-default"
              />
              <label htmlFor="quiet-hours-toggle" className="text-xs font-medium text-primary">
                Enable Nighttime Quiet Hours (Suppress external WhatsApp & SMS between{' '}
                <span className="font-semibold text-brand-text">{quietHoursStart}</span> and{' '}
                <span className="font-semibold text-brand-text">{quietHoursEnd}</span>)
              </label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
