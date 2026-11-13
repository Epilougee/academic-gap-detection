import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getStudentReport } from '@/lib/db';

// Return dashboard stats, per-subject readiness, gap distribution, and top 5 gaps
export async function GET() {
  const { user, errorResponse } = await requireRole('student');
  if (errorResponse) return errorResponse;

  try {
    const report = await getStudentReport(user.id);

    // Compute distribution counts across all student topics
    let strongCount = 0;
    let attentionCount = 0;
    let criticalCount = 0;

    for (const topic of report.topics) {
      if (topic.status === 'Strong') strongCount++;
      else if (topic.status === 'Needs Attention') attentionCount++;
      else if (topic.status === 'Critical Gap') criticalCount++;
    }

    return NextResponse.json({
      overallReadiness: report.overallReadiness,
      criticalGapsCount: report.criticalGapsCount,
      subjectsAtRiskCount: report.subjectsAtRiskCount,
      distribution: {
        strong: strongCount,
        attention: attentionCount,
        critical: criticalCount,
        total: report.topics.length,
      },
      subjects: report.subjects.map((s) => ({
        id: s.id,
        name: s.name,
        code: s.code,
        readiness: s.readiness,
        attendance: s.attendance,
        criticalCount: s.criticalCount,
        topicCount: s.topicCount,
      })),
      topGaps: report.studyPlan.slice(0, 5),
    });
  } catch (err) {
    console.error('Student dashboard error:', err);
    return NextResponse.json({ error: 'Failed to load dashboard data.' }, { status: 500 });
  }
}
