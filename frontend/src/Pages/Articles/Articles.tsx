import './Articles.css';

import { useEffect, useMemo, useState } from 'react';

import { useCareRecipientInfo } from '../../Context/CareRecipientContext';
import { searchRelevantSchemesForConditions } from './articleSearch';
import type { SchemeResult } from './articleSearch';

interface ArticleListProps {
  /** Conditions already stored for the patient. The component has no search input. */
  medicalHistory?: string | string[] | null;
}

function getHistoryConditions(medicalHistory: ArticleListProps['medicalHistory']): string[] {
  if (Array.isArray(medicalHistory)) {
    return medicalHistory.map(c => c.trim()).filter(Boolean);
  }
  const trimmed = medicalHistory?.trim();
  return trimmed ? [trimmed] : [];
}

function ArticleList({ medicalHistory }: ArticleListProps) {
  const { careRecipient, loading: recipientLoading } = useCareRecipientInfo();
  const contextMedicalHistory = careRecipient?.medicalHistory.map(entry => entry.condition);
  const effectiveMedicalHistory = medicalHistory ?? contextMedicalHistory;
  const conditions = useMemo(() => getHistoryConditions(effectiveMedicalHistory), [effectiveMedicalHistory]);
  // Stable cache key for "have we already searched for this exact set of
  // conditions" — used instead of comparing arrays by reference.
  const conditionsKey = conditions.join('|');

  const [searchState, setSearchState] = useState<{
    key: string;
    articles: SchemeResult[];
    error: string;
  }>({ key: '', articles: [], error: '' });

  const loading = recipientLoading || (conditions.length > 0 && searchState.key !== conditionsKey);
  const error = searchState.key === conditionsKey ? searchState.error : '';

  useEffect(() => {
    let cancelled = false;

    if (conditions.length === 0) {
      return () => {
        cancelled = true;
      };
    }

    searchRelevantSchemesForConditions(conditions)
      .then(results => {
        if (!cancelled) setSearchState({ key: conditionsKey, articles: results, error: '' });
      })
      .catch(searchError => {
        if (cancelled) return;
        setSearchState({
          key: conditionsKey,
          articles: [],
          error: searchError instanceof Error ? searchError.message : 'Unable to load articles right now.',
        });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conditionsKey]);

  const visibleArticles = useMemo(() => {
    if (conditions.length === 0) return [];
    const articles = searchState.key === conditionsKey ? searchState.articles : [];
    const recommended = articles.filter(article => article.recommended);
    return (recommended.length > 0 ? recommended : articles).slice(0, 2);
  }, [conditions, conditionsKey, searchState]);

  return (
    <section className="ArticleList" aria-labelledby="articles-heading" aria-busy={loading}>
      <div className="ArticleList__header">
        <h2 id="articles-heading">Articles for you:</h2>
      </div>

      {error && <p className="ArticleList__error" role="alert">{error}</p>}

      <div className="ArticleList__cards" aria-live="polite">
        {loading && [0, 1].map(card => (
          <div className="ArticleList__card ArticleList__card--loading" key={card} aria-hidden="true" />
        ))}

        {!loading && visibleArticles.map(article => (
          <a className="ArticleList__card" href={article.url} key={article.url} target="_blank" rel="noreferrer">
            <div className="ArticleList__card-meta">
              <span>{article.category}</span>
              {article.recommended && <span>Recommended</span>}
            </div>

            <h3>{article.title}</h3>

            {article.summary && <p>{article.summary}</p>}

            <small>
              {article.source}
              {article.publishedAt ? ` · ${article.publishedAt}` : ''}
            </small>
          </a>
        ))}
      </div>

      {!loading && !error && conditions.length === 0 && (
        <p className="ArticleList__empty">Articles will appear here using the patient&apos;s medical history.</p>
      )}

      {!loading && !error && conditions.length > 0 && visibleArticles.length === 0 && (
        <p className="ArticleList__empty">No suitable articles were found yet.</p>
      )}
    </section>
  );
}

export default ArticleList;