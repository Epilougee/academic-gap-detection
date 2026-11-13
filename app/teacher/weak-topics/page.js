'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';

// Class-wide weak topics: topics where more than 40% of students are in Critical Gap
export default function TeacherWeakTopicsPage() {
  const [weakTopics, setWeakTopics] = useState([]);
  const [threshold, setThreshold] = useState(40);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/teacher/weak-topics')
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load weak topics.');
        return json;
      })
      .then((json) => {
        setWeakTopics(json.weakTopics || []);
        if (json.threshold) setThreshold(json.threshold);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell title="Class-Wide Weak Topics" requiredRole="teacher">
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              Topics with &gt;{threshold}% Students in Critical Gap
            </h2>
            <p className="muted">
              These topics may need a class-wide revision session before moving forward.
            </p>
          </div>
        </div>

        {loading && <p className="muted">Analyzing class-wide performance...</p>}

        {error && (
          <div className="alert alert-error">
            <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && weakTopics.length === 0 && (
          <div className="empty-state">
            <i className="fa-solid fa-circle-check" aria-hidden="true" />
            <p>No topic currently has more than {threshold}% of students in Critical Gap.</p>
            <Link href="/teacher/heatmap" className="btn btn-outline">
              View Full Heatmap
            </Link>
          </div>
        )}

        {!loading && weakTopics.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Topic</th>
                  <th>Subject</th>
                  <th>Students in Critical Gap</th>
                  <th>Class Average</th>
                </tr>
              </thead>
              <tbody>
                {weakTopics.map((topic) => (
                  <tr key={topic.id}>
                    <td style={{ fontWeight: 600 }}>{topic.name}</td>
                    <td className="muted">
                      {topic.subjectName} ({topic.subjectCode})
                    </td>
                    <td>
                      <span className="badge badge-critical">
                        <i className="fa-solid fa-circle-xmark" aria-hidden="true" />
                        {topic.criticalPct}% ({topic.criticalCount}/{topic.totalStudents})
                      </span>
                    </td>
                    <td>
                      <strong>{topic.classAvgMastery}%</strong>
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

