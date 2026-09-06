import './Articles.css';

import { useEffect, useMemo, useState } from 'react';

import { useCareRecipientInfo } from '../../Context/CareRecipientContext';
import { searchRelevantSchemes } from './articleSearch';
import type { SchemeResult } from './articleSearch';

interface ArticleListProps {
  /** Conditions already stored for the patient. The component has no search input. */
  medicalHistory?: string | string[] | null;
}

function getHistoryQuery(medicalHistory: ArticleListProps['medicalHistory']) {
  if (Array.isArray(medicalHistory)) {
    return medicalHistory.filter(Boolean).join(' ').trim();
  }

  return medicalHistory?.trim() ?? '';
}

function ArticleList({ medicalHistory }: ArticleListProps) {
  const { careRecipient, loading: recipientLoading } = useCareRecipientInfo();
  const contextMedicalHistory = careRecipient?.medicalHistory.map(entry => entry.condition);
  const effectiveMedicalHistory = medicalHistory ?? contextMedicalHistory;
  const query = useMemo(() => getHistoryQuery(effectiveMedicalHistory), [effectiveMedicalHistory]);
  const [searchState, setSearchState] = useState<{
    query: string;
    articles: SchemeResult[];
    error: string;
  }>({ query: '', articles: [], error: '' });

  const loading = recipientLoading || (Boolean(query) && searchState.query !== query);
  const error = searchState.query === query ? searchState.error : '';

  useEffect(() => {
    let cancelled = false;

    if (!query) {
      return () => {
        cancelled = true;
      };
    }

    searchRelevantSchemes(query)
      .then(results => {
        if (!cancelled) setSearchState({ query, articles: results, error: '' });
      })
      .catch(searchError => {
        if (cancelled) return;
        setSearchState({
          query,
          articles: [],
          error: searchError instanceof Error ? searchError.message : 'Unable to load articles right now.',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  const visibleArticles = useMemo(() => {
    if (!query) return [];
    const articles = searchState.query === query ? searchState.articles : [];
    const recommended = articles.filter(article => article.recommended);
    return (recommended.length > 0 ? recommended : articles).slice(0, 2);
  }, [query, searchState]);

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

      {!loading && !error && !query && (
        <p className="ArticleList__empty">Articles will appear here using the patient&apos;s medical history.</p>
      )}

      {!loading && !error && query && visibleArticles.length === 0 && (
        <p className="ArticleList__empty">No suitable articles were found yet.</p>
      )}
    </section>
  );
}

export default ArticleList;
