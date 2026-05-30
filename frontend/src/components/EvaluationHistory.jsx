import React from "react";

export default function EvaluationHistory({ onBack, historyReports = [], recentSearches = [], onOpenReport, onReuseSearch }) {
  const recentSearchCards = recentSearches.map((search) => ({
    ...search,
    savedReport: historyReports.find(
      (report) => report.username?.toLowerCase() === search.normalized,
    ),
  }));

  return (
    <div className="evaluation-history-page">
      <div className="page-header-row">
        <button type="button" className="profile-back-btn" onClick={onBack}>
          ← Back
        </button>
        <h2 style={{ marginLeft: "1rem" }}>Evaluation History</h2>
      </div>

      <section className="card history-card reveal-on-scroll">
        <p className="topics-note">Reopen any of your past evaluations without spending credits.</p>

        <div className="profile-history-grid">
          <section className="profile-history-card">
            <div className="profile-history-head">
              <h3>Recent Searches</h3>
              <span>{recentSearchCards.length} saved</span>
            </div>
            {recentSearchCards.length > 0 ? (
              <div className="profile-history-list">
                {recentSearchCards.map((search) => (
                  <article key={search.normalized} className="profile-history-item">
                    <div>
                      <strong>@{search.username}</strong>
                      <small>{search.searchedAt ? new Date(search.searchedAt).toLocaleString() : "Recently searched"}</small>
                    </div>
                    <div className="profile-history-actions">
                      <button type="button" className="profile-history-btn" onClick={() => onReuseSearch?.(search.username)}>Reuse Search</button>
                      {search.savedReport ? (
                        <button type="button" className="profile-history-btn profile-history-btn-secondary" onClick={() => onOpenReport?.(search.savedReport)}>Open Saved Evaluation</button>
                      ) : (
                        <span className="profile-history-empty-note">No saved evaluation yet</span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="profile-history-empty">No recent searches.</p>
            )}
          </section>

          <section className="profile-history-card">
            <div className="profile-history-head">
              <h3>Saved Evaluations</h3>
              <span>{historyReports.length} total</span>
            </div>
            {historyReports.length > 0 ? (
              <div className="profile-history-list">
                {historyReports.map((rep) => (
                  <article key={rep.id} className="profile-history-item">
                    <div>
                      <strong>@{rep.username}</strong>
                      <small>{rep.timestamp ? new Date(rep.timestamp).toLocaleString() : "Date Unknown"}</small>
                    </div>
                    <button type="button" className="profile-history-btn" onClick={() => onOpenReport?.(rep)}>Open Saved Evaluation</button>
                  </article>
                ))}
              </div>
            ) : (
              <p className="profile-history-empty">No saved evaluations yet.</p>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
