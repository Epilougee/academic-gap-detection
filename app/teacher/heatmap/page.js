'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';

// Topic Heatmap: grid of students x topics colored by mastery status
export default function TeacherHeatmapPage() {
  const [data, setData] = useState(null);
  const [subjectId, setSubjectId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    const query = subjectId ? `?subjectId=${subjectId}` : '';
    fetch(`/api/teacher/heatmap${query}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load heatmap.');
        return json;
      })
      .then((json) => {
        setData(json);
        if (!subjectId && json.selectedSubjectId) {
          setSubjectId(String(json.selectedSubjectId));
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [subjectId]);

  function getCellClass(status) {
    if (status === 'Strong') return 'hm-strong';
    if (status === 'Needs Attention') return 'hm-attention';
    if (status === 'Critical Gap') return 'hm-critical';
    return 'hm-nodata';
  }

  return (
    <AppShell title="Topic Heatmap" requiredRole="teacher">
      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap' }}>
          <div>
            <h2 className="card-title">Class Mastery Grid</h2>
            <p className="muted">
              Green: 70%+ (Strong) &middot; Amber: 50-69% (Needs Attention) &middot; Red: Below 50% (Critical Gap)
            </p>
          </div>

          {data?.subjects && (
            <select
              className="select"
              style={{ maxWidth: 280 }}
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
            >
              {data.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          )}
        </div>

        {loading && <p className="muted">Loading heatmap...</p>}

        {error && (
          <div className="alert alert-error">
            <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {!loading && data && data.topics.length === 0 && (
          <div className="empty-state">
            <i className="fa-solid fa-table-cells" aria-hidden="true" />
            <p>No topics found for this subject.</p>
            <Link href="/teacher/subjects" className="btn btn-primary">
              Add Topics
            </Link>
          </div>
        )}

        {!loading && data && data.topics.length > 0 && (
          <div className="table-wrap">
            <table className="heatmap-table">
              <thead>
                <tr>
                  <th className="student-col">Student</th>
                  {data.topics.map((topic) => (
                    <th key={topic.id}>{topic.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.id}>
                    <td className="student-col">
                      <Link
                        href={`/teacher/students/${row.id}`}
                        style={{ fontWeight: 600, color: 'var(--primary)' }}
                      >
                        {row.name}
                      </Link>
                    </td>
                    {row.cells.map((cell) => (
                      <td
                        key={cell.topicId}
                        className={`hm-cell ${getCellClass(cell.status)}`}
                        title={`${row.name}: ${cell.status}`}
                      >
                        {cell.mastery !== null ? `${cell.mastery}%` : '—'}
                      </td>
                    ))}
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

