import { existsSync } from 'fs';
import { join } from 'path';
import type { Worker } from 'tesseract.js';
import { getIntakeArtifact } from '../../../../src/config/intakeArtifactRegistry';
import { parseIdArtifactText } from '../../../../src/utils/idArtifactParser';
import { parseClinicalArtifactText } from '../../../../src/utils/clinicalArtifactParser';
import type { OcrProvider, OcrProviderExtractInput, OcrProviderResult } from './ocr-intake.types';

/**
 * Directory containing the committed eng.traineddata (repo root's
 * backend/eng.traineddata). Computed relative to this compiled file's own
 * location rather than process.cwd() -- cwd-relative lookup only works when
 * the process happens to be launched from backend/ (true for this repo's own
 * dev-stack.mjs, not guaranteed for every deployment method). Compiled
 * layout is backend/dist/backend/src/modules/emergency-os/ocr-providers.js
 * (backend/tsconfig.build.json's rootDir: ".." preserves the full repo-root-
 * relative path under dist/), so 5 levels up from __dirname reaches backend/.
 */
const LOCAL_TESSDATA_DIR = join(__dirname, '..', '..', '..', '..', '..');

const LOW_CONFIDENCE_THRESHOLD = 0.6;
const IMAGE_DATA_URL_PATTERN = /^data:image\/(png|jpe?g|webp|gif|heic);base64,(.+)$/i;

/**
 * Base per-field confidence when no real OCR confidence signal is available
 * (manual/typed-text intake, no image). Blended with real OCR confidence in
 * `fieldConfidence` whenever an image was actually processed.
 */
function fieldConfidence(
  field: string,
  artifact: { extractableFields: readonly string[] },
  ocrConfidence?: number,
): number {
  const base = artifact.extractableFields.includes(field) ? 0.82 : 0.55;
  if (ocrConfidence === undefined) return base;
  return Number(((base + ocrConfidence) / 2).toFixed(2));
}

function decodeImageDataUrl(dataUrl: string): Buffer | null {
  const match = IMAGE_DATA_URL_PATTERN.exec(dataUrl);
  if (!match) return null;
  return Buffer.from(match[2], 'base64');
}

/**
 * Shared structured-field extraction: parses raw text (however it was obtained —
 * typed, pasted, or OCR'd from an image) into the artifact's known fields, using
 * the same heuristic parsers the frontend capture flow uses. `ocrConfidence`
 * (0-1), when supplied, blends a real per-document OCR confidence signal into
 * each field's confidence instead of relying solely on the field-type heuristic.
 */
function extractFieldsFromText(
  text: string,
  artifact: ReturnType<typeof getIntakeArtifact>,
  ocrConfidence?: number,
): { fields: Array<{ field: string; value: string; confidence: number }>; warnings: string[] } {
  const warnings: string[] = [];
  const fields: Array<{ field: string; value: string; confidence: number }> = [];

  if (artifact.parser === 'identity') {
    const demographics = parseIdArtifactText(text);
    for (const [field, value] of Object.entries(demographics)) {
      if (value === undefined || value === null || String(value).trim() === '') continue;
      fields.push({
        field,
        value: String(value),
        confidence: fieldConfidence(field, artifact, ocrConfidence),
      });
    }
  } else {
    const clinical = parseClinicalArtifactText(artifact.parser, text);
    for (const [field, value] of Object.entries(clinical)) {
      if (value === undefined || value === null || String(value).trim() === '') continue;
      fields.push({
        field,
        value: String(value),
        confidence: fieldConfidence(field, artifact, ocrConfidence),
      });
    }
  }

  for (const required of artifact.requiredForRegistration || []) {
    if (!fields.some((extracted) => extracted.field === required)) {
      warnings.push(`Missing required field: ${required}`);
    }
  }

  return { fields, warnings };
}

function buildResult(
  text: string,
  fields: Array<{ field: string; value: string; confidence: number }>,
  warnings: string[],
): OcrProviderResult {
  const overallConfidence = fields.length
    ? Number((fields.reduce((sum, field) => sum + field.confidence, 0) / fields.length).toFixed(2))
    : 0;

  if (overallConfidence > 0 && overallConfidence < LOW_CONFIDENCE_THRESHOLD) {
    warnings.push('Overall extraction confidence is low; all fields require staff verification.');
  }

  return { text, fields, overallConfidence, warnings };
}

/**
 * Deterministic, dependency-free OCR provider for local/dev use. Reuses the same
 * text-heuristic parsers the frontend capture flow uses, so field extraction stays
 * consistent whether the OCR runs client-side or server-side. Does not read image
 * pixels at all — only `input.rawText` (manually typed/pasted text). See
 * `TesseractOcrProvider` for the real image-OCR provider.
 */
export class MockOcrProvider implements OcrProvider {
  readonly name = 'mock';

  async extract(input: OcrProviderExtractInput): Promise<OcrProviderResult> {
    const artifact = getIntakeArtifact(input.documentType);
    const text = input.rawText.trim();

    if (!text) {
      return {
        text: '',
        fields: [],
        overallConfidence: 0,
        warnings: ['No extractable text found in document; manual entry required.'],
      };
    }

    const { fields, warnings } = extractFieldsFromText(text, artifact);
    return buildResult(text, fields, warnings);
  }
}

/**
 * Real, self-hosted OCR provider backed by Tesseract.js — genuine image-to-text
 * recognition (WASM, runs entirely in this process, no external API calls or
 * cloud credentials). Decodes `input.dataUrl` (the actual uploaded photo/scan),
 * runs OCR to get real extracted text, then feeds that text into the same
 * structured-field parsers `MockOcrProvider` uses, so downstream consumers see
 * an identical result shape regardless of which provider produced it.
 *
 * The worker is created lazily on first use and reused across requests (creating
 * a Tesseract worker loads WASM + language data, too expensive to redo per call).
 * PDFs are not rasterized in this pass — Tesseract needs raster image input, so a
 * PDF upload falls back to any manually-supplied `rawText` with an explicit
 * warning rather than silently producing nothing or crashing.
 */
export class TesseractOcrProvider implements OcrProvider {
  readonly name = 'tesseract';

  private workerPromise: Promise<Worker> | null = null;

  /**
   * 2026-08-09: was calling createWorker('eng') with no path options, which
   * left Tesseract to check a cache at `process.cwd()` (only ever populated
   * because this sandbox happened to have a previously-downloaded copy
   * sitting there) before falling back to a network fetch from
   * cdn.jsdelivr.net -- a real, silent dependency this class's own doc
   * comment explicitly (and, until now, incorrectly) claimed didn't exist
   * ("no external API calls"). Any environment without network access to
   * that CDN and without an already-cached file (every fresh clone, since
   * the file used to be gitignored) would have OCR fail on first use. Now
   * points explicitly at the committed backend/eng.traineddata via
   * LOCAL_TESSDATA_DIR, deterministic regardless of process cwd or launch
   * method. Falls back to Tesseract's own default (cache-then-network)
   * behavior only if the committed file is ever missing, rather than
   * hard-failing.
   */
  private async getWorker(): Promise<Worker> {
    if (!this.workerPromise) {
      const { createWorker, OEM } = await import('tesseract.js');
      const hasLocalTessdata = existsSync(join(LOCAL_TESSDATA_DIR, 'eng.traineddata'));
      this.workerPromise = hasLocalTessdata
        ? createWorker('eng', OEM.LSTM_ONLY, {
            langPath: LOCAL_TESSDATA_DIR,
            cachePath: LOCAL_TESSDATA_DIR,
            gzip: false,
          })
        : createWorker('eng');
    }
    return this.workerPromise;
  }

  /** Releases the underlying Tesseract worker (a live WASM instance / worker
   * thread that otherwise keeps the process alive). Call on app shutdown and
   * in tests; safe to call even if a worker was never created. */
  async terminate(): Promise<void> {
    if (!this.workerPromise) return;
    const worker = await this.workerPromise;
    this.workerPromise = null;
    await worker.terminate();
  }

  async extract(input: OcrProviderExtractInput): Promise<OcrProviderResult> {
    const artifact = getIntakeArtifact(input.documentType);
    const warnings: string[] = [];
    let text = input.rawText.trim();
    let ocrConfidence: number | undefined;

    if (input.dataUrl) {
      const imageBuffer = decodeImageDataUrl(input.dataUrl);
      if (!imageBuffer) {
        warnings.push(
          'Uploaded document is not a rasterized image (e.g. a PDF); OCR text extraction was skipped for this file. Continue with manual entry or upload a photo/scan instead.',
        );
      } else {
        const worker = await this.getWorker();
        const { data } = await worker.recognize(imageBuffer);
        const ocrText = (data.text || '').trim();
        ocrConfidence = Number((data.confidence / 100).toFixed(2));
        if (ocrText) {
          text = text ? `${ocrText}\n${text}` : ocrText;
        } else {
          warnings.push('OCR could not read any text from the uploaded image.');
        }
      }
    }

    if (!text) {
      return {
        text: '',
        fields: [],
        overallConfidence: 0,
        warnings: [...warnings, 'No extractable text found in document; manual entry required.'],
      };
    }

    const { fields, warnings: fieldWarnings } = extractFieldsFromText(
      text,
      artifact,
      ocrConfidence,
    );
    return buildResult(text, fields, [...warnings, ...fieldWarnings]);
  }
}

export function createOcrProvider(providerName?: string): OcrProvider {
  const name = providerName || process.env.OCR_PROVIDER || 'tesseract';
  switch (name) {
    case 'mock':
      return new MockOcrProvider();
    case 'tesseract':
    default:
      return new TesseractOcrProvider();
  }
}
