import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getClassReports } from '@/lib/db';

// Return students x topics mastery matrix for the Topic Heatmap view
export async function GET(request) {
  const { errorResponse } = await requireRole('teacher');
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const { subjects, topics, studentReports } = await getClassReports();

    const selectedSubjectId = Number(searchParams.get('subjectId')) || subjects[0]?.id || null;
    const subjectTopics = topics.filter((t) => t.subject_id === selectedSubjectId);

    const rows = studentReports.map((student) => {
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
          };
        }),
      };
    });

    return NextResponse.json({
      subjects,
      selectedSubjectId,
      topics: subjectTopics.map((t) => ({ id: t.id, name: t.name })),
      rows,
    });
  } catch (err) {
    console.error('Teacher heatmap error:', err);
    return NextResponse.json({ error: 'Failed to load heatmap.' }, { status: 500 });
  }
}

