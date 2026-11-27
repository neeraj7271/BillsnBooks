import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { chromium, Browser } from 'playwright-core';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

@Injectable()
export class PdfRenderService implements OnModuleDestroy {
  private readonly logger = new Logger(PdfRenderService.name);
  private browser: Browser | null = null;
  private launching: Promise<Browser> | null = null;

  private resolveExecutablePath(): string | undefined {
    if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
      return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
    }
    const defaultPath = chromium.executablePath();
    if (defaultPath && fs.existsSync(defaultPath)) {
      return defaultPath;
    }
    const cacheDirs = [
      path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright'),
      path.join(os.homedir(), '.cache', 'ms-playwright'),
    ];
    for (const dir of cacheDirs) {
      if (!fs.existsSync(dir)) continue;
      const entries = fs.readdirSync(dir).filter((d) => d.startsWith('chromium_headless_shell-')).sort().reverse();
      for (const entry of entries) {
        const candidates = [
          path.join(dir, entry, 'chrome-headless-shell-mac-arm64', 'chrome-headless-shell'),
          path.join(dir, entry, 'chrome-headless-shell-mac-x64', 'chrome-headless-shell'),
          path.join(dir, entry, 'chrome-headless-shell-linux', 'chrome-headless-shell'),
        ];
        for (const c of candidates) {
          if (fs.existsSync(c)) return c;
        }
      }
    }
    return undefined;
  }

  private async getBrowser(): Promise<Browser> {
    if (this.browser && this.browser.isConnected()) {
      return this.browser;
    }
    if (!this.launching) {
      const executablePath = this.resolveExecutablePath();
      this.launching = chromium
        .launch({
          headless: true,
          executablePath,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        })
        .then((b) => {
          this.browser = b;
          this.launching = null;
          this.logger.log('Headless Chromium initialized for server-side PDF rendering');
          return b;
        })
        .catch((err) => {
          this.launching = null;
          throw err;
        });
    }
    return this.launching;
  }

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }
  }

  async renderHtmlToPdf(
    html: string,
    opts?: { firmName?: string; reportTitle?: string },
  ): Promise<Buffer> {
    const browser = await this.getBrowser();
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await page.setContent(html, { waitUntil: 'load' });
      const firm = (opts?.firmName || 'Antigravity Books').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const pdfBytes = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '15mm',
          right: '14mm',
          bottom: '18mm',
          left: '14mm',
        },
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: `
          <div style="width:100%;font-family:Inter,Arial,sans-serif;font-size:8px;color:#64748b;padding:0 14mm;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #e2e8f0;padding-top:4px;">
            <span>This is a computer-generated statement &middot; ${firm}</span>
            <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
          </div>
        `,
      });
      return Buffer.from(pdfBytes);
    } finally {
      await context.close();
    }
  }
}
