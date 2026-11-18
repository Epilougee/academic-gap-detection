import { NextResponse } from 'next/server';
import { requireRole, hashPassword } from '@/lib/auth';
import { getSupabase } from '@/lib/db';

// GET: Fetch all faculty and student users along with summary statistics
export async function GET() {
  const { errorResponse } = await requireRole('admin');
  if (errorResponse) return errorResponse;

  try {
    const supabase = getSupabase();
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, role, created_at')
      .order('id', { ascending: false });

    if (error) throw error;

    const totalUsers = users.length;
    const totalTeachers = users.filter((u) => u.role === 'teacher').length;
    const totalStudents = users.filter((u) => u.role === 'student').length;

    return NextResponse.json({
      users,
      stats: {
        totalUsers,
        totalTeachers,
        totalStudents,
      },
    });
  } catch (err) {
    console.error('Admin GET users error:', err);
    return NextResponse.json({ error: 'Failed to fetch users.' }, { status: 500 });
  }
}

// POST: Add new faculty (teacher) or student user with email and password
export async function POST(request) {
  const { errorResponse } = await requireRole('admin');
  if (errorResponse) return errorResponse;

  try {
    const { name, email, password, role } = await request.json();

    if (!name?.trim() || !email?.trim() || !password || !role) {
      return NextResponse.json(
        { error: 'Name, email, password, and role are all required.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const validRoles = ['teacher', 'student'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Role must be either "teacher" or "student".' },
        { status: 400 }
      );
    }

    if (password.length < 4) {
      return NextResponse.json(
        { error: 'Password must be at least 4 characters long.' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', cleanEmail)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: `A user with email "${cleanEmail}" already exists.` },
        { status: 400 }
      );
    }

    // Hash password with bcryptjs
    const password_hash = await hashPassword(password);

    // Insert user
    const { data: newUser, error: insertErr } = await supabase
      .from('users')
      .insert({
        name: name.trim(),
        email: cleanEmail,
        password_hash,
        role,
      })
      .select('id, name, email, role, created_at')
      .single();

    if (insertErr) throw insertErr;

    // If new user is a student, initialize default attendance rows for all existing subjects
    if (role === 'student') {
      const { data: subjects } = await supabase.from('subjects').select('id');
      if (subjects && subjects.length > 0) {
        const attendanceRows = subjects.map((sub) => ({
          student_id: newUser.id,
          subject_id: sub.id,
          total_classes: 40,
          attended: 35, // default healthy 87.5% attendance
        }));
        await supabase.from('attendance').insert(attendanceRows);
      }
    }

    return NextResponse.json({
      success: true,
      user: newUser,
      message: `${role === 'teacher' ? 'Faculty member' : 'Student'} "${newUser.name}" added successfully.`,
    });
  } catch (err) {
    console.error('Admin POST user error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create user.' },
      { status: 500 }
    );
  }
}

// DELETE: Remove a user by ID
export async function DELETE(request) {
  const { errorResponse } = await requireRole('admin');
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));

    if (!id) {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true, message: 'User deleted successfully.' });
  } catch (err) {
    console.error('Admin DELETE user error:', err);
    return NextResponse.json({ error: 'Failed to delete user.' }, { status: 500 });
  }
}
