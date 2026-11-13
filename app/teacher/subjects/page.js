'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';

// Subjects and Topics management: add/edit topics, set prerequisite topic, confirm before delete
export default function TeacherSubjectsPage() {
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // New subject form
  const [subName, setSubName] = useState('');
  const [subCode, setSubCode] = useState('');

  // Add / Edit topic form
  const [editingTopicId, setEditingTopicId] = useState(null);
  const [topicName, setTopicName] = useState('');
  const [orderNo, setOrderNo] = useState('1');
  const [prereqId, setPrereqId] = useState('');

  async function loadData() {
    const res = await fetch('/api/teacher/subjects');
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to load subjects.');
    setSubjects(json.subjects || []);
    setTopics(json.topics || []);
    if (!selectedSubjectId && json.subjects?.length > 0) {
      setSelectedSubjectId(String(json.subjects[0].id));
    }
  }

  useEffect(() => {
    loadData()
      .catch((err) => setMessage({ type: 'error', text: err.message }))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subjectTopics = topics.filter(
    (t) => String(t.subject_id) === String(selectedSubjectId)
  );
  const topicNameMap = new Map(subjectTopics.map((t) => [t.id, t.name]));

  async function handleAddSubject(e) {
    e.preventDefault();
    setMessage(null);
    const res = await fetch('/api/teacher/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: subName, code: subCode }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage({ type: 'error', text: json.error });
      return;
    }
    setSubName('');
    setSubCode('');
    setMessage({ type: 'success', text: `Subject "${json.subject.name}" added.` });
    await loadData();
    setSelectedSubjectId(String(json.subject.id));
  }

  async function handleDeleteSubject(subject) {
    if (!window.confirm(`Delete subject "${subject.name}" and all its topics?`)) {
      return;
    }
    setMessage(null);
    const res = await fetch(`/api/teacher/subjects?id=${subject.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const json = await res.json();
      setMessage({ type: 'error', text: json.error });
      return;
    }
    setMessage({ type: 'success', text: `Deleted "${subject.name}".` });
    setSelectedSubjectId('');
    await loadData();
  }

  function startEditTopic(topic) {
    setEditingTopicId(topic.id);
    setTopicName(topic.name);
    setOrderNo(String(topic.order_no));
    setPrereqId(topic.prerequisite_topic_id ? String(topic.prerequisite_topic_id) : '');
  }

  function resetTopicForm() {
    setEditingTopicId(null);
    setTopicName('');
    setOrderNo(String(subjectTopics.length + 1));
    setPrereqId('');
  }

  async function handleTopicSubmit(e) {
    e.preventDefault();
    setMessage(null);

    const method = editingTopicId ? 'PUT' : 'POST';
    const payload = editingTopicId
      ? {
          id: editingTopicId,
          name: topicName,
          order_no: Number(orderNo),
          prerequisite_topic_id: prereqId || null,
        }
      : {
          subject_id: Number(selectedSubjectId),
          name: topicName,
          order_no: Number(orderNo),
          prerequisite_topic_id: prereqId || null,
        };

    const res = await fetch('/api/teacher/topics', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage({ type: 'error', text: json.error });
      return;
    }

    setMessage({
      type: 'success',
      text: editingTopicId ? 'Topic updated.' : 'Topic added.',
    });
    resetTopicForm();
    await loadData();
  }

  async function handleDeleteTopic(topic) {
    if (!window.confirm(`Delete topic "${topic.name}"?`)) {
      return;
    }
    setMessage(null);
    const res = await fetch(`/api/teacher/topics?id=${topic.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const json = await res.json();
      setMessage({ type: 'error', text: json.error });
      return;
    }
    setMessage({ type: 'success', text: `Deleted topic "${topic.name}".` });
    if (editingTopicId === topic.id) resetTopicForm();
    await loadData();
  }

  return (
    <AppShell title="Subjects & Topics" requiredRole="teacher">
      {message && (
        <div className={`alert ${message.type === 'error' ? 'alert-error' : 'alert-success'}`}>
          <i
            className={`fa-solid ${
              message.type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'
            }`}
            aria-hidden="true"
          />
          <span>{message.text}</span>
        </div>
      )}

      {loading ? (
        <div className="card">Loading subjects...</div>
      ) : (
        <div className="two-col" style={{ gridTemplateColumns: '1fr 1.6fr' }}>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Subjects</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {subjects.map((sub) => (
                <div
                  key={sub.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border:
                      String(sub.id) === String(selectedSubjectId)
                        ? '1px solid var(--primary)'
                        : '1px solid var(--border)',
                    background:
                      String(sub.id) === String(selectedSubjectId) ? '#E6F4F3' : 'var(--surface)',
                  }}
                >
                  <button
                    type="button"
                    style={{
                      background: 'none',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      flex: 1,
                      fontWeight: 600,
                      color: 'var(--text)',
                    }}
                    onClick={() => {
                      setSelectedSubjectId(String(sub.id));
                      resetTopicForm();
                    }}
                  >
                    {sub.name} <span className="muted">({sub.code})</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDeleteSubject(sub)}
                    aria-label={`Delete ${sub.name}`}
                  >
                    <i className="fa-solid fa-trash" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddSubject} style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Add Subject</div>
              <div className="form-group">
                <label className="form-label" htmlFor="sub-name">Subject Name</label>
                <input
                  id="sub-name"
                  type="text"
                  className="input"
                  placeholder="e.g. Operating Systems"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="sub-code">Code</label>
                <input
                  id="sub-code"
                  type="text"
                  className="input"
                  placeholder="e.g. CS301"
                  value={subCode}
                  onChange={(e) => setSubCode(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary btn-sm">
                Add Subject
              </button>
            </form>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                Topics {subjects.find((s) => String(s.id) === String(selectedSubjectId))?.name || ''}
              </h2>
            </div>

            {selectedSubjectId ? (
              <>
                <form
                  onSubmit={handleTopicSubmit}
                  style={{
                    padding: 16,
                    background: 'var(--bg)',
                    borderRadius: 8,
                    marginBottom: 20,
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>
                    {editingTopicId ? 'Edit Topic' : 'Add Topic'}
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label" htmlFor="topic-name">Topic Name</label>
                      <input
                        id="topic-name"
                        type="text"
                        className="input"
                        placeholder="e.g. Binary Trees"
                        value={topicName}
                        onChange={(e) => setTopicName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="order-no">Order No.</label>
                      <input
                        id="order-no"
                        type="number"
                        min="1"
                        className="input"
                        value={orderNo}
                        onChange={(e) => setOrderNo(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="prereq">Prerequisite Topic (optional)</label>
                    <select
                      id="prereq"
                      className="select"
                      value={prereqId}
                      onChange={(e) => setPrereqId(e.target.value)}
                    >
                      <option value="">None</option>
                      {subjectTopics
                        .filter((t) => t.id !== editingTopicId)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit" className="btn btn-primary btn-sm">
                      {editingTopicId ? 'Update Topic' : 'Add Topic'}
                    </button>
                    {editingTopicId && (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={resetTopicForm}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>

                {subjectTopics.length === 0 ? (
                  <div className="empty-state">
                    <i className="fa-solid fa-book-open" aria-hidden="true" />
                    <p>No topics in this subject yet. Use the form above to add one.</p>
                  </div>
                ) : (
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Topic</th>
                          <th>Prerequisite</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subjectTopics.map((topic) => (
                          <tr key={topic.id}>
                            <td>{topic.order_no}</td>
                            <td style={{ fontWeight: 600 }}>{topic.name}</td>
                            <td className="muted">
                              {topic.prerequisite_topic_id
                                ? topicNameMap.get(topic.prerequisite_topic_id) || '—'
                                : 'None'}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                  type="button"
                                  className="btn btn-outline btn-sm"
                                  onClick={() => startEditTopic(topic)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-danger btn-sm"
                                  onClick={() => handleDeleteTopic(topic)}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state">
                <i className="fa-solid fa-book" aria-hidden="true" />
                <p>Select or create a subject on the left to manage its topics.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}

