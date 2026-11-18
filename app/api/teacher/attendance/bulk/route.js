import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getSupabase } from '@/lib/db';

// POST: Bulk import / update attendance records from Excel or CSV
export async function POST(request) {
  const { errorResponse } = await requireRole('teacher');
  if (errorResponse) return errorResponse;

  try {
    const { records } = await request.json();

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { error: 'No attendance records provided in the request.' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Fetch existing students and subjects to match against
    const [{ data: students }, { data: subjects }] = await Promise.all([
      supabase.from('users').select('id, name, email').eq('role', 'student'),
      supabase.from('subjects').select('id, name, code'),
    ]);

    const studentMap = new Map();
    for (const s of students || []) {
      studentMap.set(s.email.toLowerCase().trim(), s);
    }

    const subjectMap = new Map();
    for (const sub of subjects || []) {
      subjectMap.set(sub.code.toLowerCase().trim(), sub);
      subjectMap.set(sub.name.toLowerCase().trim(), sub);
    }

    const validRows = [];
    const errors = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 1;

      // Extract email, subject code, total, attended
      const email = String(row.email || row.student_email || row.student || '').toLowerCase().trim();
      const subjectKey = String(row.subject_code || row.subject || row.code || '').toLowerCase().trim();
      const total = Number(row.total_classes !== undefined ? row.total_classes : row.total);
      const attended = Number(row.attended !== undefined ? row.attended : row.attended_classes);

      if (!email) {
        errors.push(`Row ${rowNum}: Missing student email.`);
        continue;
      }

      const student = studentMap.get(email);
      if (!student) {
        errors.push(`Row ${rowNum}: Student with email "${email}" not found.`);
        continue;
      }

      if (!subjectKey) {
        errors.push(`Row ${rowNum}: Missing subject code or name.`);
        continue;
      }

      const subject = subjectMap.get(subjectKey);
      if (!subject) {
        errors.push(`Row ${rowNum}: Subject "${subjectKey}" not recognized.`);
        continue;
      }

      if (Number.isNaN(total) || total < 0) {
        errors.push(`Row ${rowNum}: Invalid total classes (${total}). Must be >= 0.`);
        continue;
      }

      if (Number.isNaN(attended) || attended < 0 || attended > total) {
        errors.push(`Row ${rowNum}: Attended classes (${attended}) must be between 0 and total (${total}).`);
        continue;
      }

      validRows.push({
        student_id: student.id,
        subject_id: subject.id,
        total_classes: total,
        attended: attended,
      });
    }

    if (validRows.length === 0) {
      return NextResponse.json(
        {
          error: 'No valid attendance records could be processed.',
          details: errors,
        },
        { status: 400 }
      );
    }

    // Upsert valid attendance rows in batches of 200
    for (let i = 0; i < validRows.length; i += 200) {
      const batch = validRows.slice(i, i + 200);
      const { error: upsertErr } = await supabase
        .from('attendance')
        .upsert(batch, { onConflict: 'student_id,subject_id' });

      if (upsertErr) throw upsertErr;
    }

    return NextResponse.json({
      success: true,
      updatedCount: validRows.length,
      errorCount: errors.length,
      errors: errors.slice(0, 10), // return top 10 errors if any
      message: `Successfully imported attendance for ${validRows.length} student-subject records!`,
    });
  } catch (err) {
    console.error('Bulk attendance error:', err);
    return NextResponse.json({ error: 'Failed to import attendance.' }, { status: 500 });
  }
}
