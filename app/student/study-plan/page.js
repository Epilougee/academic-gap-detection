'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import StatusBadge from '@/components/StatusBadge';

// Student Study Plan: numbered list of topics in priority order with one-line reasons
export default function StudentStudyPlanPage() {
  const [plan, setPlan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/student/study-plan')
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load study plan.');
        return json;
      })
      .then((json) => setPlan(json.studyPlan || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell title="Study Plan" requiredRole="student">
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 className="card-title">Suggested Study Order</h2>
        <p className="muted" style={{ marginTop: 4 }}>
          Topics are ordered by Root Gaps first, then Critical Gaps, Declining topics, and Needs Attention.
        </p>
      </div>

      {loading && <div className="card">Building your study plan...</div>}

      {error && (
        <div className="alert alert-error">
          <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && plan.length === 0 && (
        <div className="card empty-state">
          <i className="fa-solid fa-circle-check" aria-hidden="true" />
          <p>Great work! You have no weak or declining topics to catch up on.</p>
          <Link href="/student" className="btn btn-primary">
            Back to Dashboard
          </Link>
        </div>
      )}

      {!loading && plan.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {plan.map((item) => (
            <div key={item.id} className="plan-item">
              <div className="plan-num">{item.priority}</div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{item.name}</span>
                    <span className="muted" style={{ marginLeft: 8 }}>
                      ({item.subjectName})
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {item.isRootGap && (
                      <span className="tag tag-root">
                        <i className="fa-solid fa-link" aria-hidden="true" />
                        Root Gap
                      </span>
                    )}
                    <StatusBadge status={item.status} />
                  </div>
                </div>
                <p style={{ fontSize: 14, marginTop: 6, color: 'var(--text)' }}>
                  {item.reason}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}

