'use client';

import * as React from 'react';
import QRCode from 'qrcode';

export interface QrCodeProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  size?: number;
  darkColor?: string;
  lightColor?: string;
  level?: 'L' | 'M' | 'Q' | 'H';
}

export function QrCode({
  value,
  size = 200,
  darkColor = '#000000',
  lightColor = '#ffffff',
  level = 'M',
  className,
  ...props
}: QrCodeProps) {
  const [svgContent, setSvgContent] = React.useState<string>('');

  React.useEffect(() => {
    let isMounted = true;
    QRCode.toString(value, {
      type: 'svg',
      width: size,
      margin: 1,
      errorCorrectionLevel: level,
      color: {
        dark: darkColor,
        light: lightColor,
      },
    })
      .then((svg) => {
        if (isMounted) {
          setSvgContent(svg);
        }
      })
      .catch((err) => {
        console.error('Failed to generate QR code', err);
      });

    return () => {
      isMounted = false;
    };
  }, [value, size, darkColor, lightColor, level]);

  if (!svgContent) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center rounded-lg bg-surface-sunken bg-surface-raised animate-pulse text-xs text-muted"
      >
        Generating QR...
      </div>
    );
  }

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: svgContent }}
      {...props}
    />
  );
}

