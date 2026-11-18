'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import ClassReadinessChart from '@/components/ClassReadinessChart';

// Teacher Class Overview: 4 summary stat cards, class distribution chart, and searchable student roster
export default function TeacherOverviewPage() {
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/teacher/overview')
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load class overview.');
        return json;
      })
      .then((json) => {
        setStudents(json.students || []);
        setStats(json.stats || null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.trim().toLowerCase()) ||
      s.email.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <AppShell title="Class Overview" requiredRole="teacher">
      {stats && (
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div className="stat-card">
            <div className="stat-label">Total Students</div>
            <div className="stat-value">{stats.totalStudents}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Class Avg Readiness</div>
            <div className="stat-value">{stats.avgReadiness}%</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Critical Gaps</div>
            <div className="stat-value" style={{ color: 'var(--critical)' }}>
              {stats.totalCriticalGaps}
            </div>
          </div>
          <Link href="/teacher/attendance" className="stat-card" style={{ textDecoration: 'none' }} title="View Attendance & Import Excel">
            <div className="stat-label">Attendance Risk</div>
            <div className="stat-value" style={{ color: stats.atRiskStudentsCount > 0 ? 'var(--attention)' : 'inherit' }}>
              {stats.atRiskStudentsCount}
            </div>
            <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
              Manage &amp; Import &rarr;
            </div>
          </Link>
        </div>
      )}

      {stats?.distribution && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <div>
              <h2 className="card-title">Class Readiness Breakdown</h2>
              <p className="muted">Student distribution by academic standing</p>
            </div>
          </div>
          <ClassReadinessChart distribution={stats.distribution} />
        </div>
      )}

      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap' }}>
          <div>
            <h2 className="card-title">Students ({filtered.length})</h2>
            <p className="muted">Click any student to inspect their topic-level gap report.</p>
          </div>
          <input
            type="search"
            className="input"
            style={{ maxWidth: 280 }}
            placeholder="Search student by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading && <p className="muted">Loading class data...</p>}

        {error && (
          <div className="alert alert-error">
            <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="empty-state">
            <i className="fa-solid fa-users" aria-hidden="true" />
            <p>No matching students found.</p>
            {search && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setSearch('')}
              >
                Clear Search
              </button>
            )}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Readiness</th>
                  <th>Critical Gaps</th>
                  <th>Attendance Risk</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{student.name}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {student.email}
                      </div>
                    </td>
                    <td>
                      <strong
                        style={{
                          color:
                            student.overallReadiness >= 70
                              ? 'var(--strong)'
                              : student.overallReadiness >= 50
                              ? 'var(--attention)'
                              : 'var(--critical)',
                        }}
                      >
                        {student.overallReadiness}%
                      </strong>
                    </td>
                    <td>
                      {student.criticalGapsCount > 0 ? (
                        <span className="badge badge-critical">
                          <i className="fa-solid fa-circle-xmark" aria-hidden="true" />
                          {student.criticalGapsCount} critical
                        </span>
                      ) : (
                        <span className="badge badge-strong">
                          <i className="fa-solid fa-circle-check" aria-hidden="true" />
                          0 critical
                        </span>
                      )}
                    </td>
                    <td>
                      {student.attendanceRisk ? (
                        <span className="badge badge-critical">
                          <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                          At Risk ({student.subjectsAtRiskCount})
                        </span>
                      ) : (
                        <span className="badge badge-strong">
                          <i className="fa-solid fa-circle-check" aria-hidden="true" />
                          On Track
                        </span>
                      )}
                    </td>
                    <td>
                      <Link
                        href={`/teacher/students/${student.id}`}
                        className="btn btn-outline btn-sm"
                      >
                        View Gaps
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
