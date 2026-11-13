import assert from 'node:assert/strict';
import {
  getTopicMastery,
  getTopicStatus,
  getTopicTrend,
  findRootGaps,
  getAttendanceRisk,
  getSubjectReadiness,
  getStudyPlan,
  analyzeStudentTopics,
} from './gapEngine.js';

console.log('--- Testing gapEngine.js ---');

// 1. Test Mastery & Status
assert.equal(getTopicMastery([{ marks: 40, max_marks: 50 }, { marks: 35, max_marks: 50 }]), 75);
assert.equal(getTopicStatus(75), 'Strong');
assert.equal(getTopicStatus(70), 'Strong');
assert.equal(getTopicStatus(60), 'Needs Attention');
assert.equal(getTopicStatus(50), 'Needs Attention');
assert.equal(getTopicStatus(49), 'Critical Gap');
assert.equal(getTopicStatus(null), 'No Data');
console.log('1. Mastery & Status: PASS');

// 2. Test Trend (10+ point drop = Declining)
const decliningTrend = getTopicTrend([
  { id: 1, marks: 80, max_marks: 100, test_date: '2026-09-01' },
  { id: 2, marks: 65, max_marks: 100, test_date: '2026-09-15' },
]);
assert.equal(decliningTrend.isDeclining, true);
assert.equal(decliningTrend.direction, 'declining');
assert.equal(decliningTrend.drop, 15);

const stableTrend = getTopicTrend([
  { id: 1, marks: 75, max_marks: 100, test_date: '2026-09-01' },
  { id: 2, marks: 70, max_marks: 100, test_date: '2026-09-15' },
]);
assert.equal(stableTrend.isDeclining, false);
console.log('2. Trend detection: PASS');

// 3. Test Root Gap & Affected chain
const topics = [
  { id: 1, subject_id: 1, name: 'Arrays & Pointers', order_no: 1, prerequisite_topic_id: null },
  { id: 2, subject_id: 1, name: 'Linked Lists', order_no: 2, prerequisite_topic_id: 1 },
  { id: 3, subject_id: 1, name: 'Trees', order_no: 3, prerequisite_topic_id: 2 },
  { id: 4, subject_id: 1, name: 'Sorting', order_no: 4, prerequisite_topic_id: null },
];
const scores = [
  // Topic 1: 40% (Critical Gap, Root Gap because Topic 2 & 3 depend on it)
  { id: 1, topic_id: 1, marks: 20, max_marks: 50, test_date: '2026-09-01' },
  // Topic 2: 45% (Critical Gap, Affected)
  { id: 2, topic_id: 2, marks: 22.5, max_marks: 50, test_date: '2026-09-10' },
  // Topic 3: 55% (Needs Attention, Affected)
  { id: 3, topic_id: 3, marks: 27.5, max_marks: 50, test_date: '2026-09-20' },
  // Topic 4: 80% -> 60% (avg 70% Strong, but Declining by 20 points)
  { id: 4, topic_id: 4, marks: 40, max_marks: 50, test_date: '2026-09-05' },
  { id: 5, topic_id: 4, marks: 30, max_marks: 50, test_date: '2026-09-25' },
];

const analyzed = analyzeStudentTopics(topics, scores);
const t1 = analyzed.find((t) => t.id === 1);
const t2 = analyzed.find((t) => t.id === 2);
const t3 = analyzed.find((t) => t.id === 3);
const t4 = analyzed.find((t) => t.id === 4);

assert.equal(t1.isRootGap, true);
assert.equal(t1.isAffected, false);
assert.equal(t2.isAffected, true);
assert.equal(t3.isAffected, true);
assert.equal(t4.isDeclining, true);
console.log('3. Root gap & Affected chain: PASS');

// 4. Test Study Plan priority order (Root Gap -> Critical -> Declining -> Needs Attention)
const plan = getStudyPlan(analyzed);
assert.equal(plan[0].id, 1, 'Root Gap should be first');
assert.equal(plan[1].id, 2, 'Critical Gap should be second');
assert.equal(plan[2].id, 4, 'Declining should be third');
assert.equal(plan[3].id, 3, 'Needs Attention should be fourth');
console.log('4. Study Plan priority: PASS');
console.log('Sample Study Plan:', plan.map((p) => `${p.priority}. ${p.name} -> ${p.reason}`));

// 5. Test Attendance Risk & Subject Readiness
assert.equal(getAttendanceRisk({ total_classes: 40, attended: 28 }).isAtRisk, true);
assert.equal(getAttendanceRisk({ total_classes: 40, attended: 30 }).isAtRisk, false);
assert.equal(getSubjectReadiness(analyzed), Math.round((40 + 45 + 55 + 70) / 4));
console.log('5. Attendance & Readiness: PASS');

console.log('All gapEngine tests passed!');

