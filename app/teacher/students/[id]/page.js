'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import SubjectTopicsView from '@/components/SubjectTopicsView';
import StatusBadge from '@/components/StatusBadge';

// Teacher Student Detail: displays whole student profile, overall stats, study plan, and all subjects
export default function TeacherStudentDetailPage() {
  const params = useParams();
  const [student, setStudent] = useState(null);
  const [report, setReport] = useState(null);
  const [activeSubjectId, setActiveSubjectId] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/teacher/students/${params.id}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load student.');
        return json;
      })
      .then((json) => {
        setStudent(json.student);
        setReport(json.report);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  const activeSubject =
    activeSubjectId === 'all'
      ? null
      : report?.subjects?.find((s) => s.id === activeSubjectId);

  return (
    <AppShell title="Student Comprehensive Analysis" requiredRole="teacher">
      <div style={{ marginBottom: 16 }}>
        <Link href="/teacher" className="btn btn-outline btn-sm">
          <i className="fa-solid fa-arrow-left" aria-hidden="true" />
          Back to Class Overview
        </Link>
      </div>

      {loading && <div className="card">Loading student report...</div>}

      {error && (
        <div className="alert alert-error">
          <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {student && report && (
        <>
          {/* Top Student Overview Cards */}
          <div className="stats-grid" style={{ gridTemplateColumns: '1.2fr 1fr 1fr 1fr' }}>
            <div className="stat-card">
              <div className="stat-label">Student Profile</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{student.name}</div>
              <div className="muted">{student.email}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Overall Readiness</div>
              <div className="stat-value">{report.overallReadiness}%</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Critical Gaps</div>
              <div className="stat-value" style={{ color: 'var(--critical)' }}>
                {report.criticalGapsCount}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Subjects At Risk</div>
              <div className="stat-value" style={{ color: report.subjectsAtRiskCount > 0 ? 'var(--attention)' : 'inherit' }}>
                {report.subjectsAtRiskCount}
              </div>
            </div>
          </div>

          {/* Complete Learning Gaps & Action Plan */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <div>
                <h2 className="card-title">Prioritized Learning Gaps & Root Causes</h2>
                <p className="muted">
                  Root gaps must be mastered first because later dependent topics rely on them.
                </p>
              </div>
            </div>

            {report.studyPlan.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 16px' }}>
                <i className="fa-solid fa-circle-check" aria-hidden="true" />
                <p>No learning gaps detected for this student across all subjects.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {report.studyPlan.map((item) => (
                  <div
                    key={item.id}
                    className="plan-item"
                    style={{
                      padding: '12px 16px',
                      background: item.isRootGap ? '#FEF2F2' : '#FFFFFF',
                    }}
                  >
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
                          <strong style={{ fontSize: 14 }}>{item.name}</strong>
                          <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>
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
                          {item.isAffected && (
                            <span className="tag tag-affected">
                              <i className="fa-solid fa-diagram-project" aria-hidden="true" />
                              Affected
                            </span>
                          )}
                          <StatusBadge status={item.status} />
                        </div>
                      </div>
                      <p style={{ fontSize: 13, marginTop: 4, color: 'var(--text)' }}>
                        {item.reason}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Navigation Tabs for Subject Views */}
          <div className="tabs">
            <button
              type="button"
              className={`tab-btn ${activeSubjectId === 'all' ? 'active' : ''}`}
              onClick={() => setActiveSubjectId('all')}
            >
              All Subjects ({report.subjects.length})
            </button>
            {report.subjects.map((sub) => (
              <button
                key={sub.id}
                type="button"
                className={`tab-btn ${sub.id === activeSubjectId ? 'active' : ''}`}
                onClick={() => setActiveSubjectId(sub.id)}
              >
                {sub.name} ({sub.readiness}%)
              </button>
            ))}
          </div>

          {/* Show All Subjects or Individual Subject Breakdown */}
          {activeSubjectId === 'all' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {report.subjects.map((sub) => (
                <SubjectTopicsView key={sub.id} subject={sub} />
              ))}
            </div>
          ) : (
            activeSubject && <SubjectTopicsView subject={activeSubject} />
          )}
        </>
      )}
    </AppShell>
  );
}
