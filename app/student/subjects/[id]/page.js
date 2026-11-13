'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import SubjectTopicsView from '@/components/SubjectTopicsView';

// Student Subject Detail page showing topic mastery, status, trend, and prerequisite tags
export default function StudentSubjectDetailPage() {
  const params = useParams();
  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/student/subjects/${params.id}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load subject.');
        return json;
      })
      .then((json) => setSubject(json.subject))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  return (
    <AppShell title="Subject Detail" requiredRole="student">
      <div style={{ marginBottom: 16 }}>
        <Link href="/student" className="btn btn-outline btn-sm">
          <i className="fa-solid fa-arrow-left" aria-hidden="true" />
          Back to Dashboard
        </Link>
      </div>

      {loading && <div className="card">Loading topic details...</div>}

      {error && (
        <div className="alert alert-error">
          <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {subject && <SubjectTopicsView subject={subject} />}
    </AppShell>
  );
}

