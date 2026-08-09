import { Injectable, Logger } from '@nestjs/common';
import catalogData from './data/catalog.json';
import { callAI } from '../../../../lib/ai/serverClient';

/**
 * Ported from navigator/ (a formerly-standalone, merged-in repo) as part of
 * the 2026-08-06 consolidation into one real frontend + one real backend.
 * Deterministic lexical retrieval logic is unchanged from
 * navigator/src/retrieval.js; only the module system and types changed.
 *
 * Groq synthesis routes through the shared LLM egress boundary
 * (lib/ai/providers/egress.ts's completeViaEgress, "the single CareDroid
 * LLM egress boundary" that AI_KILL_SWITCH / AI_EXTERNAL_LLM_DISABLED,
 * per-provider circuit breakers, and AI monitor events all depend on) —
 * found 2026-08-08 to have been calling api.groq.com directly with its own
 * bespoke fetch, which meant flipping the kill switch during an incident
 * would not actually stop this path, and no monitor/audit event was ever
 * recorded for it. Fixed to call through lib/ai/serverClient's callAI()
 * like every other real backend AI caller (chat.service.ts, ai.service.ts).
 */

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'anything', 'app', 'can', 'do', 'for', 'go', 'how', 'i', 'in', 'is',
  'it', 'me', 'of', 'on', 'open', 'please', 'show', 'take', 'the', 'this', 'to', 'where',
]);

const EXPANSIONS: Readonly<Record<string, string[]>> = Object.freeze({
  ambulance: ['ems', 'dispatch', 'pre arrival'],
  arrivals: ['reception', 'intake', 'ems'],
  beds: ['capacity', 'boarding', 'occupancy'],
  chatbot: ['copilot', 'assistant', 'ai'],
  checkin: ['reception', 'intake', 'registration'],
  doctor: ['physician', 'clinical'],
  handover: ['handoff', 'shift'],
  labs: ['laboratory', 'diagnostics'],
  map: ['hospital map', 'live map'],
  queue: ['waiting', 'triage', 'reassessment'],
  score: ['calculator', 'medical tools'],
  settings: ['configuration', 'administration'],
});

export interface NavigatorCatalogRecord {
  id: string;
  label: string;
  description?: string;
  path: string;
  component?: string;
  navigationGroup?: string;
  breadcrumbs?: string[];
  aliases?: string[];
  workflowOwner?: string;
  requiredPermissions?: string[];
}

export interface NavigatorDocument {
  id: string;
  label: string;
  description: string;
  path: string;
  component: string;
  navigationGroup: string;
  breadcrumbs: readonly string[];
  aliases: readonly string[];
  workflowOwner: string;
  requiredPermissions: readonly string[];
  navigable: boolean;
  searchableText: string;
}

export interface NavigatorHit extends NavigatorDocument {
  score: number;
  matchedTerms: string[];
}

interface NavigatorCatalogFile {
  schemaVersion: number;
  source: string;
  sourceCommit: string;
  generatedAt: string;
  records: NavigatorCatalogRecord[];
}

export function normalizeQuery(value: string): string {
  return String(value || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/[^a-z0-9/:?-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value: string): string[] {
  return normalizeQuery(value).split(' ').filter((term) => term.length > 1 && !STOP_WORDS.has(term));
}

function expandQuery(query: string): string[] {
  const base = tokenize(query);
  return [...new Set(base.flatMap((term) => [term, ...(EXPANSIONS[term] || [])]).flatMap(tokenize))];
}

function buildIndex(records: NavigatorCatalogRecord[]): readonly NavigatorDocument[] {
  return Object.freeze(
    records.map((record) => {
      const document = {
        id: String(record.id),
        label: String(record.label || record.id),
        description: String(record.description || 'CareDroid application surface.'),
        path: String(record.path),
        component: String(record.component || 'Route component'),
        navigationGroup: String(record.navigationGroup || 'CareDroid'),
        breadcrumbs: Object.freeze([...(record.breadcrumbs || [])].map(String)),
        aliases: Object.freeze([...(record.aliases || [])].map(String)),
        workflowOwner: String(record.workflowOwner || 'CareDroid'),
        requiredPermissions: Object.freeze([...(record.requiredPermissions || [])].map(String)),
        navigable: !String(record.path).includes(':'),
      };
      return Object.freeze({
        ...document,
        searchableText: normalizeQuery(Object.values(document).flat().join(' ')),
      });
    }),
  );
}

function scoreDocument(
  document: NavigatorDocument,
  terms: string[],
  query: string,
): { score: number; matchedTerms: string[] } {
  const label = normalizeQuery(document.label);
  const description = normalizeQuery(document.description);
  const component = normalizeQuery(document.component);
  const path = normalizeQuery(document.path);
  const aliases = normalizeQuery(document.aliases.join(' '));
  const normalizedQuery = normalizeQuery(query);
  let score = 0;
  const matchedTerms: string[] = [];

  if (normalizedQuery === label || normalizedQuery === path) score += 80;
  else if (label.includes(normalizedQuery) && normalizedQuery.length >= 4) score += 30;

  for (const term of terms) {
    let termScore = 0;
    if (label.split(' ').includes(term)) termScore += 16;
    else if (label.includes(term)) termScore += 10;
    if (component.includes(term)) termScore += 8;
    if (path.includes(term)) termScore += 7;
    if (aliases.includes(term)) termScore += 5;
    if (description.includes(term)) termScore += 4;
    if (document.searchableText.includes(term)) termScore += 2;
    if (termScore > 0) {
      score += termScore;
      matchedTerms.push(term);
    }
  }

  score += terms.length ? (new Set(matchedTerms).size / terms.length) * 12 : 0;
  if (document.navigable) score += 1;
  return { score, matchedTerms: [...new Set(matchedTerms)] };
}

function retrieve(index: readonly NavigatorDocument[], query: string, limit = 5): NavigatorHit[] {
  const terms = expandQuery(query);
  if (!terms.length) return [];
  return index
    .map((document) => ({ ...document, ...scoreDocument(document, terms, query) }))
    .filter((hit) => hit.score >= 8 && hit.matchedTerms.length)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, Math.max(1, limit));
}

function fallbackAnswer(query: string, hits: NavigatorHit[]): string {
  if (!hits.length) {
    return `I could not map "${query.trim()}" to a verified CareDroid location. Try a workflow name such as reception, EMS, queues, capacity, patient list, analytics, or medical tools.`;
  }
  const best = hits[0];
  const related = hits.slice(1, 3).map((hit) => hit.label);
  return [
    `The best match is ${best.label} (${best.path}).`,
    best.description,
    related.length ? `Related locations: ${related.join(' and ')}.` : '',
  ].filter(Boolean).join(' ');
}

function groundingPrompt(query: string, hits: NavigatorHit[]): string {
  const evidence = hits.map((hit, index) => [
    `[${index + 1}] ${hit.label}`,
    `route=${hit.path}`,
    `component=${hit.component}`,
    `description=${hit.description}`,
    `owner=${hit.workflowOwner}`,
  ].join(' | ')).join('\n');
  return [
    'You are the CareDroid application navigator, not a clinical decision maker.',
    'Answer only from the verified route evidence below. Never invent a route or capability.',
    'Give a concise answer, name the best location, and repeat its exact route in parentheses.',
    'If evidence is ambiguous, say so and list at most three verified choices.',
    `Question: ${query.trim()}`,
    'Verified route evidence:',
    evidence || '(none)',
  ].join('\n');
}

export interface NavigatorQueryResult {
  query: string;
  answer: string;
  source: 'catalog' | 'groq';
  providerError: string | null;
  destinations: Array<Omit<NavigatorHit, 'searchableText'>>;
}

@Injectable()
export class AppNavigatorService {
  private readonly logger = new Logger(AppNavigatorService.name);
  private readonly index: readonly NavigatorDocument[];
  private readonly catalog: NavigatorCatalogFile;

  constructor() {
    this.catalog = catalogData as NavigatorCatalogFile;
    this.index = buildIndex(this.catalog.records);
    this.logger.log(
      `App navigator ready: ${this.index.length} indexed locations (catalog generated ${this.catalog.generatedAt}).`,
    );
  }

  getHealth() {
    return {
      ok: true,
      documents: this.index.length,
      catalogCommit: this.catalog.sourceCommit,
      groqConfigured: Boolean(process.env.GROQ_API_KEY),
    };
  }

  getCatalog() {
    return { generatedAt: this.catalog.generatedAt, records: this.index };
  }

  async query(rawQuery: string): Promise<NavigatorQueryResult> {
    const query = String(rawQuery || '').trim();
    const hits = retrieve(this.index, query);
    const deterministic = fallbackAnswer(query, hits);
    let answer = deterministic;
    let source: 'catalog' | 'groq' = 'catalog';
    let providerError: string | null = null;

    if (hits.length && process.env.GROQ_API_KEY) {
      try {
        const groqReply = await this.groqAnswer(query, hits);
        answer = groqReply || deterministic;
        source = answer === deterministic ? 'catalog' : 'groq';
      } catch (error) {
        providerError = error instanceof Error ? error.message : 'Groq unavailable';
      }
    }

    return {
      query,
      answer,
      source,
      providerError,
      destinations: hits.map(({ searchableText: _searchableText, ...hit }) => hit),
    };
  }

  private async groqAnswer(query: string, hits: NavigatorHit[]): Promise<string | null> {
    if (!process.env.GROQ_API_KEY) return null;
    const timeoutMs = Number(process.env.GROQ_TIMEOUT_MS || 15_000);

    const response = await callAI(
      {
        requestType: 'APP_NAVIGATION',
        systemPrompt: 'Use supplied route evidence only. Do not provide clinical advice.',
        messages: [{ role: 'user', content: groundingPrompt(query, hits) }],
        maxTokens: 350,
      },
      {
        provider: 'groq',
        // Preserve prior behavior: any Groq failure degrades to the
        // deterministic catalog answer rather than silently trying a
        // different real provider on the caller's behalf.
        disableFallback: true,
        timeoutMs,
      },
    );
    return String(response.content || '').trim() || null;
  }
}
