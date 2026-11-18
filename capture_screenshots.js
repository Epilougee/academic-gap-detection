import { chromium } from 'playwright';
import path from 'path';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  const outDir = path.resolve('./report/screenshots');

  console.log('Capturing 01-login.png...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(outDir, '01-login.png') });

  console.log('Capturing 02-login-error.png...');
  await page.fill('#email', 'teacher@demo.com');
  await page.fill('#password', 'wrongpass999');
  await page.click('button[type="submit"]');
  await page.waitForSelector('.alert-error');
  await page.screenshot({ path: path.join(outDir, '02-login-error.png') });

  console.log('Logging in as teacher...');
  await page.fill('#email', 'teacher@demo.com');
  await page.fill('#password', 'demo123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/teacher');
  await page.waitForSelector('.stats-grid');
  await page.waitForTimeout(1000); // Allow charts to render smoothly

  console.log('Capturing 03-teacher-dashboard.png...');
  await page.screenshot({ path: path.join(outDir, '03-teacher-dashboard.png') });

  console.log('Capturing 04-teacher-heatmap.png...');
  await page.goto('http://localhost:3000/teacher/heatmap', { waitUntil: 'networkidle' });
  await page.waitForSelector('.card');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, '04-teacher-heatmap.png') });

  console.log('Capturing 05-teacher-weak-topics.png...');
  await page.goto('http://localhost:3000/teacher/weak-topics', { waitUntil: 'networkidle' });
  await page.waitForSelector('.card');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, '05-teacher-weak-topics.png') });

  console.log('Logging out teacher and logging in as Student 1 (Aarav Sharma - Root Gap)...');
  await page.goto('http://localhost:3000/api/auth/logout');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.fill('#email', 'student1@demo.com');
  await page.fill('#password', 'demo123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/student');
  await page.waitForSelector('.stats-grid');
  await page.waitForTimeout(1000);

  console.log('Capturing 06-student-dashboard.png...');
  await page.screenshot({ path: path.join(outDir, '06-student-dashboard.png') });

  console.log('Capturing 07-student-study-plan.png...');
  await page.goto('http://localhost:3000/student/study-plan', { waitUntil: 'networkidle' });
  await page.waitForSelector('.plan-item');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, '07-student-study-plan.png') });

  console.log('Capturing 08-student-subject-detail.png...');
  // Find subject 1
  await page.goto('http://localhost:3000/student/subjects/1', { waitUntil: 'networkidle' });
  await page.waitForSelector('.card');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, '08-student-subject-detail.png') });

  console.log('Logging out and logging in as Student 3 (Rohan Kulkarni - Low Attendance)...');
  await page.goto('http://localhost:3000/api/auth/logout');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.fill('#email', 'student3@demo.com');
  await page.fill('#password', 'demo123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/student');
  await page.waitForSelector('.stats-grid');
  await page.waitForTimeout(1000);

  console.log('Capturing 09-attendance-risk.png...');
  await page.screenshot({ path: path.join(outDir, '09-attendance-risk.png') });

  await browser.close();
  console.log('All screenshots captured successfully!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
