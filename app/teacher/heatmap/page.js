'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';

export default function TeacherHeatmapPage() {
  const [data, setData] = useState(null);
  const [subjectId, setSubjectId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Mode: 'subject' (Subject-Wise Overview - Reduced Columns) or 'topic' (Topic-Wise Details)
  const [viewMode, setViewMode] = useState('subject');

  // Topic filter in topic mode: 'all', 'weak' (mastery < 70%), or 'critical' (mastery < 50%)
  const [topicFilter, setTopicFilter] = useState('all');

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

  // Filter topics based on topicFilter
  const filteredTopics = (data?.topics || []).filter((t) => {
    if (topicFilter === 'critical') return t.avgMastery < 50 || t.criticalCount > 0;
    if (topicFilter === 'weak') return t.avgMastery < 70 || t.weakCount > 0;
    return true;
  });

  const filteredTopicIds = new Set(filteredTopics.map((t) => t.id));

  return (
    <AppShell title="Class Mastery Heatmap" requiredRole="teacher">
      <div className="card">
        {/* Header & View Mode Switcher */}
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 14 }}>
          <div>
            <h2 className="card-title">Class Performance Heatmap</h2>
            <p className="muted">
              Green: &ge;70% (Strong) &middot; Amber: 50&ndash;69% (Needs Attention) &middot; Red: Below 50% (Critical Gap)
            </p>
          </div>

          {/* View Mode Toggle: Subject-wise vs Topic-wise */}
          <div style={{ display: 'flex', gap: 8, background: '#F1F5F9', padding: 4, borderRadius: 8 }}>
            <button
              type="button"
              className={`btn btn-sm ${viewMode === 'subject' ? 'btn-primary' : 'btn-outline'}`}
              style={{ border: 'none', boxShadow: viewMode === 'subject' ? 'var(--shadow-sm)' : 'none' }}
              onClick={() => setViewMode('subject')}
            >
              <i className="fa-solid fa-layer-group" style={{ marginRight: 6 }} />
              Subject-Wise Overview (Reduced)
            </button>
            <button
              type="button"
              className={`btn btn-sm ${viewMode === 'topic' ? 'btn-primary' : 'btn-outline'}`}
              style={{ border: 'none', boxShadow: viewMode === 'topic' ? 'var(--shadow-sm)' : 'none' }}
              onClick={() => setViewMode('topic')}
            >
              <i className="fa-solid fa-table-cells" style={{ marginRight: 6 }} />
              Topic Details
            </button>
          </div>
        </div>

        {/* Sub-toolbar based on active view mode */}
        {viewMode === 'topic' && data?.subjects && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              padding: '12px 0 18px 0',
              borderBottom: '1px solid var(--border)',
              marginBottom: 16,
            }}
          >
            {/* Subject Selector Tabs */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {data.subjects.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`tab-btn ${String(subjectId) === String(s.id) ? 'active' : ''}`}
                  onClick={() => setSubjectId(String(s.id))}
                >
                  {s.name} ({s.code})
                </button>
              ))}
            </div>

            {/* Reduce Topics Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>
                Reduce Topics:
              </span>
              <div className="tabs" style={{ marginBottom: 0 }}>
                <button
                  type="button"
                  className={`tab-btn ${topicFilter === 'all' ? 'active' : ''}`}
                  style={{ padding: '5px 10px', fontSize: 12 }}
                  onClick={() => setTopicFilter('all')}
                >
                  All ({data.topics.length})
                </button>
                <button
                  type="button"
                  className={`tab-btn ${topicFilter === 'weak' ? 'active' : ''}`}
                  style={{ padding: '5px 10px', fontSize: 12 }}
                  onClick={() => setTopicFilter('weak')}
                  title="Show only weak & critical topics"
                >
                  Weak &lt; 70%
                </button>
                <button
                  type="button"
                  className={`tab-btn ${topicFilter === 'critical' ? 'active' : ''}`}
                  style={{ padding: '5px 10px', fontSize: 12 }}
                  onClick={() => setTopicFilter('critical')}
                  title="Show only critical gap topics"
                >
                  Critical Only &lt; 50%
                </button>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <p className="muted" style={{ padding: '30px 0', textAlign: 'center' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }} />
            Loading class heatmap...
          </p>
        )}

        {error && (
          <div className="alert alert-error">
            <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {/* ================= MODE 1: SUBJECT-WISE HEATMAP ================= */}
        {!loading && data && viewMode === 'subject' && (
          <div>
            <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--muted)' }}>
              Showing subject-level readiness across all {data.subjects.length} subjects for {data.subjectRows.length} students.
            </div>
            <div className="table-wrap">
              <table className="heatmap-table">
                <thead>
                  <tr>
                    <th className="student-col">Student Name</th>
                    <th style={{ minWidth: 120 }}>Overall Readiness</th>
                    {data.subjects.map((sub) => (
                      <th key={sub.id} style={{ minWidth: 140 }}>
                        <div>{sub.name}</div>
                        <div className="muted" style={{ fontSize: 11, fontWeight: 500 }}>
                          {sub.code}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.subjectRows.map((row) => (
                    <tr key={row.id}>
                      <td className="student-col">
                        <Link
                          href={`/teacher/students/${row.id}`}
                          style={{ fontWeight: 600, color: 'var(--primary)' }}
                        >
                          {row.name}
                        </Link>
                      </td>
                      <td className={`hm-cell ${getCellClass(row.overallStatus)}`}>
                        {row.overallReadiness}%
                      </td>
                      {row.cells.map((cell) => (
                        <td
                          key={cell.subjectId}
                          className={`hm-cell ${getCellClass(cell.status)}`}
                          title={`${row.name} - ${cell.subjectName}: ${cell.readiness}% (${cell.status})`}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            <span>{cell.readiness}%</span>
                            {cell.isAttendanceAtRisk && (
                              <i
                                className="fa-solid fa-triangle-exclamation"
                                style={{ color: 'var(--critical)', fontSize: 11 }}
                                title={`Attendance at risk: ${cell.attendancePercentage}%`}
                              />
                            )}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= MODE 2: TOPIC-WISE DETAIL HEATMAP ================= */}
        {!loading && data && viewMode === 'topic' && (
          <div>
            {filteredTopics.length === 0 ? (
              <div className="empty-state">
                <i className="fa-solid fa-circle-check" style={{ color: 'var(--strong)' }} />
                <p>No topics match the selected filter. All topics are in good standing!</p>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setTopicFilter('all')}
                >
                  View All Topics
                </button>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: 10, fontSize: 12, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>
                    Displaying <strong>{filteredTopics.length}</strong> of {data.topics.length} topics.
                  </span>
                  <span>Click any student name to inspect their full learning gap diagnostic report.</span>
                </div>
                <div className="table-wrap">
                  <table className="heatmap-table">
                    <thead>
                      <tr>
                        <th className="student-col">Student</th>
                        {filteredTopics.map((topic) => (
                          <th key={topic.id} style={{ minWidth: 120 }}>
                            <div style={{ fontWeight: 700 }}>{topic.name}</div>
                            <div
                              style={{
                                marginTop: 4,
                                fontSize: 10.5,
                                fontWeight: 600,
                                color:
                                  topic.avgMastery >= 70
                                    ? 'var(--strong)'
                                    : topic.avgMastery >= 50
                                    ? 'var(--attention)'
                                    : 'var(--critical)',
                              }}
                            >
                              Avg: {topic.avgMastery}%
                              {topic.isClassWeak && ' ⚠️'}
                            </div>
                          </th>
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
                          {row.cells
                            .filter((cell) => filteredTopicIds.has(cell.topicId))
                            .map((cell) => (
                              <td
                                key={cell.topicId}
                                className={`hm-cell ${getCellClass(cell.status)}`}
                                title={`${row.name}: ${cell.status} (${cell.mastery ?? 'No Data'}%)`}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                  <span>{cell.mastery !== null ? `${cell.mastery}%` : '—'}</span>
                                  {cell.isRootGap && (
                                    <span
                                      style={{
                                        fontSize: 9,
                                        background: '#DC2626',
                                        color: '#FFF',
                                        padding: '1px 3px',
                                        borderRadius: 3,
                                      }}
                                      title="Root Gap"
                                    >
                                      ROOT
                                    </span>
                                  )}
                                </div>
                              </td>
                            ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
