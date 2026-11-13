import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getSupabase } from '@/lib/db';

// Return students, subjects, and topics so the Add Scores form can populate its dropdowns
export async function GET() {
  const { errorResponse } = await requireRole('teacher');
  if (errorResponse) return errorResponse;

  try {
    const supabase = getSupabase();
    const [{ data: students }, { data: subjects }, { data: topics }] = await Promise.all([
      supabase.from('users').select('id, name, email').eq('role', 'student').order('name'),
      supabase.from('subjects').select('*').order('id'),
      supabase.from('topics').select('*').order('order_no'),
    ]);

    return NextResponse.json({
      students: students || [],
      subjects: subjects || [],
      topics: topics || [],
    });
  } catch (err) {
    console.error('Scores form options error:', err);
    return NextResponse.json({ error: 'Failed to load form options.' }, { status: 500 });
  }
}

// Save a new topic score for a student
export async function POST(request) {
  const { errorResponse } = await requireRole('teacher');
  if (errorResponse) return errorResponse;

  try {
    const { student_id, topic_id, test_name, marks, max_marks, test_date } = await request.json();

    if (!student_id || !topic_id || !test_name || marks === undefined || !max_marks) {
      return NextResponse.json({ error: 'All score fields are required.' }, { status: 400 });
    }

    const numMarks = Number(marks);
    const numMax = Number(max_marks);
    if (Number.isNaN(numMarks) || Number.isNaN(numMax) || numMarks < 0 || numMax <= 0 || numMarks > numMax) {
      return NextResponse.json(
        { error: 'Marks must be between 0 and max marks.' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('scores')
      .insert({
        student_id: Number(student_id),
        topic_id: Number(topic_id),
        test_name: test_name.trim(),
        marks: numMarks,
        max_marks: numMax,
        test_date: test_date || new Date().toISOString().slice(0, 10),
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ score: data }, { status: 201 });
  } catch (err) {
    console.error('Add score error:', err);
    return NextResponse.json({ error: 'Failed to save score.' }, { status: 500 });
  }
}

