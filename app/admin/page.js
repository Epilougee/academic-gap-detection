'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalTeachers: 0, totalStudents: 0 });
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('all');
  const [search, setSearch] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('teacher');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Delete state
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
        setStats(data.stats || { totalUsers: 0, totalTeachers: 0, totalStudents: 0 });
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddUser(e) {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to create user account.');
        setSubmitting(false);
        return;
      }

      setFormSuccess(
        `Success! ${role === 'teacher' ? 'Faculty member' : 'Student'} "${name}" (${email}) created. They can now log in at /login with password "${password}".`
      );
      setName('');
      setEmail('');
      setPassword('');
      setRole('teacher');
      await fetchUsers();
    } catch {
      setFormError('Network error. Unable to add user.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteUser(id, userName) {
    if (!window.confirm(`Are you sure you want to delete ${userName}? This will also remove any associated scores and attendance records.`)) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete user.');
      }
    } catch {
      alert('Network error while deleting user.');
    } finally {
      setDeletingId(null);
    }
  }

  const filteredUsers = users.filter((u) => {
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <AppShell title="Admin Panel" requiredRole="admin">
      {/* Overview Stat Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Total Users</div>
          <div className="stat-value">{stats.totalUsers}</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            System accounts in database
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Faculty (Teachers)</div>
          <div className="stat-value" style={{ color: 'var(--primary)' }}>
            {stats.totalTeachers}
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            Teaching &amp; evaluating staff
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Enrolled Students</div>
          <div className="stat-value" style={{ color: '#2563EB' }}>
            {stats.totalStudents}
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            Active student profiles
          </div>
        </div>
      </div>

      {/* Add New User Card */}
      <div className="card" style={{ marginBottom: 28 }}>
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <i className="fa-solid fa-user-plus" style={{ marginRight: 8, color: 'var(--primary)' }} />
              Add Faculty or Student
            </h2>
            <p className="muted">
              Create a new user with their email and password. Once added, they can immediately log in to their dashboard.
            </p>
          </div>
        </div>

        {formSuccess && (
          <div className="alert alert-success">
            <i className="fa-solid fa-circle-check" aria-hidden="true" />
            <span>{formSuccess}</span>
          </div>
        )}

        {formError && (
          <div className="alert alert-error">
            <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleAddUser}>
          <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="user-name">
                Full Name <span style={{ color: 'var(--critical)' }}>*</span>
              </label>
              <input
                id="user-name"
                type="text"
                className="input"
                placeholder="e.g. Dr. Anita Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="user-email">
                Email Address <span style={{ color: 'var(--critical)' }}>*</span>
              </label>
              <input
                id="user-email"
                type="email"
                className="input"
                placeholder="e.g. anita@demo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="user-password">
                Password <span style={{ color: 'var(--critical)' }}>*</span>
              </label>
              <input
                id="user-password"
                type="text"
                className="input"
                placeholder="Enter password (min 4 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="user-role">
                Account Role <span style={{ color: 'var(--critical)' }}>*</span>
              </label>
              <select
                id="user-role"
                className="select"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
              >
                <option value="teacher">Faculty (Teacher)</option>
                <option value="student">Student</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ minWidth: 160 }}
            >
              {submitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }} />
                  Adding User...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-plus" style={{ marginRight: 6 }} />
                  Create Account
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Users Directory Card */}
      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 14 }}>
          <div>
            <h2 className="card-title">
              <i className="fa-solid fa-users" style={{ marginRight: 8, color: 'var(--primary)' }} />
              User Directory
            </h2>
            <p className="muted">Manage all faculty and student accounts.</p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="tabs" style={{ marginBottom: 0 }}>
              <button
                type="button"
                className={`tab-btn ${filterRole === 'all' ? 'active' : ''}`}
                onClick={() => setFilterRole('all')}
              >
                All ({users.length})
              </button>
              <button
                type="button"
                className={`tab-btn ${filterRole === 'teacher' ? 'active' : ''}`}
                onClick={() => setFilterRole('teacher')}
              >
                Faculty ({stats.totalTeachers})
              </button>
              <button
                type="button"
                className={`tab-btn ${filterRole === 'student' ? 'active' : ''}`}
                onClick={() => setFilterRole('student')}
              >
                Students ({stats.totalStudents})
              </button>
            </div>

            <input
              type="text"
              className="input"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 220 }}
            />
          </div>
        </div>

        {loading ? (
          <p className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }} />
            Loading registered users...
          </p>
        ) : filteredUsers.length === 0 ? (
          <div className="empty-state">
            <i className="fa-solid fa-user-slash" />
            <p>No users found matching your search.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>User ID</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{u.name}</div>
                    </td>
                    <td>
                      <span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                        {u.email}
                      </span>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: u.role === 'teacher' ? '#E6F4F3' : '#DBEAFE',
                          color: u.role === 'teacher' ? 'var(--primary)' : '#1E40AF',
                          border: `1px solid ${u.role === 'teacher' ? '#B4E1DC' : '#BFDBFE'}`,
                          fontWeight: 600,
                          fontSize: 12,
                          padding: '3px 10px',
                          borderRadius: 20,
                        }}
                      >
                        <i
                          className={u.role === 'teacher' ? 'fa-solid fa-chalkboard-user' : 'fa-solid fa-user-graduate'}
                          style={{ marginRight: 6 }}
                        />
                        {u.role === 'teacher' ? 'Faculty' : 'Student'}
                      </span>
                    </td>
                    <td>
                      <span className="muted" style={{ fontSize: 13 }}>
                        #{u.id}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ color: 'var(--critical)', borderColor: '#FCA5A5' }}
                        disabled={deletingId === u.id}
                        onClick={() => handleDeleteUser(u.id, u.name)}
                        title="Delete user"
                      >
                        {deletingId === u.id ? (
                          <i className="fa-solid fa-spinner fa-spin" />
                        ) : (
                          <>
                            <i className="fa-solid fa-trash-can" style={{ marginRight: 4 }} />
                            Delete
                          </>
                        )}
                      </button>
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
