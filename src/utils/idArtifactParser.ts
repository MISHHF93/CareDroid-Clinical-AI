/**
 * Heuristic text extraction for ID cards, health cards, and referral documents.
 * Staff must confirm all fields before chart write — parser output is provisional only.
 */

export type IdArtifactDemographics = {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  sex?: string;
  phone?: string;
  email?: string;
  address?: string;
  healthCardNumber?: string;
  mrn?: string;
  bloodType?: string;
  documentNumber?: string;
  nationality?: string;
  documentExpiry?: string;
};

const BLOOD_TYPE_PATTERN =
  /\b(?:blood\s*(?:type|group)|grp\.?)\s*[-:]?\s*(A|B|AB|O)\s*([+-]|positive|negative|pos|neg)?\b/i;

const DOB_PATTERNS = [
  /\b(?:dob|date\s*of\s*birth|birth\s*date|born)\s*[-:]?\s*([0-9]{4}-[0-9]{2}-[0-9]{2})\b/i,
  /\b(?:dob|date\s*of\s*birth|birth\s*date|born)\s*[-:]?\s*([0-9]{1,2}[/.-][0-9]{1,2}[/.-][0-9]{2,4})\b/i,
  /\b([0-9]{4}-[0-9]{2}-[0-9]{2})\b/,
  /\b([0-9]{1,2}[/.-][0-9]{1,2}[/.-][0-9]{4})\b/,
];

const NAME_PATTERNS = [
  /\b(?:first\s*name|given\s*name|prénom)\s*[-:]\s*([A-Za-z][A-Za-z' -]{0,40})\b/i,
  /\b(?:last\s*name|surname|family\s*name|nom)\s*[-:]\s*([A-Za-z][A-Za-z' -]{0,40})\b/i,
  /\bname\s*[-:]\s*([A-Za-z][A-Za-z' -]{1,40})\s+([A-Za-z][A-Za-z' -]{1,40})\b/i,
  /\b([A-Za-z][A-Za-z' -]{1,40}),\s*([A-Za-z][A-Za-z' -]{1,40})\b/,
];

function cleanValue(value: string | undefined): string | undefined {
  const trimmed = String(value || '').trim();
  return trimmed || undefined;
}

function titleCaseName(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export function normalizeDateOfBirth(raw: string | undefined): string | undefined {
  const value = cleanValue(raw);
  if (!value) return undefined;

  if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)) return value;

  const slashMatch = value.match(/^([0-9]{1,2})[/.-]([0-9]{1,2})[/.-]([0-9]{2,4})$/);
  if (!slashMatch) return value;

  let [, month, day, year] = slashMatch;
  if (year.length === 2) {
    const numericYear = Number(year);
    year = numericYear >= 30 ? `19${year}` : `20${year}`;
  }

  const mm = month.padStart(2, '0');
  const dd = day.padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

function parseBloodType(text: string): string | undefined {
  const match = text.match(BLOOD_TYPE_PATTERN);
  if (!match) {
    const standalone =
      text.match(/\b(AB|A|B|O)\s*([+-])\b/) || text.match(/(?:^|\s)(AB|A|B|O)\s*([+-])$/m);
    if (!standalone) return undefined;
    return `${standalone[1].toUpperCase()}${standalone[2]}`;
  }

  const group = match[1].toUpperCase();
  const signRaw = String(match[2] || '+').toLowerCase();
  const sign = signRaw.startsWith('neg') || signRaw === '-' ? '-' : '+';
  return `${group}${sign}`;
}

function parseSex(text: string): string | undefined {
  const labeled = text.match(/\b(?:sex|gender)\s*[-:]\s*(male|female|m|f|other|x)\b/i);
  if (labeled) {
    const token = labeled[1].toLowerCase();
    if (token === 'm' || token === 'male') return 'Male';
    if (token === 'f' || token === 'female') return 'Female';
    return titleCaseName(token);
  }
  return undefined;
}

function parseNames(text: string): Pick<IdArtifactDemographics, 'firstName' | 'lastName'> {
  const result: Pick<IdArtifactDemographics, 'firstName' | 'lastName'> = {};

  const first = text.match(
    /\b(?:first\s*name|given\s*name|prénom)\s*[-:]\s*([A-Za-z][A-Za-z' -]{0,40})\b/i,
  );
  const last = text.match(
    /\b(?:last\s*name|surname|family\s*name|nom)\s*[-:]\s*([A-Za-z][A-Za-z' -]{0,40})\b/i,
  );
  if (first) result.firstName = titleCaseName(first[1].trim());
  if (last) result.lastName = titleCaseName(last[1].trim());
  if (result.firstName && result.lastName) return result;

  for (const pattern of NAME_PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;
    if (pattern.source.includes('first')) continue;
    if (match.length >= 3) {
      result.firstName = result.firstName || titleCaseName(match[1].trim());
      result.lastName = result.lastName || titleCaseName(match[2].trim());
      break;
    }
  }

  return result;
}

function parseIdentifiers(
  text: string,
): Pick<IdArtifactDemographics, 'healthCardNumber' | 'mrn' | 'documentNumber'> {
  const healthCard = text.match(
    /\b(?:health\s*card|hcn|ohip|ramq|phn|health\s*#)\s*[-#:]?\s*([A-Z0-9][-A-Z0-9 ]{4,})\b/i,
  );
  const mrn = text.match(/\b(?:mrn|medical\s*record)\s*[-#:]?\s*([-A-Z0-9]{4,})\b/i);
  const documentNumber = text.match(
    /\b(?:licen[cs]e|document|id|passport)\s*(?:no\.?|number|#)?\s*[-#:]?\s*([-A-Z0-9]{4,})\b/i,
  );

  return {
    healthCardNumber: cleanValue(healthCard?.[1]?.replace(/\s+/g, '')),
    mrn: cleanValue(mrn?.[1]),
    documentNumber: cleanValue(documentNumber?.[1]),
  };
}

export function inferTextHintsFromFilename(filename: string): string {
  const base = String(filename || '')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/_/g, ' ')
    .trim();

  if (!base) return '';

  const blood = base.match(/\b(AB|A|B|O)([+-])\b/i) || base.match(/(?:^|\s)(AB|A|B|O)([+-])$/i);
  const isoDob = base.match(/\b([0-9]{4}-[0-9]{2}-[0-9]{2})\b/);
  const slashDob = base.match(/\b([0-9]{1,2}[/.-][0-9]{1,2}[/.-][0-9]{2,4})\b/);

  const tokens = base
    .split(/\s+/)
    .filter((token) => !/^(id|health|card|license|licence|scan|photo|img|document)$/i.test(token))
    .filter((token) => !isoDob?.[0]?.includes(token) && !slashDob?.[0]?.includes(token))
    .filter((token) => !(blood && token.toUpperCase().startsWith(blood[1].toUpperCase())));

  const nameTokens = tokens.filter((token) => /^[A-Za-z][A-Za-z'-]{1,}$/.test(token));
  const lines = [`filename: ${base}`];

  if (nameTokens.length >= 2) {
    lines.push(`first name: ${nameTokens[0]}`);
    lines.push(`last name: ${nameTokens.slice(1).join(' ')}`);
  } else if (nameTokens.length === 1) {
    lines.push(`name: ${nameTokens[0]}`);
  }
  if (isoDob) lines.push(`date of birth: ${isoDob[1]}`);
  if (slashDob) lines.push(`date of birth: ${slashDob[1]}`);
  if (blood) lines.push(`blood type: ${blood[1].toUpperCase()}${blood[2]}`);

  return lines.join('\n');
}

export function parseIdArtifactText(text = ''): IdArtifactDemographics {
  const normalized = String(text || '').trim();
  if (!normalized) return {};

  const demographics: IdArtifactDemographics = {
    ...parseNames(normalized),
    ...parseIdentifiers(normalized),
  };

  for (const pattern of DOB_PATTERNS) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      demographics.dateOfBirth = normalizeDateOfBirth(match[1]);
      break;
    }
  }

  const sex = parseSex(normalized);
  if (sex) demographics.sex = sex;

  const phone = normalized.match(/\b(?:phone|tel|mobile|cell)\s*[-:]?\s*([+0-9().\-\s]{7,})\b/i);
  if (phone?.[1]) demographics.phone = cleanValue(phone[1]);

  const email = normalized.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
  if (email?.[0]) demographics.email = email[0];

  const address = normalized.match(/\b(?:address|addr)\s*[-:]\s*([^\n;]{6,80})/i);
  if (address?.[1]) demographics.address = cleanValue(address[1]);

  const bloodType = parseBloodType(normalized);
  if (bloodType) demographics.bloodType = bloodType;

  const nationality = normalized.match(
    /\b(?:nationality|citizen(?:ship)?)\s*[-:]\s*([A-Za-z][A-Za-z ]{2,30})\b/i,
  );
  if (nationality?.[1]) demographics.nationality = titleCaseName(nationality[1].trim());

  const expiry = normalized.match(
    /\b(?:exp(?:iry|ires)?|valid\s*until)\s*[-:]?\s*([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{1,2}[/.-][0-9]{1,2}[/.-][0-9]{2,4})\b/i,
  );
  if (expiry?.[1]) demographics.documentExpiry = normalizeDateOfBirth(expiry[1]);

  return Object.fromEntries(
    Object.entries(demographics).filter(([, value]) => cleanValue(String(value || ''))),
  ) as IdArtifactDemographics;
}

export function mergeDemographics(
  ...sources: Array<IdArtifactDemographics | null | undefined>
): IdArtifactDemographics {
  return sources.reduce<IdArtifactDemographics>((merged, source) => {
    if (!source) return merged;
    Object.entries(source).forEach(([key, value]) => {
      const field = key as keyof IdArtifactDemographics;
      if (merged[field]) return;
      const cleaned = cleanValue(String(value || ''));
      if (cleaned) merged[field] = cleaned;
    });
    return merged;
  }, {});
}
