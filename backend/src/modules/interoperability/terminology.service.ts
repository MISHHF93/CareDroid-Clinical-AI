import { Injectable, Logger } from '@nestjs/common';
import type { Coding } from '@medplum/fhirtypes';

/**
 * Real code-system lookup, replacing hand-written `{ system: 'SNOMED_CT',
 * display: <free text> }` shapes that named a code system but carried no code.
 *
 * Backed by the U.S. National Library of Medicine's public services, both of
 * which are free, keyless and rate-limited but unauthenticated:
 *   - Clinical Table Search Service (ICD-10-CM)
 *   - RxNav (RxNorm)
 *
 * JURISDICTION -- read before wiring this into billing or reporting. This
 * deployment targets Ontario (see moh-fhir.service.ts). ICD-10-CM is the U.S.
 * clinical modification; Canada bills and reports on ICD-10-CA, a CIHI product
 * that is licensed and has no free public API. These lookups are therefore
 * safe for clinical search, decision support and coding assistance, and are
 * NOT a substitute for ICD-10-CA in any billing or mandated-reporting path.
 * SNOMED CT is deliberately absent: it requires an affiliate licence (free in
 * member countries including Canada via Infoway, but still a registration),
 * so it cannot be called anonymously the way these two can.
 */

export type TerminologySystem = 'icd10cm' | 'rxnorm';

export const TERMINOLOGY_SYSTEM_URIS: Readonly<Record<TerminologySystem, string>> = Object.freeze({
  icd10cm: 'http://hl7.org/fhir/sid/icd-10-cm',
  rxnorm: 'http://www.nlm.nih.gov/research/umls/rxnorm',
});

export type TerminologyLookupResult = {
  system: TerminologySystem;
  query: string;
  /** FHIR Codings, empty when the lookup found nothing or could not run. */
  codings: Coding[];
  /** True only when a live lookup actually answered. */
  resolved: boolean;
  /** Populated instead of throwing, so a clinical surface can degrade calmly. */
  unavailableReason?: string;
  fromCache?: boolean;
};

const ICD10CM_ENDPOINT = 'https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search';
const RXNORM_ENDPOINT = 'https://rxnav.nlm.nih.gov/REST/drugs.json';
const DEFAULT_TIMEOUT_MS = 4000;
const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;

@Injectable()
export class TerminologyService {
  private readonly logger = new Logger(TerminologyService.name);
  private readonly cache = new Map<string, { at: number; result: TerminologyLookupResult }>();

  async search(
    system: TerminologySystem,
    query: string,
    options: { limit?: number; timeoutMs?: number } = {},
  ): Promise<TerminologyLookupResult> {
    const trimmed = String(query || '').trim();
    const limit = Math.min(Math.max(options.limit ?? 5, 1), 20);

    if (!trimmed) {
      return {
        system,
        query: trimmed,
        codings: [],
        resolved: false,
        unavailableReason: 'Empty query.',
      };
    }

    const cacheKey = `${system}:${limit}:${trimmed.toLowerCase()}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return { ...cached.result, fromCache: true };
    }

    let result: TerminologyLookupResult;
    try {
      const codings =
        system === 'icd10cm'
          ? await this.searchIcd10cm(trimmed, limit, options.timeoutMs)
          : await this.searchRxNorm(trimmed, limit, options.timeoutMs);
      result = { system, query: trimmed, codings, resolved: true };
    } catch (error) {
      // Terminology is an enrichment, never a gate: a slow or unreachable
      // public API must not fail the clinical request that asked for it.
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Terminology lookup failed (${system}): ${reason}`);
      result = {
        system,
        query: trimmed,
        codings: [],
        resolved: false,
        unavailableReason: 'Terminology service is unreachable; codes were not attached.',
      };
    }

    if (result.resolved) this.writeCache(cacheKey, result);
    return result;
  }

  private writeCache(key: string, result: TerminologyLookupResult) {
    if (this.cache.size >= MAX_CACHE_ENTRIES) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(key, { at: Date.now(), result });
  }

  private async fetchJson(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Clinical Tables answers with a positional array, not an object:
   * [total, [codes...], null, [[code, name], ...]]. Read the 4th element,
   * which pairs each code with its display, rather than trusting index
   * alignment between the 2nd and 4th.
   */
  private async searchIcd10cm(query: string, limit: number, timeoutMs?: number): Promise<Coding[]> {
    const url = `${ICD10CM_ENDPOINT}?sf=code,name&terms=${encodeURIComponent(query)}&maxList=${limit}`;
    const payload = await this.fetchJson(url, timeoutMs);
    if (!Array.isArray(payload) || !Array.isArray(payload[3])) return [];
    return (payload[3] as unknown[])
      .filter((row): row is unknown[] => Array.isArray(row) && row.length >= 2)
      .map((row) => ({
        system: TERMINOLOGY_SYSTEM_URIS.icd10cm,
        code: String(row[0]),
        display: String(row[1]),
      }));
  }

  private async searchRxNorm(query: string, limit: number, timeoutMs?: number): Promise<Coding[]> {
    const url = `${RXNORM_ENDPOINT}?name=${encodeURIComponent(query)}`;
    const payload = (await this.fetchJson(url, timeoutMs)) as {
      drugGroup?: {
        conceptGroup?: Array<{ conceptProperties?: Array<{ rxcui?: string; name?: string }> }>;
      };
    };
    const groups = payload?.drugGroup?.conceptGroup;
    if (!Array.isArray(groups)) return [];
    const codings: Coding[] = [];
    for (const group of groups) {
      for (const concept of group?.conceptProperties || []) {
        if (!concept?.rxcui || !concept?.name) continue;
        codings.push({
          system: TERMINOLOGY_SYSTEM_URIS.rxnorm,
          code: String(concept.rxcui),
          display: String(concept.name),
        });
        if (codings.length >= limit) return codings;
      }
    }
    return codings;
  }
}
