-- Academic Gap Detection System - Database Schema
-- Paste this file into the Supabase SQL Editor and run it.

-- 1. Users table (students and teachers)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher'))
);

-- 2. Subjects table
CREATE TABLE IF NOT EXISTS subjects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE
);

-- 3. Topics table (each topic belongs to a subject and may have a prerequisite topic)
CREATE TABLE IF NOT EXISTS topics (
  id SERIAL PRIMARY KEY,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_no INTEGER NOT NULL DEFAULT 1,
  prerequisite_topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL
);

-- 4. Scores table (topic-wise test scores for each student)
CREATE TABLE IF NOT EXISTS scores (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  marks NUMERIC(6, 2) NOT NULL CHECK (marks >= 0),
  max_marks NUMERIC(6, 2) NOT NULL CHECK (max_marks > 0),
  test_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- 5. Attendance table (one row per student per subject)
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  total_classes INTEGER NOT NULL DEFAULT 0 CHECK (total_classes >= 0),
  attended INTEGER NOT NULL DEFAULT 0 CHECK (attended >= 0),
  UNIQUE (student_id, subject_id)
);

-- Helpful indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_topics_subject ON topics(subject_id);
CREATE INDEX IF NOT EXISTS idx_scores_student ON scores(student_id);
CREATE INDEX IF NOT EXISTS idx_scores_topic ON scores(topic_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);

