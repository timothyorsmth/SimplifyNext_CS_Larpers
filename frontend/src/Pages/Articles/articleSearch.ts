const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://127.0.0.1:8001';

export type ArticleCategory = 'Benefits' | 'Funding' | 'Support' | 'Other';

export interface SchemeResult {
  title: string;
  url: string;
  summary?: string;
  source?: string;
  publishedAt?: string;
  category: ArticleCategory;
  relevanceScore: number;
  sourceQuality: number;
  sentimentScore: number;
  recommended: boolean;
}

type ApiSearchResult = {
  title?: unknown;
  url?: unknown;
  summary?: unknown;
  source?: unknown;
  publishedAt?: unknown;
};

const positiveTerms = [
  'support',
  'benefit',
  'eligible',
  'eligibility',
  'accessible',
  'funding',
  'free',
  'help',
  'guidance',
  'care',
  'treatment',
  'assistance',
];

const negativeTerms = [
  'scam',
  'fraud',
  'unsafe',
  'misinformation',
  'dangerous',
  'danger',
  'complaint',
  'fake',
];

const trustedSources: Array<{ domains: string[]; score: number; name: string }> = [
  { domains: ['healthhub.sg', 'moh.gov.sg', 'gov.sg'], score: 1, name: 'Singapore public health' },
  { domains: ['nuhs.edu.sg', 'singhealth.com.sg'], score: 0.9, name: 'Singapore healthcare' },
  { domains: ['nhs.uk', 'nhsinform.scot'], score: 1, name: 'NHS' },
  { domains: ['gov.uk', 'gov.scot', 'gov.wales', 'nidirect.gov.uk'], score: 1, name: 'Government' },
  { domains: ['who.int'], score: 1, name: 'World Health Organization' },
  { domains: ['cdc.gov', 'medlineplus.gov', 'nih.gov'], score: 1, name: 'Public health service' },
  {
    domains: ['alzheimers.org.uk', 'ageuk.org.uk', 'diabetes.org.uk', 'macmillan.org.uk'],
    score: 0.9,
    name: 'Recognised charity',
  },
  { domains: ['mayoclinic.org', 'health.harvard.edu'], score: 0.85, name: 'Medical organisation' },
];

function matchesDomain(hostname: string, domain: string) {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

function getSourceQuality(url: string) {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    const trustedSource = trustedSources.find(source =>
      source.domains.some(domain => matchesDomain(hostname, domain)),
    );

    return trustedSource
      ? { score: trustedSource.score, name: trustedSource.name }
      : { score: 0.35, name: hostname };
  } catch {
    return { score: 0, name: 'Unknown source' };
  }
}

function analyzeSentiment(text: string): number {
  const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
  const positive = words.filter(word => positiveTerms.includes(word)).length;
  const negative = words.filter(word => negativeTerms.includes(word)).length;

  return (positive - negative) / Math.max(1, positive + negative);
}

function getRelevanceScore(text: string, condition: string): number {
  const searchableText = text.toLowerCase();
  const query = condition.toLowerCase().trim();
  const queryTerms = query.split(/\s+/).filter(term => term.length > 2);
  const matchingTerms = queryTerms.filter(term => searchableText.includes(term)).length;
  const phraseMatch = query.length > 2 && searchableText.includes(query) ? 2 : 0;

  return matchingTerms + phraseMatch;
}

function getCategory(text: string): ArticleCategory {
  const lowerText = text.toLowerCase();

  if (/fund|grant|financial|money|payment|allowance|cost/.test(lowerText)) {
    return 'Funding';
  }

  if (/support|carer|caregiver|help|service|assistance|application/.test(lowerText)) {
    return 'Support';
  }

  if (/benefit|eligible|eligibility|scheme|entitlement|available/.test(lowerText)) {
    return 'Benefits';
  }

  return 'Other';
}

function isSearchResult(
  value: ApiSearchResult,
): value is ApiSearchResult & { title: string; url: string } {
  return (
    typeof value.title === 'string' &&
    typeof value.url === 'string' &&
    value.title.length > 0 &&
    value.url.length > 0
  );
}

export async function searchRelevantSchemes(condition: string): Promise<SchemeResult[]> {
  const query = condition.trim();

  if (!query) return [];

  let response: Response;

  try {
    response = await fetch(`${API_BASE}/api/schemes/search?q=${encodeURIComponent(query)}`);
  } catch {
    throw new Error(
      `Cannot connect to the article service at ${API_BASE}. Start the backend with uvicorn on port 8001.`,
    );
  }

  if (!response.ok) {
    throw new Error('Unable to load articles right now.');
  }

  const payload: unknown = await response.json();
  const rawResults: ApiSearchResult[] = Array.isArray(payload)
    ? payload.filter((result): result is ApiSearchResult => typeof result === 'object' && result !== null)
    : typeof payload === 'object' && payload !== null && 'results' in payload && Array.isArray(payload.results)
      ? payload.results.filter((result): result is ApiSearchResult => typeof result === 'object' && result !== null)
      : [];

  const seenUrls = new Set<string>();

  return rawResults
    .filter(isSearchResult)
    .map(result => {
      const summary = typeof result.summary === 'string' ? result.summary : undefined;
      const text = `${result.title} ${summary ?? ''}`;
      const sourceInfo = getSourceQuality(result.url);
      const relevanceScore = getRelevanceScore(text, query);
      const sentimentScore = analyzeSentiment(text);

      return {
        title: result.title,
        url: result.url,
        summary,
        source: typeof result.source === 'string' ? result.source : sourceInfo.name,
        publishedAt: typeof result.publishedAt === 'string' ? result.publishedAt : undefined,
        category: getCategory(text),
        relevanceScore,
        sourceQuality: sourceInfo.score,
        sentimentScore,
        // Sentiment is only one check; source quality and relevance are also required.
        recommended: relevanceScore > 0 && sourceInfo.score >= 0.85 && sentimentScore >= -0.4,
      };
    })
    .filter(result => {
      if (seenUrls.has(result.url)) return false;
      seenUrls.add(result.url);
      return true;
    })
    .sort((a, b) => {
      const scoreA = (a.recommended ? 100 : 0) + a.relevanceScore * 10 + a.sourceQuality * 5 + a.sentimentScore;
      const scoreB = (b.recommended ? 100 : 0) + b.relevanceScore * 10 + b.sourceQuality * 5 + b.sentimentScore;
      return scoreB - scoreA;
    })
    .slice(0, 12);
}

// Searches each condition independently and merges the results, rather than
// joining every condition into one string and searching that as a single
// query. A joined string like "Type 2 Diabetes Hypertension" never matches
// any real article as a phrase, and splits into generic single words (e.g.
// "type") that spuriously match unrelated articles — this keeps each
// condition's phrase-matching meaningful and article relevance accurate for
// patients with more than one condition.
export async function searchRelevantSchemesForConditions(
  conditions: string[],
): Promise<SchemeResult[]> {
  const cleanedConditions = conditions.map(c => c.trim()).filter(Boolean);
  if (cleanedConditions.length === 0) return [];

  const resultsPerCondition = await Promise.all(
    cleanedConditions.map(condition => searchRelevantSchemes(condition)),
  );

  const merged = new Map<string, SchemeResult>();

  resultsPerCondition.forEach(results => {
    results.forEach(article => {
      const existing = merged.get(article.url);
      if (!existing) {
        merged.set(article.url, article);
        return;
      }
      // An article relevant to more than one of the patient's conditions
      // should rank higher than one relevant to only one — add the scores
      // rather than keeping just the first condition's result.
      merged.set(article.url, {
        ...existing,
        relevanceScore: existing.relevanceScore + article.relevanceScore,
        recommended: existing.recommended || article.recommended,
      });
    });
  });

  return Array.from(merged.values())
    .sort((a, b) => {
      const scoreA = (a.recommended ? 100 : 0) + a.relevanceScore * 10 + a.sourceQuality * 5 + a.sentimentScore;
      const scoreB = (b.recommended ? 100 : 0) + b.relevanceScore * 10 + b.sourceQuality * 5 + b.sentimentScore;
      return scoreB - scoreA;
    })
    .slice(0, 12);
}