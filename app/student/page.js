'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import ReadinessChart from '@/components/ReadinessChart';
import StatusBreakdownChart from '@/components/StatusBreakdownChart';
import StatusBadge from '@/components/StatusBadge';

// Student Dashboard: 3 stat cards, readiness bar chart, mastery breakdown doughnut, Top 5 gaps, and subject cards
export default function StudentDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/student/dashboard')
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load dashboard.');
        return json;
      })
      .then((json) => setData(json))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell title="Student Dashboard" requiredRole="student">
      {loading && <div className="card">Loading your gap analysis...</div>}

      {error && (
        <div className="alert alert-error">
          <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {data && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Overall Readiness</div>
              <div className="stat-value">{data.overallReadiness}%</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Critical Gaps</div>
              <div className="stat-value" style={{ color: 'var(--critical)' }}>
                {data.criticalGapsCount}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Subjects At Risk</div>
              <div className="stat-value" style={{ color: data.subjectsAtRiskCount > 0 ? 'var(--attention)' : 'inherit' }}>
                {data.subjectsAtRiskCount}
              </div>
            </div>
          </div>

          {/* Two Visual Graphs Side-by-Side */}
          <div className="two-col" style={{ gridTemplateColumns: '1.4fr 1fr', marginBottom: 24 }}>
            <div className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Readiness by Subject</h2>
                  <p className="muted">Average topic mastery across all subject assessments</p>
                </div>
              </div>
              {data.subjects.length === 0 ? (
                <div className="empty-state">
                  <i className="fa-solid fa-chart-column" aria-hidden="true" />
                  <p>No subjects available yet.</p>
                </div>
              ) : (
                <ReadinessChart subjects={data.subjects} />
              )}
            </div>

            <div className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Mastery Breakdown</h2>
                  <p className="muted">All enrolled topics by status</p>
                </div>
              </div>
              <StatusBreakdownChart distribution={data.distribution} />
            </div>
          </div>

          <div className="two-col" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Top 5 Gaps to Fix First</h2>
                <Link href="/student/study-plan" className="btn btn-outline btn-sm">
                  Full Study Plan
                </Link>
              </div>

              {data.topGaps.length === 0 ? (
                <div className="empty-state">
                  <i className="fa-solid fa-circle-check" aria-hidden="true" />
                  <p>No learning gaps detected. All topics are Strong.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {data.topGaps.map((gap) => (
                    <div
                      key={gap.id}
                      style={{
                        padding: '12px 14px',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 12,
                        background: gap.isRootGap ? '#FEF2F2' : '#FFFFFF',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                          {gap.priority}. {gap.name}
                        </div>
                        <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                          {gap.subjectName} &middot; {gap.reason}
                        </div>
                      </div>
                      <StatusBadge status={gap.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Enrolled Subjects</h2>
              </div>

              {data.subjects.length === 0 ? (
                <div className="empty-state">
                  <i className="fa-solid fa-book" aria-hidden="true" />
                  <p>No subjects enrolled yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {data.subjects.map((subject) => (
                    <Link
                      key={subject.id}
                      href={`/student/subjects/${subject.id}`}
                      className="subject-card"
                      style={{ padding: '14px 16px', gap: 8 }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15 }}>{subject.name}</div>
                          <div className="muted" style={{ fontSize: 12 }}>{subject.code}</div>
                        </div>
                        <span style={{ fontWeight: 800, fontSize: 18, color: subject.readiness >= 70 ? 'var(--strong)' : subject.readiness >= 50 ? 'var(--attention)' : 'var(--critical)' }}>
                          {subject.readiness}%
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: 12,
                        }}
                      >
                        <span className="muted">
                          {subject.criticalCount} critical{' '}
                          {subject.criticalCount === 1 ? 'gap' : 'gaps'}
                        </span>
                        {subject.attendance.isAtRisk ? (
                          <span className="badge badge-critical" style={{ fontSize: 11, padding: '2px 8px' }}>
                            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                            Attendance {subject.attendance.percentage}%
                          </span>
                        ) : (
                          <span className="muted">
                            Attendance{' '}
                            {subject.attendance.percentage !== null
                              ? `${subject.attendance.percentage}%`
                              : '—'}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
