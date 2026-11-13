import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getStudentReport } from '@/lib/db';

// Return detailed topic-level gap analysis for a single subject
export async function GET(request, { params }) {
  const { user, errorResponse } = await requireRole('student');
  if (errorResponse) return errorResponse;

  try {
    const subjectId = Number(params.id);
    const report = await getStudentReport(user.id);
    const subject = report.subjects.find((s) => s.id === subjectId);

    if (!subject) {
      return NextResponse.json({ error: 'Subject not found.' }, { status: 404 });
    }

    return NextResponse.json({ subject });
  } catch (err) {
    console.error('Student subject detail error:', err);
    return NextResponse.json({ error: 'Failed to load subject details.' }, { status: 500 });
  }
}

