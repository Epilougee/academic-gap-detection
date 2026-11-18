'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import AppShell from '@/components/AppShell';

export default function TeacherAttendancePage() {
  const [data, setData] = useState(null);
  const [subjectId, setSubjectId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Excel Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [parsedRows, setParsedRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const fileInputRef = useRef(null);

  // Single Record Edit Modal State
  const [editingRecord, setEditingRecord] = useState(null);
  const [editTotal, setEditTotal] = useState(40);
  const [editAttended, setEditAttended] = useState(35);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    fetchAttendance();
  }, [subjectId]);

  async function fetchAttendance() {
    setLoading(true);
    const query = subjectId ? `?subjectId=${subjectId}` : '';
    try {
      const res = await fetch(`/api/teacher/attendance${query}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load attendance.');
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Handle Excel or CSV file drop/select
  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportError('');
    setImportSuccess('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!json || json.length === 0) {
          setImportError('The uploaded file contains no data rows.');
          return;
        }

        // Standardize column names
        const normalized = json.map((row, idx) => {
          const keys = Object.keys(row);
          const findVal = (patterns) => {
            for (const key of keys) {
              const clean = key.toLowerCase().replace(/[^a-z0-9]/g, '');
              for (const p of patterns) {
                if (clean.includes(p)) return row[key];
              }
            }
            return '';
          };

          const email = findVal(['email', 'studentemail', 'student']) || '';
          const subject = findVal(['subjectcode', 'subject', 'code']) || '';
          const total = Number(findVal(['totalclasses', 'total', 'classes']) || 40);
          const attended = Number(findVal(['attendedclasses', 'attended', 'present']) || 0);

          let rowError = '';
          if (!email) rowError = 'Missing email';
          else if (!subject) rowError = 'Missing subject code';
          else if (Number.isNaN(total) || total < 0) rowError = 'Invalid total';
          else if (Number.isNaN(attended) || attended < 0 || attended > total) rowError = 'Attended > total';

          const pct = total > 0 ? Math.round((attended / total) * 100) : 0;

          return {
            rowNum: idx + 1,
            email: String(email).trim().toLowerCase(),
            subject_code: String(subject).trim().toUpperCase(),
            total_classes: total,
            attended: attended,
            percentage: pct,
            isAtRisk: pct < 75,
            error: rowError,
          };
        });

        setParsedRows(normalized);
      } catch (err) {
        console.error('Excel parse error:', err);
        setImportError('Failed to parse Excel file. Please ensure it is a valid .xlsx, .xls, or .csv file.');
      }
    };
    reader.readAsBinaryString(file);
  }

  // Submit bulk attendance to API
  async function handleBulkSubmit() {
    const validRecords = parsedRows.filter((r) => !r.error);
    if (validRecords.length === 0) {
      setImportError('No valid rows available to import.');
      return;
    }

    setImporting(true);
    setImportError('');
    setImportSuccess('');

    try {
      const res = await fetch('/api/teacher/attendance/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: validRecords }),
      });

      const resData = await res.json();
      if (!res.ok) {
        setImportError(resData.error || 'Failed to import attendance.');
        setImporting(false);
        return;
      }

      setImportSuccess(
        `Successfully imported attendance for ${resData.updatedCount} records!`
      );
      setParsedRows([]);
      setFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchAttendance();
    } catch {
      setImportError('Network error while importing attendance.');
    } finally {
      setImporting(false);
    }
  }

  // Generate & download Excel Template with live students & subjects
  function handleDownloadTemplate() {
    if (!data?.students || !data?.subjects) return;

    const rows = [];
    data.students.forEach((student) => {
      data.subjects.forEach((sub) => {
        rows.push({
          student_email: student.email,
          student_name: student.name,
          subject_code: sub.code,
          subject_name: sub.name,
          total_classes: 40,
          attended_classes: 35,
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
    XLSX.writeFile(workbook, 'attendance_import_template.xlsx');
  }

  // Save single edit
  async function handleSaveSingleEdit(e) {
    e.preventDefault();
    if (!editingRecord) return;

    setSavingEdit(true);
    try {
      const res = await fetch('/api/teacher/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: editingRecord.student_id,
          subject_id: editingRecord.subject_id,
          total_classes: Number(editTotal),
          attended: Number(editAttended),
        }),
      });

      if (res.ok) {
        setEditingRecord(null);
        await fetchAttendance();
      } else {
        const json = await res.json();
        alert(json.error || 'Failed to update attendance.');
      }
    } catch {
      alert('Network error updating attendance.');
    } finally {
      setSavingEdit(false);
    }
  }

  const filteredAttendance = (data?.attendance || []).filter((item) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      item.student_name.toLowerCase().includes(q) ||
      item.student_email.toLowerCase().includes(q) ||
      item.subject_code.toLowerCase().includes(q) ||
      item.subject_name.toLowerCase().includes(q)
    );
  });

  return (
    <AppShell title="Attendance Management" requiredRole="teacher">
      {/* Top Stats Overview */}
      {data?.stats && (
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-label">Enrolled Students</div>
            <div className="stat-value">{data.stats.totalStudents}</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              Active student roster
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Class Avg Attendance</div>
            <div
              className="stat-value"
              style={{
                color: data.stats.avgAttendance >= 75 ? 'var(--strong)' : 'var(--critical)',
              }}
            >
              {data.stats.avgAttendance}%
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              Across all evaluated sessions
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Students At Risk (&lt;75%)</div>
            <div
              className="stat-value"
              style={{
                color: data.stats.atRiskStudentsCount > 0 ? 'var(--critical)' : 'inherit',
              }}
            >
              {data.stats.atRiskStudentsCount}
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              Falling below university requirement
            </div>
          </div>
        </div>
      )}

      {/* Main Content Card */}
      <div className="card">
        {/* Card Header & Action Buttons */}
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 14 }}>
          <div>
            <h2 className="card-title">
              <i className="fa-solid fa-clipboard-user" style={{ marginRight: 8, color: 'var(--primary)' }} />
              Student Attendance Records
            </h2>
            <p className="muted">
              Monitor individual attendance and bulk update student records via Excel (.xlsx, .csv).
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleDownloadTemplate}
              title="Download pre-filled Excel template"
            >
              <i className="fa-solid fa-file-excel" style={{ marginRight: 6, color: '#16A34A' }} />
              Download Template
            </button>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setShowImportModal(true);
                setImportError('');
                setImportSuccess('');
                setParsedRows([]);
              }}
            >
              <i className="fa-solid fa-file-arrow-up" style={{ marginRight: 6 }} />
              Import Excel
            </button>
          </div>
        </div>

        {/* Toolbar: Subject Filters & Search */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            paddingBottom: 16,
            borderBottom: '1px solid var(--border)',
            marginBottom: 16,
          }}
        >
          {/* Subject Pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`tab-btn ${!subjectId ? 'active' : ''}`}
              onClick={() => setSubjectId('')}
            >
              All Subjects
            </button>
            {data?.subjects?.map((s) => (
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

          {/* Search Box */}
          <input
            type="text"
            className="input"
            placeholder="Search student or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 230 }}
          />
        </div>

        {/* Attendance Records Table */}
        {loading ? (
          <p className="muted" style={{ padding: '30px 0', textAlign: 'center' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }} />
            Loading attendance records...
          </p>
        ) : filteredAttendance.length === 0 ? (
          <div className="empty-state">
            <i className="fa-solid fa-clipboard-check" />
            <p>No attendance records match your filter.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Subject</th>
                  <th>Attended / Total</th>
                  <th>Attendance %</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendance.map((item, idx) => (
                  <tr key={`${item.student_id}_${item.subject_id}_${idx}`}>
                    <td>
                      <Link
                        href={`/teacher/students/${item.student_id}`}
                        style={{ fontWeight: 600, color: 'var(--primary)' }}
                      >
                        {item.student_name}
                      </Link>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {item.student_email}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.subject_name}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {item.subject_code}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>
                        {item.attended}
                      </span>{' '}
                      <span className="muted">/ {item.total_classes}</span>
                    </td>
                    <td style={{ minWidth: 160 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            flex: 1,
                            height: 8,
                            background: '#E2E8F0',
                            borderRadius: 4,
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.min(100, item.percentage || 0)}%`,
                              height: '100%',
                              background:
                                (item.percentage || 0) >= 75
                                  ? 'var(--strong)'
                                  : 'var(--critical)',
                              borderRadius: 4,
                            }}
                          />
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 13, width: 40 }}>
                          {item.percentage !== null ? `${item.percentage}%` : '—'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: item.isAtRisk ? '#FEE2E2' : '#DCFCE7',
                          color: item.isAtRisk ? '#991B1B' : '#166534',
                          border: `1px solid ${item.isAtRisk ? '#FCA5A5' : '#86EFAC'}`,
                          fontWeight: 600,
                          fontSize: 12,
                          padding: '3px 8px',
                          borderRadius: 20,
                        }}
                      >
                        <i
                          className={
                            item.isAtRisk
                              ? 'fa-solid fa-triangle-exclamation'
                              : 'fa-solid fa-circle-check'
                          }
                          style={{ marginRight: 5 }}
                        />
                        {item.label}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => {
                          setEditingRecord(item);
                          setEditTotal(item.total_classes);
                          setEditAttended(item.attended);
                        }}
                      >
                        <i className="fa-solid fa-pen" style={{ marginRight: 4 }} />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= MODAL 1: EXCEL / CSV IMPORT MODAL ================= */}
      {showImportModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(11, 41, 38, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16,
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: 14,
              maxWidth: 780,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              padding: 24,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <div>
                <h3 style={{ fontSize: 18, color: 'var(--primary)', margin: 0 }}>
                  <i className="fa-solid fa-file-excel" style={{ marginRight: 8, color: '#16A34A' }} />
                  Import Attendance from Excel / CSV
                </h3>
                <p className="muted" style={{ margin: '4px 0 0 0' }}>
                  Upload a spreadsheet to update student attendance in bulk.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setShowImportModal(false)}
                style={{ border: 'none', fontSize: 18 }}
              >
                &times;
              </button>
            </div>

            {importSuccess && (
              <div className="alert alert-success">
                <i className="fa-solid fa-circle-check" />
                <span>{importSuccess}</span>
              </div>
            )}

            {importError && (
              <div className="alert alert-error">
                <i className="fa-solid fa-circle-exclamation" />
                <span>{importError}</span>
              </div>
            )}

            {/* Drag & Drop Zone */}
            <div
              style={{
                border: '2px dashed var(--border)',
                borderRadius: 10,
                padding: '28px 20px',
                textAlign: 'center',
                background: '#F8FAFC',
                marginBottom: 18,
                cursor: 'pointer',
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <i
                className="fa-solid fa-cloud-arrow-up"
                style={{ fontSize: 36, color: 'var(--primary)', marginBottom: 10 }}
              />
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                {fileName ? `Selected: ${fileName}` : 'Click or drop an Excel (.xlsx, .xls) or CSV file'}
              </div>
              <div className="muted" style={{ fontSize: 13 }}>
                Expected columns: student_email, subject_code, total_classes, attended_classes
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </div>

            {/* Parsed Preview Table */}
            {parsedRows.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: 13 }}>
                    Parsed {parsedRows.length} rows:
                  </span>
                  <span style={{ fontSize: 12 }}>
                    <strong style={{ color: 'var(--strong)' }}>
                      {parsedRows.filter((r) => !r.error).length} valid
                    </strong>
                    {parsedRows.filter((r) => r.error).length > 0 && (
                      <strong style={{ color: 'var(--critical)', marginLeft: 8 }}>
                        {parsedRows.filter((r) => r.error).length} errors
                      </strong>
                    )}
                  </span>
                </div>

                <div className="table-wrap" style={{ maxHeight: 240, overflowY: 'auto' }}>
                  <table className="table" style={{ fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Student Email</th>
                        <th>Subject Code</th>
                        <th>Attended / Total</th>
                        <th>%</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.map((r) => (
                        <tr key={r.rowNum} style={{ background: r.error ? '#FEE2E2' : 'inherit' }}>
                          <td>{r.rowNum}</td>
                          <td>{r.email}</td>
                          <td>{r.subject_code}</td>
                          <td>
                            {r.attended} / {r.total_classes}
                          </td>
                          <td>{r.percentage}%</td>
                          <td>
                            {r.error ? (
                              <span style={{ color: 'var(--critical)', fontWeight: 600 }}>
                                {r.error}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--strong)', fontWeight: 600 }}>
                                <i className="fa-solid fa-check" style={{ marginRight: 4 }} />
                                Valid
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={handleDownloadTemplate}
              >
                <i className="fa-solid fa-file-excel" style={{ marginRight: 6 }} />
                Get Sample Template
              </button>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowImportModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={importing || parsedRows.filter((r) => !r.error).length === 0}
                  onClick={handleBulkSubmit}
                >
                  {importing ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }} />
                      Saving to Database...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-upload" style={{ marginRight: 6 }} />
                      Confirm &amp; Save Attendance
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: SINGLE EDIT MODAL ================= */}
      {editingRecord && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(11, 41, 38, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16,
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: 14,
              maxWidth: 440,
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              padding: 24,
            }}
          >
            <h3 style={{ fontSize: 17, color: 'var(--primary)', marginBottom: 8 }}>
              Update Student Attendance
            </h3>
            <p className="muted" style={{ marginBottom: 16 }}>
              {editingRecord.student_name} &bull; {editingRecord.subject_name} ({editingRecord.subject_code})
            </p>

            <form onSubmit={handleSaveSingleEdit}>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Total Conducted Classes</label>
                <input
                  type="number"
                  className="input"
                  min="1"
                  value={editTotal}
                  onChange={(e) => setEditTotal(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 18 }}>
                <label className="form-label">Attended Classes</label>
                <input
                  type="number"
                  className="input"
                  min="0"
                  max={editTotal}
                  value={editAttended}
                  onChange={(e) => setEditAttended(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setEditingRecord(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingEdit}
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
