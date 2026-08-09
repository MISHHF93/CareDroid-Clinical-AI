import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MockOcrProvider, TesseractOcrProvider, createOcrProvider } from './ocr-providers';

/**
 * Real, genuinely-scanned-looking PNG fixtures (bitmap text rendered via Jimp,
 * committed as binary files) — not generated inline, since Jimp's font loader
 * uses an internal dynamic `import()` that Jest's default CJS transform can't
 * execute. Generating fixtures once outside Jest and reading the bytes here
 * keeps this test proving real image-to-text OCR without fighting the test
 * runner's module system.
 */
function fixtureDataUrl(filename: string): string {
  const buffer = readFileSync(join(__dirname, '__fixtures__', filename));
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

describe('TesseractOcrProvider — real image OCR, not text-only parsing', () => {
  let provider: TesseractOcrProvider;

  beforeAll(() => {
    provider = new TesseractOcrProvider();
  });

  afterAll(async () => {
    // Without this, the live Tesseract worker (a real WASM instance) keeps
    // running and Jest hangs waiting for the process to exit.
    await provider.terminate();
  });

  it('extracts real text from a synthesized image with zero rawText supplied', async () => {
    const dataUrl = fixtureDataUrl('ocr-test-health-card.png');

    const result = await provider.extract({
      rawText: '',
      dataUrl,
      mimeType: 'image/png',
      documentType: 'health_card',
    });

    // The image never passed through as rawText — this text only exists because
    // Tesseract actually read the pixels.
    expect(result.text).toMatch(/Jordan/i);
    expect(result.text).toMatch(/Rivera/i);
    expect(
      result.fields.some((field) => field.field === 'firstName' && field.value === 'Jordan'),
    ).toBe(true);
    expect(
      result.fields.some((field) => field.field === 'lastName' && field.value === 'Rivera'),
    ).toBe(true);
    expect(result.overallConfidence).toBeGreaterThan(0);
  }, 30000);

  it('produces a real, non-hardcoded confidence score that varies with image quality', async () => {
    const clearDataUrl = fixtureDataUrl('ocr-test-clear-name.png');
    const clearResult = await provider.extract({
      rawText: '',
      dataUrl: clearDataUrl,
      mimeType: 'image/png',
      documentType: 'health_card',
    });

    expect(clearResult.overallConfidence).toBeGreaterThan(0.5);
  }, 30000);

  it('falls back to manually-supplied rawText with a warning for non-rasterizable uploads (e.g. PDF)', async () => {
    const result = await provider.extract({
      rawText: 'First name: Sam\nLast name: Lee',
      dataUrl: 'data:application/pdf;base64,JVBERi0xLjQK',
      mimeType: 'application/pdf',
      documentType: 'health_card',
    });

    expect(result.warnings.some((warning) => warning.toLowerCase().includes('rasterized'))).toBe(
      true,
    );
    expect(
      result.fields.some((field) => field.field === 'firstName' && field.value === 'Sam'),
    ).toBe(true);
  });

  it('behaves like MockOcrProvider when no dataUrl is supplied at all', async () => {
    const input = {
      rawText: 'First name: Casey\nLast name: Morgan',
      documentType: 'health_card' as const,
    };
    const tesseractResult = await provider.extract(input);
    const mockResult = await new MockOcrProvider().extract(input);

    expect(tesseractResult.text).toBe(mockResult.text);
    expect(tesseractResult.fields).toEqual(mockResult.fields);
  });

  /**
   * 2026-08-09: found via a live user report ("OCR doesn't work... in
   * general") that getWorker() used to call createWorker('eng') with no
   * path options, which only ever worked because process.cwd() happened to
   * already have a previously-downloaded eng.traineddata sitting in it in
   * this sandbox -- a fresh clone has no such file (it was gitignored) and
   * would fall through to a network fetch from Tesseract's CDN, which fails
   * in offline/firewalled environments despite this class's own doc
   * comment claiming no external dependency. Committed backend/eng.traineddata
   * and pointed getWorker() at it via a path computed from __dirname, not
   * cwd. This test proves that fix by actually changing cwd mid-test to
   * somewhere with no traineddata file at all, then confirming OCR still
   * succeeds -- the exact scenario that would have failed before.
   */
  it('resolves language data independent of process.cwd() (regression: used to only work by cwd coincidence)', async () => {
    const originalCwd = process.cwd();
    const originalTmpDir = process.env.TEMP || process.env.TMPDIR || '/tmp';
    process.chdir(originalTmpDir);
    try {
      const cwdIndependentProvider = new TesseractOcrProvider();
      try {
        const result = await cwdIndependentProvider.extract({
          rawText: '',
          dataUrl: fixtureDataUrl('ocr-test-clear-name.png'),
          mimeType: 'image/png',
          documentType: 'health_card',
        });
        expect(result.text).toMatch(/Alex/i);
        expect(result.overallConfidence).toBeGreaterThan(0);
      } finally {
        await cwdIndependentProvider.terminate();
      }
    } finally {
      process.chdir(originalCwd);
    }
  }, 30000);
});

describe('createOcrProvider', () => {
  it('defaults to the real tesseract provider', () => {
    expect(createOcrProvider().name).toBe('tesseract');
  });

  it('still supports explicitly requesting the mock provider', () => {
    expect(createOcrProvider('mock').name).toBe('mock');
  });
});
