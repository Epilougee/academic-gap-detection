'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';

// Teacher Add Scores & Attendance Update page with synchronized student and subject selection
export default function TeacherScoresPage() {
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  // Synchronized student and subject selection for both panels
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  // Score form specific state
  const [scoreTopicId, setScoreTopicId] = useState('');
  const [testName, setTestName] = useState('');
  const [marks, setMarks] = useState('');
  const [maxMarks, setMaxMarks] = useState('50');
  const [testDate, setTestDate] = useState(new Date().toISOString().slice(0, 10));
  const [scoreMsg, setScoreMsg] = useState(null);
  const [savingScore, setSavingScore] = useState(false);

  // Attendance form specific state
  const [totalClasses, setTotalClasses] = useState('40');
  const [attended, setAttended] = useState('');
  const [attMsg, setAttMsg] = useState(null);
  const [savingAtt, setSavingAtt] = useState(false);

  useEffect(() => {
    fetch('/api/teacher/scores')
      .then((res) => res.json())
      .then((data) => {
        setStudents(data.students || []);
        setSubjects(data.subjects || []);
        setTopics(data.topics || []);

        if (data.students?.length > 0) {
          setSelectedStudentId(String(data.students[0].id));
        }
        if (data.subjects?.length > 0) {
          const firstSub = String(data.subjects[0].id);
          setSelectedSubjectId(firstSub);
          const firstTopic = (data.topics || []).find(
            (t) => String(t.subject_id) === firstSub
          );
          if (firstTopic) setScoreTopicId(String(firstTopic.id));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredTopics = topics.filter(
    (t) => String(t.subject_id) === String(selectedSubjectId)
  );

  function handleStudentChange(newStudentId) {
    // Synchronize selected student across both panels
    setSelectedStudentId(newStudentId);
  }

  function handleSubjectChange(newSubjectId) {
    // Synchronize selected subject across both panels
    setSelectedSubjectId(newSubjectId);
    const firstTopic = topics.find(
      (t) => String(t.subject_id) === String(newSubjectId)
    );
    setScoreTopicId(firstTopic ? String(firstTopic.id) : '');
  }

  async function handleScoreSubmit(e) {
    e.preventDefault();
    setScoreMsg(null);
    setSavingScore(true);

    try {
      const res = await fetch('/api/teacher/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selectedStudentId,
          topic_id: scoreTopicId,
          test_name: testName,
          marks,
          max_marks: maxMarks,
          test_date: testDate,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save score.');
      setScoreMsg({ type: 'success', text: 'Score saved successfully.' });
      setTestName('');
      setMarks('');
    } catch (err) {
      setScoreMsg({ type: 'error', text: err.message });
    } finally {
      setSavingScore(false);
    }
  }

  async function handleAttendanceSubmit(e) {
    e.preventDefault();
    setAttMsg(null);
    setSavingAtt(true);

    try {
      const res = await fetch('/api/teacher/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selectedStudentId,
          subject_id: selectedSubjectId,
          total_classes: totalClasses,
          attended,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update attendance.');
      setAttMsg({ type: 'success', text: 'Attendance updated.' });
      setAttended('');
    } catch (err) {
      setAttMsg({ type: 'error', text: err.message });
    } finally {
      setSavingAtt(false);
    }
  }

  return (
    <AppShell title="Add Scores & Attendance" requiredRole="teacher">
      {loading ? (
        <div className="card">Loading form options...</div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 20, padding: '16px 20px', background: '#E6F4F3', borderColor: '#B4E1DC' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <i className="fa-solid fa-link" style={{ color: 'var(--primary)', fontSize: 18 }} />
              <div>
                <strong style={{ color: 'var(--primary-dark)', fontSize: 14 }}>Synchronized Selection:</strong>{' '}
                <span style={{ fontSize: 13, color: 'var(--text)' }}>
                  Changing the student or subject in either form automatically updates both panels.
                </span>
              </div>
            </div>
          </div>

          <div className="two-col" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Add Scores</h2>
              </div>

              {scoreMsg && (
                <div className={`alert ${scoreMsg.type === 'error' ? 'alert-error' : 'alert-success'}`}>
                  <i
                    className={`fa-solid ${
                      scoreMsg.type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'
                    }`}
                    aria-hidden="true"
                  />
                  <span>{scoreMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleScoreSubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="score-student">Student</label>
                  <select
                    id="score-student"
                    className="select"
                    value={selectedStudentId}
                    onChange={(e) => handleStudentChange(e.target.value)}
                    required
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="score-subject">Subject</label>
                  <select
                    id="score-subject"
                    className="select"
                    value={selectedSubjectId}
                    onChange={(e) => handleSubjectChange(e.target.value)}
                    required
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="score-topic">Topic</label>
                  <select
                    id="score-topic"
                    className="select"
                    value={scoreTopicId}
                    onChange={(e) => setScoreTopicId(e.target.value)}
                    required
                  >
                    {filteredTopics.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor="test-name">Test Name</label>
                    <input
                      id="test-name"
                      type="text"
                      className="input"
                      placeholder="e.g. Quiz 4"
                      value={testName}
                      onChange={(e) => setTestName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="test-date">Test Date</label>
                    <input
                      id="test-date"
                      type="date"
                      className="input"
                      value={testDate}
                      onChange={(e) => setTestDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor="marks">Marks</label>
                    <input
                      id="marks"
                      type="number"
                      step="0.5"
                      min="0"
                      className="input"
                      placeholder="e.g. 38"
                      value={marks}
                      onChange={(e) => setMarks(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="max-marks">Max Marks</label>
                    <input
                      id="max-marks"
                      type="number"
                      step="1"
                      min="1"
                      className="input"
                      value={maxMarks}
                      onChange={(e) => setMaxMarks(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" disabled={savingScore || !scoreTopicId}>
                  {savingScore ? 'Saving...' : 'Save Score'}
                </button>
              </form>
            </div>

            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Update Attendance</h2>
              </div>

              {attMsg && (
                <div className={`alert ${attMsg.type === 'error' ? 'alert-error' : 'alert-success'}`}>
                  <i
                    className={`fa-solid ${
                      attMsg.type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'
                    }`}
                    aria-hidden="true"
                  />
                  <span>{attMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleAttendanceSubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="att-student">Student</label>
                  <select
                    id="att-student"
                    className="select"
                    value={selectedStudentId}
                    onChange={(e) => handleStudentChange(e.target.value)}
                    required
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="att-subject">Subject</label>
                  <select
                    id="att-subject"
                    className="select"
                    value={selectedSubjectId}
                    onChange={(e) => handleSubjectChange(e.target.value)}
                    required
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor="total-classes">Total Classes</label>
                    <input
                      id="total-classes"
                      type="number"
                      min="1"
                      className="input"
                      value={totalClasses}
                      onChange={(e) => setTotalClasses(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="attended">Attended</label>
                    <input
                      id="attended"
                      type="number"
                      min="0"
                      className="input"
                      placeholder="e.g. 28"
                      value={attended}
                      onChange={(e) => setAttended(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" disabled={savingAtt}>
                  {savingAtt ? 'Updating...' : 'Update Attendance'}
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
