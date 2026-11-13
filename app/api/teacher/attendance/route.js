import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getSupabase } from '@/lib/db';

// Upsert attendance (total_classes and attended) for a student in a subject
export async function POST(request) {
  const { errorResponse } = await requireRole('teacher');
  if (errorResponse) return errorResponse;

  try {
    const { student_id, subject_id, total_classes, attended } = await request.json();

    if (!student_id || !subject_id || total_classes === undefined || attended === undefined) {
      return NextResponse.json({ error: 'All attendance fields are required.' }, { status: 400 });
    }

    const total = Number(total_classes);
    const att = Number(attended);
    if (Number.isNaN(total) || Number.isNaN(att) || total < 0 || att < 0 || att > total) {
      return NextResponse.json(
        { error: 'Attended classes must be between 0 and total classes.' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('attendance')
      .upsert(
        {
          student_id: Number(student_id),
          subject_id: Number(subject_id),
          total_classes: total,
          attended: att,
        },
        { onConflict: 'student_id,subject_id' }
      )
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ attendance: data });
  } catch (err) {
    console.error('Update attendance error:', err);
    return NextResponse.json({ error: 'Failed to update attendance.' }, { status: 500 });
  }
}

