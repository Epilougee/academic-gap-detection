import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getStudentReport } from '@/lib/db';

// Return the prioritized study plan for the logged-in student
export async function GET() {
  const { user, errorResponse } = await requireRole('student');
  if (errorResponse) return errorResponse;

  try {
    const report = await getStudentReport(user.id);
    return NextResponse.json({ studyPlan: report.studyPlan });
  } catch (err) {
    console.error('Student study plan error:', err);
    return NextResponse.json({ error: 'Failed to load study plan.' }, { status: 500 });
  }
}

