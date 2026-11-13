import { createClient } from '@supabase/supabase-js';
import {
  analyzeStudentTopics,
  getAttendanceRisk,
  getSubjectReadiness,
  getStudyPlan,
} from './gapEngine.js';

let cachedClient = null;

// Return a server-side Supabase client using the service role key
export function getSupabase() {
  if (cachedClient) {
    return cachedClient;
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables.');
  }

  cachedClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedClient;
}

// Fetch all subjects, topics, scores, and attendance for one student and run gap detection
export async function getStudentReport(studentId) {
  const supabase = getSupabase();

  const [
    { data: subjects, error: subErr },
    { data: topics, error: topErr },
    { data: scores, error: scErr },
    { data: attendanceRows, error: attErr },
  ] = await Promise.all([
    supabase.from('subjects').select('*').order('id'),
    supabase.from('topics').select('*').order('order_no'),
    supabase.from('scores').select('*').eq('student_id', studentId),
    supabase.from('attendance').select('*').eq('student_id', studentId),
  ]);

  if (subErr) throw subErr;
  if (topErr) throw topErr;
  if (scErr) throw scErr;
  if (attErr) throw attErr;

  const subjectsMap = new Map(subjects.map((s) => [s.id, s]));
  const attendanceMap = new Map(attendanceRows.map((a) => [a.subject_id, a]));

  const analyzedTopics = analyzeStudentTopics(topics, scores, subjectsMap);

  const subjectSummaries = subjects.map((subject) => {
    const subjectTopics = analyzedTopics.filter((t) => t.subject_id === subject.id);
    const readiness = getSubjectReadiness(subjectTopics);
    const attendance = getAttendanceRisk(attendanceMap.get(subject.id));
    const criticalCount = subjectTopics.filter((t) => t.status === 'Critical Gap').length;

    return {
      ...subject,
      readiness,
      attendance,
      criticalCount,
      topicCount: subjectTopics.length,
      topics: subjectTopics,
    };
  });

  const studyPlan = getStudyPlan(analyzedTopics);
  const overallReadiness =
    subjectSummaries.length > 0
      ? Math.round(
          subjectSummaries.reduce((sum, s) => sum + s.readiness, 0) / subjectSummaries.length
        )
      : 0;
  const criticalGapsCount = analyzedTopics.filter((t) => t.status === 'Critical Gap').length;
  const subjectsAtRiskCount = subjectSummaries.filter((s) => s.attendance.isAtRisk).length;

  return {
    overallReadiness,
    criticalGapsCount,
    subjectsAtRiskCount,
    subjects: subjectSummaries,
    topics: analyzedTopics,
    studyPlan,
  };
}

// Fetch all students, subjects, topics, scores, and attendance in 5 parallel queries
// and compute gap reports for the entire class without N+1 database calls
export async function getClassReports() {
  const supabase = getSupabase();

  const [
    { data: students, error: stuErr },
    { data: subjects, error: subErr },
    { data: topics, error: topErr },
    { data: scores, error: scErr },
    { data: attendanceRows, error: attErr },
  ] = await Promise.all([
    supabase
      .from('users')
      .select('id, name, email')
      .eq('role', 'student')
      .order('name'),
    supabase.from('subjects').select('*').order('id'),
    supabase.from('topics').select('*').order('order_no'),
    supabase.from('scores').select('*'),
    supabase.from('attendance').select('*'),
  ]);

  if (stuErr) throw stuErr;
  if (subErr) throw subErr;
  if (topErr) throw topErr;
  if (scErr) throw scErr;
  if (attErr) throw attErr;

  const subjectsMap = new Map(subjects.map((s) => [s.id, s]));

  // Group scores and attendance by student_id
  const scoresByStudent = new Map();
  for (const s of scores) {
    if (!scoresByStudent.has(s.student_id)) scoresByStudent.set(s.student_id, []);
    scoresByStudent.get(s.student_id).push(s);
  }

  const attendanceByStudent = new Map();
  for (const a of attendanceRows) {
    if (!attendanceByStudent.has(a.student_id)) attendanceByStudent.set(a.student_id, new Map());
    attendanceByStudent.get(a.student_id).set(a.subject_id, a);
  }

  const studentReports = students.map((student) => {
    const stuScores = scoresByStudent.get(student.id) || [];
    const stuAttMap = attendanceByStudent.get(student.id) || new Map();
    const analyzedTopics = analyzeStudentTopics(topics, stuScores, subjectsMap);

    const subjectSummaries = subjects.map((subject) => {
      const subjectTopics = analyzedTopics.filter((t) => t.subject_id === subject.id);
      const readiness = getSubjectReadiness(subjectTopics);
      const attendance = getAttendanceRisk(stuAttMap.get(subject.id));
      return {
        id: subject.id,
        name: subject.name,
        code: subject.code,
        readiness,
        attendance,
      };
    });

    const overallReadiness =
      subjectSummaries.length > 0
        ? Math.round(
            subjectSummaries.reduce((sum, s) => sum + s.readiness, 0) / subjectSummaries.length
          )
        : 0;
    const criticalGapsCount = analyzedTopics.filter((t) => t.status === 'Critical Gap').length;
    const atRiskSubjects = subjectSummaries.filter((s) => s.attendance.isAtRisk);

    return {
      id: student.id,
      name: student.name,
      email: student.email,
      overallReadiness,
      criticalGapsCount,
      subjectsAtRiskCount: atRiskSubjects.length,
      attendanceRisk: atRiskSubjects.length > 0,
      topics: analyzedTopics,
    };
  });

  return { subjects, topics, studentReports };
}
