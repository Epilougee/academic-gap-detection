'use client';

import StatusBadge from './StatusBadge';

// Shared topic-level breakdown used by both Student Subject Detail and Teacher Student Detail
export default function SubjectTopicsView({ subject }) {
  if (!subject) return null;

  function getFillClass(status) {
    if (status === 'Strong') return 'fill-strong';
    if (status === 'Needs Attention') return 'fill-attention';
    return 'fill-critical';
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header" style={{ marginBottom: 8 }}>
          <div>
            <h2 className="card-title" style={{ fontSize: 18 }}>
              {subject.name} ({subject.code})
            </h2>
            <p className="muted" style={{ marginTop: 4 }}>
              Subject Readiness: <strong>{subject.readiness}%</strong> &middot; Attendance:{' '}
              <strong>
                {subject.attendance?.percentage !== null
                  ? `${subject.attendance.percentage}%`
                  : 'No Data'}
              </strong>{' '}
              {subject.attendance?.isAtRisk && (
                <span className="badge badge-critical" style={{ marginLeft: 6 }}>
                  <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                  At Risk (below 75%)
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {subject.topics.length === 0 ? (
        <div className="card empty-state">
          <i className="fa-solid fa-book-open" aria-hidden="true" />
          <p>No topics have been added to this subject yet.</p>
        </div>
      ) : (
        <div className="topic-list">
          {subject.topics.map((topic) => (
            <div key={topic.id} className="topic-row">
              <div>
                <div className="topic-name">{topic.name}</div>
                {topic.prerequisiteName && (
                  <div className="topic-prereq">
                    Depends on: {topic.prerequisiteName}
                  </div>
                )}
                {(topic.isRootGap || topic.isAffected || topic.isDeclining) && (
                  <div className="topic-tags">
                    {topic.isRootGap && (
                      <span className="tag tag-root">
                        <i className="fa-solid fa-link" aria-hidden="true" />
                        Root Gap
                      </span>
                    )}
                    {topic.isAffected && (
                      <span className="tag tag-affected">
                        <i className="fa-solid fa-diagram-project" aria-hidden="true" />
                        Affected
                      </span>
                    )}
                    {topic.isDeclining && (
                      <span className="tag tag-declining">
                        <i className="fa-solid fa-arrow-trend-down" aria-hidden="true" />
                        Declining (-{topic.drop} pts)
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 13,
                    marginBottom: 6,
                  }}
                >
                  <span className="muted">Mastery</span>
                  <strong>{topic.mastery !== null ? `${topic.mastery}%` : '—'}</strong>
                </div>
                <div className="progress-track">
                  <div
                    className={`progress-fill ${getFillClass(topic.status)}`}
                    style={{ width: `${topic.mastery ?? 0}%` }}
                  />
                </div>
              </div>

              <div>
                <StatusBadge status={topic.status} />
              </div>

              <div style={{ fontSize: 13 }}>
                {topic.trend === 'declining' && (
                  <span style={{ color: 'var(--critical)', fontWeight: 600 }}>
                    <i className="fa-solid fa-arrow-down" aria-hidden="true" /> Declining
                  </span>
                )}
                {topic.trend === 'improving' && (
                  <span style={{ color: 'var(--strong)', fontWeight: 600 }}>
                    <i className="fa-solid fa-arrow-up" aria-hidden="true" /> Improving
                  </span>
                )}
                {topic.trend === 'stable' && (
                  <span className="muted">
                    <i className="fa-solid fa-minus" aria-hidden="true" /> Steady
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

