import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { chromium, Browser } from 'playwright-core';

@Injectable()
export class PdfRenderService implements OnModuleDestroy {
  private readonly logger = new Logger(PdfRenderService.name);
  private browser: Browser | null = null;
  private launching: Promise<Browser> | null = null;

  private async getBrowser(): Promise<Browser> {
    if (this.browser && this.browser.isConnected()) {
      return this.browser;
    }
    if (!this.launching) {
      this.launching = chromium
        .launch({
          headless: true,
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
