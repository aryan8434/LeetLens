import React from "react";

export default function EvaluationHistory({
  onBack,
  historyReports = [],
  recentSearches = [],
  isLoading = false,
  onOpenReport,
  onReuseSearch,
}) {
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

      <section className="card history-card">
        <p className="topics-note" style={{ marginBottom: "1.1rem" }}>
          Reopen any of your past evaluations without spending credits.
        </p>

        <section className="profile-history-card">
          <div className="profile-history-head">
            <h3>Saved Evaluations</h3>
            <span>{historyReports.length} total</span>
          </div>
          {isLoading ? (
            <p className="profile-history-empty">
              Loading saved evaluations...
            </p>
          ) : historyReports.length > 0 ? (
            <div className="profile-history-list">
              {historyReports.map((rep) => (
                <article key={rep.id} className="profile-history-item">
                  <div>
                    <strong>@{rep.username}</strong>
                    <small>
                      {rep.timestamp
                        ? new Date(rep.timestamp).toLocaleString()
                        : "Date Unknown"}
                    </small>
                  </div>
                  <button
                    type="button"
                    className="profile-history-btn"
                    onClick={() => onOpenReport?.(rep)}
                  >
                    Open Saved Evaluation
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <p className="profile-history-empty">No saved evaluations yet.</p>
          )}
        </section>
      </section>
    </div>
  );
}
