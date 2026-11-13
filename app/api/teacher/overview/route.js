import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getClassReports } from '@/lib/db';

// Return class overview list of students with readiness %, critical gaps, and attendance risk
export async function GET() {
  const { errorResponse } = await requireRole('teacher');
  if (errorResponse) return errorResponse;

  try {
    const { subjects, studentReports } = await getClassReports();
    const students = studentReports.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      overallReadiness: s.overallReadiness,
      criticalGapsCount: s.criticalGapsCount,
      subjectsAtRiskCount: s.subjectsAtRiskCount,
      attendanceRisk: s.attendanceRisk,
    }));

    // Calculate class-level summary statistics
    const totalStudents = students.length;
    const avgReadiness =
      totalStudents > 0
        ? Math.round(students.reduce((sum, s) => sum + s.overallReadiness, 0) / totalStudents)
        : 0;
    const totalCriticalGaps = students.reduce((sum, s) => sum + s.criticalGapsCount, 0);
    const atRiskStudentsCount = students.filter((s) => s.attendanceRisk).length;

    // Readiness distribution for class chart
    let highCount = 0;   // >= 70%
    let midCount = 0;    // 50-69%
    let lowCount = 0;    // < 50%
    for (const s of students) {
      if (s.overallReadiness >= 70) highCount++;
      else if (s.overallReadiness >= 50) midCount++;
      else lowCount++;
    }

    return NextResponse.json({
      students,
      stats: {
        totalStudents,
        avgReadiness,
        totalCriticalGaps,
        atRiskStudentsCount,
        distribution: {
          high: highCount,
          mid: midCount,
          low: lowCount,
        },
      },
    });
  } catch (err) {
    console.error('Teacher overview error:', err);
    return NextResponse.json({ error: 'Failed to load class overview.' }, { status: 500 });
  }
}
