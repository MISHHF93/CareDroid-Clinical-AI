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
});

describe('createOcrProvider', () => {
  it('defaults to the real tesseract provider', () => {
    expect(createOcrProvider().name).toBe('tesseract');
  });

  it('still supports explicitly requesting the mock provider', () => {
    expect(createOcrProvider('mock').name).toBe('mock');
  });
});
