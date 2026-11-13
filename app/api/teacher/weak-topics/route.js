import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getClassReports } from '@/lib/db';
import { GAP_CONFIG } from '@/lib/gapEngine';

// Return topics where more than 40% of students are in Critical Gap
export async function GET() {
  const { errorResponse } = await requireRole('teacher');
  if (errorResponse) return errorResponse;

  try {
    const { subjects, topics, studentReports } = await getClassReports();
    const subjectsMap = new Map(subjects.map((s) => [s.id, s]));
    const totalStudents = studentReports.length;

    const weakTopics = [];

    for (const topic of topics) {
      let criticalCount = 0;
      let masterySum = 0;
      let scoredCount = 0;

      for (const student of studentReports) {
        const match = student.topics.find((t) => t.id === topic.id);
        if (match && match.mastery !== null) {
          scoredCount += 1;
          masterySum += match.mastery;
          if (match.status === 'Critical Gap') {
            criticalCount += 1;
          }
        }
      }

      const criticalPct = totalStudents > 0 ? Math.round((criticalCount / totalStudents) * 100) : 0;
      if (criticalPct > GAP_CONFIG.classWeakTopicThreshold) {
        const subject = subjectsMap.get(topic.subject_id);
        weakTopics.push({
          id: topic.id,
          name: topic.name,
          subjectName: subject ? subject.name : '',
          subjectCode: subject ? subject.code : '',
          criticalCount,
          totalStudents,
          criticalPct,
          classAvgMastery: scoredCount > 0 ? Math.round(masterySum / scoredCount) : 0,
        });
      }
    }

    weakTopics.sort((a, b) => b.criticalPct - a.criticalPct);

    return NextResponse.json({
      threshold: GAP_CONFIG.classWeakTopicThreshold,
      weakTopics,
    });
  } catch (err) {
    console.error('Class weak topics error:', err);
    return NextResponse.json({ error: 'Failed to load class-wide weak topics.' }, { status: 500 });
  }
}

