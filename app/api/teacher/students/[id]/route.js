import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getSupabase, getStudentReport } from '@/lib/db';

// Return a single student's full gap analysis across all subjects for the teacher's detail view
export async function GET(request, { params }) {
  const { errorResponse } = await requireRole('teacher');
  if (errorResponse) return errorResponse;

  try {
    const studentId = Number(params.id);
    const supabase = getSupabase();
    const { data: student, error } = await supabase
      .from('users')
      .select('id, name, email, role')
      .eq('id', studentId)
      .eq('role', 'student')
      .single();

    if (error || !student) {
      return NextResponse.json({ error: 'Student not found.' }, { status: 404 });
    }

    const report = await getStudentReport(studentId);
    return NextResponse.json({ student, report });
  } catch (err) {
    console.error('Teacher student detail error:', err);
    return NextResponse.json({ error: 'Failed to load student details.' }, { status: 500 });
  }
}

