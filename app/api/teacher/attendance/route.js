import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getSupabase } from '@/lib/db';
import { getAttendanceRisk } from '@/lib/gapEngine';

// GET: Fetch all subjects, students, and attendance records for Attendance Management
export async function GET(request) {
  const { errorResponse } = await requireRole('teacher');
  if (errorResponse) return errorResponse;

  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const selectedSubjectId = searchParams.get('subjectId') ? Number(searchParams.get('subjectId')) : null;

    const [
      { data: subjects, error: subErr },
      { data: students, error: stuErr },
      { data: attendanceRows, error: attErr },
    ] = await Promise.all([
      supabase.from('subjects').select('id, name, code').order('id'),
      supabase.from('users').select('id, name, email').eq('role', 'student').order('name'),
      supabase.from('attendance').select('*'),
    ]);

    if (subErr) throw subErr;
    if (stuErr) throw stuErr;
    if (attErr) throw attErr;

    const subjectsMap = new Map(subjects.map((s) => [s.id, s]));

    // Build structured attendance records
    const attendanceMap = new Map();
    for (const a of attendanceRows) {
      attendanceMap.set(`${a.student_id}_${a.subject_id}`, a);
    }

    const list = [];
    let totalPctSum = 0;
    let totalPctCount = 0;
    const atRiskStudentIds = new Set();

    for (const student of students) {
      const studentSubjects = subjects.map((sub) => {
        const record = attendanceMap.get(`${student.id}_${sub.id}`);
        const total = record ? Number(record.total_classes) : 40;
        const attended = record ? Number(record.attended) : 0;
        const risk = getAttendanceRisk({ total_classes: total, attended });

        if (risk.percentage !== null) {
          totalPctSum += risk.percentage;
          totalPctCount++;
        }
        if (risk.isAtRisk) {
          atRiskStudentIds.add(student.id);
        }

        return {
          id: record?.id || null,
          student_id: student.id,
          student_name: student.name,
          student_email: student.email,
          subject_id: sub.id,
          subject_name: sub.name,
          subject_code: sub.code,
          total_classes: total,
          attended,
          percentage: risk.percentage,
          isAtRisk: risk.isAtRisk,
          label: risk.label,
        };
      });

      if (selectedSubjectId) {
        const filtered = studentSubjects.filter((s) => s.subject_id === selectedSubjectId);
        list.push(...filtered);
      } else {
        list.push(...studentSubjects);
      }
    }

    const avgAttendance = totalPctCount > 0 ? Math.round(totalPctSum / totalPctCount) : 0;

    return NextResponse.json({
      subjects,
      selectedSubjectId,
      students,
      attendance: list,
      stats: {
        totalStudents: students.length,
        atRiskStudentsCount: atRiskStudentIds.size,
        avgAttendance,
      },
    });
  } catch (err) {
    console.error('Fetch attendance error:', err);
    return NextResponse.json({ error: 'Failed to fetch attendance.' }, { status: 500 });
  }
}

// POST: Upsert single attendance record
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
    return NextResponse.json({ success: true, attendance: data });
  } catch (err) {
    console.error('Update attendance error:', err);
    return NextResponse.json({ error: 'Failed to update attendance.' }, { status: 500 });
  }
}
