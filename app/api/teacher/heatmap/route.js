import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getClassReports } from '@/lib/db';
import { getTopicStatus } from '@/lib/gapEngine';

// Return students x topics and students x subjects matrices for the Heatmap view
export async function GET(request) {
  const { errorResponse } = await requireRole('teacher');
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const { subjects, topics, studentReports } = await getClassReports();

    const selectedSubjectId = Number(searchParams.get('subjectId')) || subjects[0]?.id || null;
    const subjectTopics = topics.filter((t) => t.subject_id === selectedSubjectId);

    // 1. Topic-wise matrix rows for selected subject
    const topicRows = studentReports.map((student) => {
      const topicMap = new Map(student.topics.map((t) => [t.id, t]));
      return {
        id: student.id,
        name: student.name,
        cells: subjectTopics.map((t) => {
          const analyzed = topicMap.get(t.id);
          return {
            topicId: t.id,
            mastery: analyzed?.mastery ?? null,
            status: analyzed?.status ?? 'No Data',
            isRootGap: analyzed?.isRootGap ?? false,
            isDeclining: analyzed?.isDeclining ?? false,
          };
        }),
      };
    });

    // Calculate class-level statistics for each topic to help teachers filter & understand weak topics
    const topicStats = subjectTopics.map((t) => {
      let totalMastery = 0;
      let count = 0;
      let criticalCount = 0;
      let weakCount = 0;

      for (const student of studentReports) {
        const analyzed = student.topics.find((st) => st.id === t.id);
        if (analyzed && analyzed.mastery !== null && analyzed.mastery !== undefined) {
          totalMastery += analyzed.mastery;
          count++;
          if (analyzed.status === 'Critical Gap') criticalCount++;
          if (analyzed.status === 'Critical Gap' || analyzed.status === 'Needs Attention') weakCount++;
        }
      }

      const avgMastery = count > 0 ? Math.round(totalMastery / count) : 0;
      return {
        id: t.id,
        name: t.name,
        order_no: t.order_no,
        avgMastery,
        status: getTopicStatus(avgMastery),
        criticalCount,
        weakCount,
        isClassWeak: count > 0 && criticalCount / count > 0.4,
      };
    });

    // 2. Subject-wise matrix rows across all subjects (Reduces topics to just subjects!)
    const subjectRows = studentReports.map((student) => {
      const studentSubMap = new Map((student.subjects || []).map((s) => [s.id, s]));
      return {
        id: student.id,
        name: student.name,
        overallReadiness: student.overallReadiness,
        overallStatus: getTopicStatus(student.overallReadiness),
        cells: subjects.map((sub) => {
          const sSummary = studentSubMap.get(sub.id);
          const readiness = sSummary ? sSummary.readiness : 0;
          return {
            subjectId: sub.id,
            subjectCode: sub.code,
            subjectName: sub.name,
            readiness,
            status: getTopicStatus(readiness),
            attendancePercentage: sSummary?.attendance?.percentage ?? null,
            isAttendanceAtRisk: sSummary?.attendance?.isAtRisk ?? false,
          };
        }),
      };
    });

    return NextResponse.json({
      subjects,
      selectedSubjectId,
      topics: topicStats,
      rows: topicRows,
      subjectRows,
    });
  } catch (err) {
    console.error('Teacher heatmap error:', err);
    return NextResponse.json({ error: 'Failed to load heatmap.' }, { status: 500 });
  }
}
