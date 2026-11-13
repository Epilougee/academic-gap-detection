# Academic Gap Detection System

A simple, rule-based web application for students and teachers to identify topic-level learning gaps, trace weak prerequisites (root causes), monitor attendance risk, and generate a prioritized study plan.

## Tech Stack
- **Framework:** Next.js 14 (App Router, JavaScript)
- **Database:** Supabase (PostgreSQL, accessed only from server-side code using the service role key)
- **Authentication:** Email + password (`bcryptjs`) with signed HTTP-only cookies (`jose`)
- **Charts & Icons:** Chart.js (`react-chartjs-2`), Font Awesome 6, Inter font
- **Styling:** Single global CSS file (`app/globals.css`) with CSS variables

---

## Demo Logins (after running seed)
All demo accounts use password: **`demo123`**

- **Teacher:** `teacher@demo.com` (Prof. Rajesh Gupta)
- **Student (Root-Gap Chain Demo):** `student1@demo.com` (Aarav Sharma)
- **Student (Declining Trend Demo):** `student2@demo.com` (Priya Nair)
- **Student (Low Attendance Demo):** `student3@demo.com` (Rohan Kulkarni)
- **Student (Strong Student Demo):** `student4@demo.com` (Ananya Iyer)

---

## Local Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env.local`** by copying `.env.example`:
   ```bash
   cp .env.example .env.local
   ```
   Fill in your `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, and `SESSION_SECRET`.

3. **Run the gap engine unit test:**
   ```bash
   node lib/gapEngine.test.js
   ```

4. **Seed the database** (after completing Supabase Setup below):
   ```bash
   node db/seed.js
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

---

## Supabase Setup Steps

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** in your Supabase dashboard.
3. Copy the entire contents of `db/schema.sql`, paste it into the SQL Editor, and click **Run**.
4. Go to **Project Settings -> API** and copy:
   - **Project URL** -> `SUPABASE_URL`
   - **service_role secret key** -> `SUPABASE_SERVICE_KEY` (keep this secret; it is used only in server-side API routes).
5. Run `node db/seed.js` locally to populate the 12 students, 1 teacher, 4 subjects, topics with prerequisite links, test scores, and attendance records.

---

## Vercel Deploy Steps

1. Push this repository to GitHub.
2. Import the repository into [vercel.com](https://vercel.com).
3. In Vercel **Project Settings -> Environment Variables**, add:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `SESSION_SECRET` (a random 32+ character string)
4. Click **Deploy**. Vercel runs `npm run build` and deploys all pages and API routes as serverless functions.

---

## Simple ER Diagram

```text
+------------------+       +----------------------+
|      users       |       |       subjects       |
+------------------+       +----------------------+
| id (PK)          |       | id (PK)              |
| name             |       | name                 |
| email (UNIQUE)   |       | code (UNIQUE)        |
| password_hash    |       +----------+-----------+
| role             |                  |
+---+----------+---+                  | 1:N
    |          |                      v
    | 1:N      | 1:N       +----------------------+
    |          +---------->|        topics        |
    |                      +----------------------+
    |                      | id (PK)              |
    |                      | subject_id (FK)      |
    |                      | name                 |
    |                      | order_no             |
    |                      | prerequisite_topic_id|--+ (self-FK)
    |                      +----------+-----------+  |
    |                                 ^--------------+
    |                                 | 1:N
    v                                 v
+------------------+       +----------------------+
|    attendance    |       |        scores        |
+------------------+       +----------------------+
| id (PK)          |       | id (PK)              |
| student_id (FK)  |       | student_id (FK)      |
| subject_id (FK)  |       | topic_id (FK)        |
| total_classes    |       | test_name            |
| attended         |       | marks                |
+------------------+       | max_marks            |
                           | test_date            |
                           +----------------------+
```

---

## Gap Detection Logic (6-Line Summary)

1. **Mastery:** Each topic's mastery % is the average of `(marks / max_marks) * 100` across all tests for that topic.
2. **Status:** `70%+` is **Strong**, `50–69%` is **Needs Attention**, and `< 50%` is **Critical Gap**.
3. **Trend:** Comparing the latest two tests for a topic, a drop of `10+` percentage points flags it as **Declining**.
4. **Root Cause:** If a topic is weak (`< 70%`) AND its prerequisite topic is also weak, the prerequisite is marked **Root Gap** and the dependent topic is marked **Affected**.
5. **Attendance & Readiness:** Subject attendance `< 75%` is flagged **At Risk**; subject readiness is the average mastery of its topics.
6. **Study Plan:** Weak/declining topics are sorted as **Root Gaps -> Critical -> Declining -> Needs Attention**, with more dependent topics prioritized first.

---

## 8 Likely Viva Questions & Short Answers

1. **Why not use Machine Learning (ML) or AI for this?**
   ML requires thousands of labeled student records and acts as a black box that is hard to justify to teachers or students. Rule-based thresholds are transparent, deterministic, work from day one with just a few test scores, and every recommendation can be explained in one clear sentence.

2. **How does root-cause detection work?**
   Each topic can point to a `prerequisite_topic_id`. In `findRootGaps()`, if a topic is weak (`< 70%`) and its prerequisite is also weak, the dependent topic is tagged **Affected** and the foundational prerequisite is tagged **Root Gap**, so the student fixes the foundation first.

3. **How do you calculate topic mastery and subject readiness?**
   Topic mastery is the average percentage `(marks / max_marks) * 100` across all tests recorded for that topic. Subject readiness is the average mastery of all scored topics in that subject.

4. **How does the trend detector know a student is declining?**
   `getTopicTrend()` sorts a topic's tests by date and compares the latest two scores. If the newest score dropped by 10 percentage points or more compared to the previous test, it flags the topic as **Declining**.

5. **Why are database queries kept only on the server side?**
   Keeping Supabase calls inside Next.js API routes and server helpers protects the `SUPABASE_SERVICE_KEY` from being exposed in the browser, avoids complex client-side Row-Level Security policies, and guarantees every request is checked against the signed session cookie first.

6. **How does authentication work without a third-party auth service?**
   Passwords are hashed with `bcryptjs` before saving in Postgres. On login, the server verifies the password, signs a JWT containing `{ id, name, email, role }` using `jose`, and stores it in an `HttpOnly` cookie (`gap_session`).

7. **Why does this project work on Vercel's serverless platform?**
   There are no local file writes, no SQLite database, and no in-memory session store. All state lives in Supabase Postgres and the signed HTTP-only cookie, so any serverless function instance can handle any request.

8. **What happens if a teacher adds a new topic or score?**
   Because gap detection runs dynamically in `lib/gapEngine.js` from the live `topics` and `scores` tables, any new score, attendance update, or prerequisite change immediately updates the student's dashboard, study plan, and teacher's heatmap.

