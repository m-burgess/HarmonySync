/**
 * Canva Service
 * 
 * Handles programmatic interaction with Canva presentations:
 * - Loading presentations in a headless browser
 * - Navigating through slides
 * - Hiding UI elements for clean captures
 * - Capturing slides as high-quality images
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { chromium, Browser, Page } from 'playwright';
import { v4 as uuidv4 } from 'uuid';
import { BaseElectronService, ServiceConfig } from '@harmonysync/core';

export interface CanvaImportOptions {
    url: string;
    outputDir: string;
    width?: number;
    height?: number;
    waitForSlideMs?: number;
}

export interface CanvaSlideInfo {
    index: number;
    imagePath: string;
}

export class CanvaService extends BaseElectronService {
    protected readonly serviceName = 'CanvaService';

    private readonly DEFAULT_WIDTH = 1920;
    private readonly DEFAULT_HEIGHT = 1080;
    private readonly DEFAULT_WAIT_MS = 1000;

    constructor(config?: ServiceConfig) {
        super(config);
    }

    /**
     * Initialize the Canva service
     */
    protected override async onInitialize(): Promise<void> {
        this.log('info', 'Canva service ready');
    }

    /**
     * Clean up resources
     */
    protected override onDispose(): void {
        this.log('info', 'Canva service disposed');
    }

    /**
     * Import slides from a Canva link as individual images
     * @param options - Import options
     * @returns Array of imported slide info
     */
    public async importSlides(options: CanvaImportOptions): Promise<CanvaSlideInfo[]> {
        const {
            url,
            outputDir,
            width = this.DEFAULT_WIDTH,
            height = this.DEFAULT_HEIGHT,
            waitForSlideMs = this.DEFAULT_WAIT_MS
        } = options;

        this.log('info', `Starting Canva import for: ${url}`);

        // Ensure output directory exists
        await fs.ensureDir(outputDir);

        let browser: Browser | null = null;
        const importedSlides: CanvaSlideInfo[] = [];

        try {
            browser = await chromium.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const context = await browser.newContext({
                viewport: { width, height },
                deviceScaleFactor: 2, // High DPI for better quality
            });

            const page = await context.newPage();

            // Navigate to the presentation
            // Canva presentations usually have a /view suffix for the clean view
            const viewUrl = url.includes('/view') ? url : `${url.split('?')[0]}/view`;
            this.log('debug', `Navigating to: ${viewUrl}`);

            await page.goto(viewUrl, { waitUntil: 'networkidle' });

            // Wait for the presentation to load
            await page.waitForSelector('button[aria-label="Next page"]', { timeout: 30000 });

            // Identify the total number of slides
            const totalSlides = await this.getTotalSlideCount(page);
            this.log('info', `Detected ${totalSlides} slides in presentation`);

            // Hide UI elements for clean capture
            await this.hideCanvaUI(page);

            // Iterate through slides and capture
            for (let i = 0; i < totalSlides; i++) {
                this.log('debug', `Capturing slide ${i + 1}/${totalSlides}`);

                // Wait for potential animations to finish
                await page.waitForTimeout(waitForSlideMs);

                const slideFileName = `slide_${(i + 1).toString().padStart(3, '0')}.png`;
                const slidePath = path.join(outputDir, slideFileName);

                // Capture screenshot
                await page.screenshot({ path: slidePath });

                importedSlides.push({
                    index: i,
                    imagePath: slidePath
                });

                // Navigate to next slide if not the last one
                if (i < totalSlides - 1) {
                    const nextButton = await page.$('button[aria-label="Next page"]');
                    if (nextButton) {
                        await nextButton.click();
                    } else {
                        this.log('warn', `Next button not found at slide ${i + 1}`);
                        break;
                    }
                }
            }

            this.log('info', `Successfully imported ${importedSlides.length} slides from Canva`);
            return importedSlides;

        } catch (error) {
            this.handleError('importSlides', error);
            throw error;
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    /**
     * Determine total number of slides from the UI
     */
    private async getTotalSlideCount(page: Page): Promise<number> {
        try {
            // Canva usually has a "Go to page" button that shows "1 / X"
            const pageIndicator = await page.$('button[aria-label="Go to page"]');
            if (pageIndicator) {
                const text = await pageIndicator.innerText();
                // Text format is usually "1 / 10" or similar
                const parts = text.split('/');
                if (parts.length > 1) {
                    const count = parseInt(parts[1].trim(), 10);
                    if (!isNaN(count)) return count;
                }
            }

            // Fallback: try to find the total slides via other selectors or keep searching
            return 1; // Default to at least 1
        } catch (error) {
            this.log('warn', 'Failed to detect slide count, defaulting to 1', error);
            return 1;
        }
    }

    /**
     * Hide Canva UI elements (Top bar, bottom bar, watermark, etc.)
     */
    private async hideCanvaUI(page: Page): Promise<void> {
        await page.evaluate(() => {
            const selectorsToHide = [
                'header', // Top bar
                'footer', // Bottom bar (sometimes)
                '[role="toolbar"]', // Bottom toolbar
                '.canva-watermark', // Watermark (if any)
                'div[style*="z-index: 1000"]', // Overlays
                'button[aria-label="Next page"]', // Navigation buttons
                'button[aria-label="Previous page"]',
                'button[aria-label="Fullscreen"]',
                'button[aria-label="Go to page"]',
            ];

            selectorsToHide.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach((el: any) => {
                    (el as HTMLElement).style.display = 'none';
                });
            });

            // Force hide many UI layers by common classes/roles if they exist
            const overlays = document.querySelectorAll('div');
            overlays.forEach((div: any) => {
                const style = window.getComputedStyle(div);
                if (parseInt(style.zIndex) > 100) {
                    (div as HTMLElement).style.display = 'none';
                }
            });
        });
    }
}

// Export singleton instance
let canvaServiceInstance: CanvaService | null = null;

/**
 * Get or create the Canva service singleton
 */
export function getCanvaService(config?: ServiceConfig): CanvaService {
    if (!canvaServiceInstance) {
        canvaServiceInstance = new CanvaService(config);
    }
    return canvaServiceInstance;
}

export default CanvaService;
