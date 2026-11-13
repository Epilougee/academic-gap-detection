/**
 * Seed script for Academic Gap Detection System.
 * Run locally with: node db/seed.js
 * Requires SUPABASE_URL and SUPABASE_SERVICE_KEY in .env or .env.local
 */
import 'dotenv/config';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

// Also load .env.local if present (common in Next.js projects)
dotenv.config({ path: '.env.local' });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;

if (!url || !key) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env or .env.local');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SUBJECTS = [
  { name: 'Data Structures', code: 'CS201' },
  { name: 'Database Management Systems', code: 'CS202' },
  { name: 'Engineering Mathematics', code: 'MA201' },
  { name: 'Python Programming', code: 'CS102' },
];

// 8-9 topics per subject with realistic prerequisite chains (referencing topic name in same subject)
const TOPICS_BY_SUBJECT = {
  CS201: [
    { name: 'Arrays & Pointers', order_no: 1, prereq: null },
    { name: 'Time & Space Complexity', order_no: 2, prereq: null },
    { name: 'Linked Lists', order_no: 3, prereq: 'Arrays & Pointers' },
    { name: 'Stacks & Queues', order_no: 4, prereq: 'Linked Lists' },
    { name: 'Recursion & Backtracking', order_no: 5, prereq: 'Time & Space Complexity' },
    { name: 'Sorting Algorithms', order_no: 6, prereq: 'Time & Space Complexity' },
    { name: 'Binary Trees', order_no: 7, prereq: 'Recursion & Backtracking' },
    { name: 'Binary Search Trees', order_no: 8, prereq: 'Binary Trees' },
    { name: 'Graph Traversal (BFS/DFS)', order_no: 9, prereq: 'Stacks & Queues' },
  ],
  CS202: [
    { name: 'ER Modeling', order_no: 1, prereq: null },
    { name: 'Relational Algebra', order_no: 2, prereq: 'ER Modeling' },
    { name: 'SQL Basics & DDL', order_no: 3, prereq: 'Relational Algebra' },
    { name: 'Joins & Subqueries', order_no: 4, prereq: 'SQL Basics & DDL' },
    { name: 'Functional Dependencies', order_no: 5, prereq: 'Relational Algebra' },
    { name: 'Normalization (1NF to BCNF)', order_no: 6, prereq: 'Functional Dependencies' },
    { name: 'Indexing & B-Trees', order_no: 7, prereq: 'SQL Basics & DDL' },
    { name: 'Transactions & ACID', order_no: 8, prereq: 'Normalization (1NF to BCNF)' },
  ],
  MA201: [
    { name: 'Algebra & Matrices', order_no: 1, prereq: null },
    { name: 'Eigenvalues & Eigenvectors', order_no: 2, prereq: 'Algebra & Matrices' },
    { name: 'Limits & Continuity', order_no: 3, prereq: null },
    { name: 'Differentiation', order_no: 4, prereq: 'Limits & Continuity' },
    { name: 'Partial Derivatives', order_no: 5, prereq: 'Differentiation' },
    { name: 'Integration Techniques', order_no: 6, prereq: 'Differentiation' },
    { name: 'Differential Equations', order_no: 7, prereq: 'Integration Techniques' },
    { name: 'Probability Distributions', order_no: 8, prereq: 'Algebra & Matrices' },
  ],
  CS102: [
    { name: 'Variables & Control Flow', order_no: 1, prereq: null },
    { name: 'Functions & Scope', order_no: 2, prereq: 'Variables & Control Flow' },
    { name: 'Lists, Tuples & Dicts', order_no: 3, prereq: 'Variables & Control Flow' },
    { name: 'String Manipulation', order_no: 4, prereq: 'Lists, Tuples & Dicts' },
    { name: 'File Handling', order_no: 5, prereq: 'Functions & Scope' },
    { name: 'Exception Handling', order_no: 6, prereq: 'File Handling' },
    { name: 'Object-Oriented Python', order_no: 7, prereq: 'Functions & Scope' },
    { name: 'Modules & Libraries', order_no: 8, prereq: 'Object-Oriented Python' },
  ],
};

const STUDENTS = [
  { name: 'Aarav Sharma', email: 'student1@demo.com', profile: 'root_gap' },
  { name: 'Priya Nair', email: 'student2@demo.com', profile: 'declining' },
  { name: 'Rohan Kulkarni', email: 'student3@demo.com', profile: 'low_attendance' },
  { name: 'Ananya Iyer', email: 'student4@demo.com', profile: 'strong' },
  { name: 'Vikram Patel', email: 'student5@demo.com', profile: 'math_weak' },
  { name: 'Sneha Reddy', email: 'student6@demo.com', profile: 'average' },
  { name: 'Kabir Mehta', email: 'student7@demo.com', profile: 'mixed_good' },
  { name: 'Divya Menon', email: 'student8@demo.com', profile: 'ds_weak' },
  { name: 'Arjun Verma', email: 'student9@demo.com', profile: 'python_weak' },
  { name: 'Meera Joshi', email: 'student10@demo.com', profile: 'steady' },
  { name: 'Siddharth Rao', email: 'student11@demo.com', profile: 'struggling' },
  { name: 'Neha Deshmukh', email: 'student12@demo.com', profile: 'strong_mid' },
];

// Deterministic pseudo-random helper so seeded numbers look realistic and repeatable
function seededOffset(seed, range) {
  const x = Math.sin(seed) * 10000;
  const frac = x - Math.floor(x);
  return Math.round((frac - 0.5) * 2 * range);
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

// Generate 3 test scores for a student-topic pair based on the student's profile
function generateScoresForTopic(studentIdx, studentProfile, topic, subjectCode) {
  const seed = (studentIdx + 1) * 100 + topic.id;
  let basePct = 74;
  let trendShift = 0;

  if (studentProfile === 'strong') {
    basePct = 86 + seededOffset(seed, 7);
    trendShift = 3;
  } else if (studentProfile === 'strong_mid') {
    basePct = 76 + seededOffset(seed, 8);
    if (topic.name.includes('Graph')) basePct = 58;
  } else if (studentProfile === 'root_gap') {
    // Clear root-gap chain in Data Structures (Arrays & Pointers -> Linked Lists -> Stacks & Queues -> Graph Traversal)
    // and in DBMS (Relational Algebra -> SQL Basics -> Joins & Subqueries)
    if (subjectCode === 'CS201') {
      if (topic.name === 'Arrays & Pointers') basePct = 36;
      else if (topic.name === 'Linked Lists') basePct = 42;
      else if (topic.name === 'Stacks & Queues') basePct = 48;
      else if (topic.name === 'Graph Traversal (BFS/DFS)') basePct = 54;
      else basePct = 75 + seededOffset(seed, 6);
    } else if (subjectCode === 'CS202') {
      if (topic.name === 'Relational Algebra') basePct = 40;
      else if (topic.name === 'SQL Basics & DDL') basePct = 46;
      else if (topic.name === 'Joins & Subqueries') basePct = 55;
      else basePct = 74 + seededOffset(seed, 6);
    } else {
      basePct = 73 + seededOffset(seed, 8);
    }
  } else if (studentProfile === 'declining') {
    // Starts strong, drops sharply in latest test (20-26 points)
    basePct = 78 + seededOffset(seed, 5);
    if (topic.order_no >= 3 && topic.order_no <= 6) {
      trendShift = -24;
    } else {
      trendShift = -14;
    }
  } else if (studentProfile === 'low_attendance') {
    basePct = 66 + seededOffset(seed, 10);
  } else if (studentProfile === 'math_weak') {
    basePct = subjectCode === 'MA201' ? 44 + seededOffset(seed, 8) : 76 + seededOffset(seed, 7);
  } else if (studentProfile === 'ds_weak') {
    basePct = subjectCode === 'CS201' ? 45 + seededOffset(seed, 8) : 77 + seededOffset(seed, 7);
  } else if (studentProfile === 'python_weak') {
    basePct = subjectCode === 'CS102' ? 46 + seededOffset(seed, 8) : 72 + seededOffset(seed, 8);
  } else if (studentProfile === 'struggling') {
    basePct = 42 + seededOffset(seed, 10);
  } else if (studentProfile === 'average') {
    basePct = 63 + seededOffset(seed, 12);
  } else if (studentProfile === 'mixed_good') {
    basePct = subjectCode === 'MA201' ? 54 + seededOffset(seed, 8) : 81 + seededOffset(seed, 6);
  } else {
    basePct = 72 + seededOffset(seed, 10);
  }

  // Ensure a few specific topics are weak across >40% of students for the Class-Wide Weak Topics view
  if (
    (topic.name === 'Normalization (1NF to BCNF)' ||
      topic.name === 'Integration Techniques' ||
      topic.name === 'Graph Traversal (BFS/DFS)') &&
    studentIdx % 2 === 0 &&
    studentProfile !== 'strong'
  ) {
    basePct = Math.min(basePct, 42 + seededOffset(seed, 5));
  }

  const dates = ['2026-08-18', '2026-09-14', '2026-10-12'];
  const testNames = ['Quiz 1', 'Mid-Term Check', 'Unit Test'];
  const maxMarks = 50;

  return dates.map((test_date, idx) => {
    let pct = basePct;
    if (trendShift !== 0) {
      if (idx === 0) pct = basePct + 6;
      if (idx === 1) pct = basePct + 2;
      if (idx === 2) pct = basePct + trendShift;
    } else {
      pct = basePct + seededOffset(seed + idx * 7, 4);
    }
    pct = clamp(pct, 15, 98);
    const marks = Math.round((pct / 100) * maxMarks);

    return {
      topic_id: topic.id,
      test_name: testNames[idx],
      marks,
      max_marks: maxMarks,
      test_date,
    };
  });
}

async function seed() {
  console.log('Clearing existing data...');
  await supabase.from('scores').delete().neq('id', 0);
  await supabase.from('attendance').delete().neq('id', 0);
  await supabase.from('topics').delete().neq('id', 0);
  await supabase.from('subjects').delete().neq('id', 0);
  await supabase.from('users').delete().neq('id', 0);

  console.log('Inserting users...');
  const passwordHash = await bcrypt.hash('demo123', 10);
  const usersToInsert = [
    {
      name: 'Prof. Rajesh Gupta',
      email: 'teacher@demo.com',
      password_hash: passwordHash,
      role: 'teacher',
    },
    ...STUDENTS.map((s) => ({
      name: s.name,
      email: s.email,
      password_hash: passwordHash,
      role: 'student',
    })),
  ];

  const { data: insertedUsers, error: userErr } = await supabase
    .from('users')
    .insert(usersToInsert)
    .select();
  if (userErr) throw userErr;

  const studentUsers = insertedUsers.filter((u) => u.role === 'student');

  console.log('Inserting subjects...');
  const { data: insertedSubjects, error: subErr } = await supabase
    .from('subjects')
    .insert(SUBJECTS)
    .select();
  if (subErr) throw subErr;

  console.log('Inserting topics and prerequisite links...');
  const allTopics = [];
  for (const subject of insertedSubjects) {
    const topicDefs = TOPICS_BY_SUBJECT[subject.code];
    // Insert topics first without prerequisite_topic_id
    const { data: insertedTopics, error: topErr } = await supabase
      .from('topics')
      .insert(
        topicDefs.map((t) => ({
          subject_id: subject.id,
          name: t.name,
          order_no: t.order_no,
          prerequisite_topic_id: null,
        }))
      )
      .select();
    if (topErr) throw topErr;

    const byName = new Map(insertedTopics.map((t) => [t.name, t]));
    // Update prerequisite links
    for (const def of topicDefs) {
      if (def.prereq) {
        const child = byName.get(def.name);
        const parent = byName.get(def.prereq);
        if (child && parent) {
          const { error: updErr } = await supabase
            .from('topics')
            .update({ prerequisite_topic_id: parent.id })
            .eq('id', child.id);
          if (updErr) throw updErr;
          child.prerequisite_topic_id = parent.id;
        }
      }
    }
    allTopics.push(...insertedTopics.map((t) => ({ ...t, subjectCode: subject.code })));
  }

  console.log('Inserting scores...');
  const scoreRows = [];
  studentUsers.forEach((student, sIdx) => {
    const profile = STUDENTS[sIdx].profile;
    for (const topic of allTopics) {
      const generated = generateScoresForTopic(sIdx, profile, topic, topic.subjectCode);
      for (const g of generated) {
        scoreRows.push({
          student_id: student.id,
          ...g,
        });
      }
    }
  });

  // Insert in batches of 500
  for (let i = 0; i < scoreRows.length; i += 500) {
    const batch = scoreRows.slice(i, i + 500);
    const { error: scErr } = await supabase.from('scores').insert(batch);
    if (scErr) throw scErr;
  }

  console.log('Inserting attendance...');
  const attendanceRows = [];
  studentUsers.forEach((student, sIdx) => {
    const profile = STUDENTS[sIdx].profile;
    insertedSubjects.forEach((subject, subIdx) => {
      const total_classes = 40;
      let attended = 35;
      if (profile === 'low_attendance') {
        attended = subIdx < 3 ? 24 + subIdx * 2 : 34; // 60%, 65%, 70% (At Risk)
      } else if (profile === 'strong') {
        attended = 38;
      } else if (profile === 'struggling') {
        attended = subIdx % 2 === 0 ? 27 : 31; // 68% in two subjects
      } else if (profile === 'python_weak' && subject.code === 'CS102') {
        attended = 26; // 65%
      } else {
        attended = 32 + ((sIdx + subIdx) % 7);
      }

      attendanceRows.push({
        student_id: student.id,
        subject_id: subject.id,
        total_classes,
        attended,
      });
    });
  });

  const { error: attErr } = await supabase.from('attendance').insert(attendanceRows);
  if (attErr) throw attErr;

  console.log(`Seed complete! Inserted ${insertedUsers.length} users, ${insertedSubjects.length} subjects, ${allTopics.length} topics, ${scoreRows.length} scores, ${attendanceRows.length} attendance records.`);
  console.log('Demo credentials (password: demo123):');
  console.log('  Teacher: teacher@demo.com');
  console.log('  Student (Root Gap demo): student1@demo.com');
  console.log('  Student (Declining demo): student2@demo.com');
  console.log('  Student (Low Attendance demo): student3@demo.com');
  console.log('  Student (Strong demo): student4@demo.com');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

