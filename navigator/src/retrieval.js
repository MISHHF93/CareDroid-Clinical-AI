const STOP_WORDS = new Set([
  'a', 'an', 'and', 'anything', 'app', 'can', 'do', 'for', 'go', 'how', 'i', 'in', 'is',
  'it', 'me', 'of', 'on', 'open', 'please', 'show', 'take', 'the', 'this', 'to', 'where',
]);

const EXPANSIONS = Object.freeze({
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

export function normalize(value) {
  return String(value || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/[^a-z0-9/:?-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value) {
  return normalize(value).split(' ').filter((term) => term.length > 1 && !STOP_WORDS.has(term));
}

function expandQuery(query) {
  const base = tokenize(query);
  return [...new Set(base.flatMap((term) => [term, ...(EXPANSIONS[term] || [])]).flatMap(tokenize))];
}

export function buildIndex(records) {
  return Object.freeze(records.map((record) => {
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
      searchableText: normalize(Object.values(document).flat().join(' ')),
    });
  }));
}

function scoreDocument(document, terms, query) {
  const label = normalize(document.label);
  const description = normalize(document.description);
  const component = normalize(document.component);
  const path = normalize(document.path);
  const aliases = normalize(document.aliases.join(' '));
  const normalizedQuery = normalize(query);
  let score = 0;
  const matchedTerms = [];

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

export function retrieve(index, query, limit = 5) {
  const terms = expandQuery(query);
  if (!terms.length) return [];
  return index
    .map((document) => ({ ...document, ...scoreDocument(document, terms, query) }))
    .filter((hit) => hit.score >= 8 && hit.matchedTerms.length)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, Math.max(1, limit));
}

export function fallbackAnswer(query, hits) {
  if (!hits.length) {
    return `I could not map “${query.trim()}” to a verified CareDroid location. Try a workflow name such as reception, EMS, queues, capacity, patient list, analytics, or medical tools.`;
  }
  const best = hits[0];
  const related = hits.slice(1, 3).map((hit) => hit.label);
  return [
    `The best match is ${best.label} (${best.path}).`,
    best.description,
    related.length ? `Related locations: ${related.join(' and ')}.` : '',
  ].filter(Boolean).join(' ');
}

export function groundingPrompt(query, hits) {
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
