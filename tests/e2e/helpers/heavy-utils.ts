import { Page, expect } from '@playwright/test';

const CHECKSUM_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function makeValidPan(idx: number): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const a = letters[idx % 26]!;
  const b = letters[Math.floor(idx / 26) % 26]!;
  const c = letters[Math.floor(idx / 676) % 26]!;
  const num = String(1000 + (idx % 9000)).padStart(4, '0');
  const last = letters[(idx * 7) % 26]!;
  return `AAB${a}${b}${num}${last}`.slice(0, 10);
}

export function makeValidGstin(stateCode: string, pan: string, entityNo = '1'): string {
  const base14 = `${stateCode}${pan}${entityNo}Z`.toUpperCase();
  let factor = 1;
  let sum = 0;
  const len = CHECKSUM_CHARS.length;
  for (let i = 0; i < 14; i++) {
    const codePoint = CHECKSUM_CHARS.indexOf(base14[i]!);
    let digit = codePoint * factor;
    factor = factor === 2 ? 1 : 2;
    digit = Math.floor(digit / len) + (digit % len);
    sum += digit;
  }
  const remainder = sum % len;
  const checkIdx = (len - remainder) % len;
  return `${base14}${CHECKSUM_CHARS[checkIdx]}`;
}

export function attachConsoleAndNetworkGuards(
  page: Page,
  opts: { allowStatus?: number[] } = {},
) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const serverErrors: string[] = [];

  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      // Ignore deliberate negative-test HTTP errors when allowStatus is provided
      if (opts.allowStatus?.some((s) => text.includes(`status of ${s}`))) return;
      consoleErrors.push(text);
    } else if (
      type === 'warning' &&
      (text.includes('unique "key" prop') ||
        text.includes('Hydration failed') ||
        text.includes('did not match'))
    ) {
      consoleErrors.push(`REACT_WARNING: ${text}`);
    }
  });

  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });

  page.on('response', (res) => {
    if (res.status() >= 500) {
      serverErrors.push(`${res.status()} ${res.url()}`);
    }
  });

  return {
    assertClean: () => {
      expect(pageErrors, `Uncaught pageerrors: ${pageErrors.join('\n')}`).toEqual([]);
      expect(serverErrors, `5xx server errors: ${serverErrors.join('\n')}`).toEqual([]);
      expect(consoleErrors, `Console errors/React warnings: ${consoleErrors.join('\n')}`).toEqual([]);
    },
  };
}
