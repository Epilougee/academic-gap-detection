/**
 * Academic Gap Detection Engine
 * Pure rule-based logic for detecting topic mastery, trends, root-cause gaps,
 * attendance risk, subject readiness, and study plan priority.
 */

// Central configuration object for all detection thresholds
export const GAP_CONFIG = {
  strongThreshold: 70,         // 70% or above -> Strong
  attentionThreshold: 50,      // 50% to 69% -> Needs Attention; below 50% -> Critical Gap
  declineDropThreshold: 10,    // 10+ percentage point drop in latest 2 tests -> Declining
  attendanceRiskThreshold: 75, // Below 75% attendance -> At Risk
  classWeakTopicThreshold: 40, // > 40% of students in Critical Gap -> Class-wide weak topic
};

// Calculate average mastery percentage (0-100) across all tests for a single topic
export function getTopicMastery(topicScores) {
  if (!topicScores || topicScores.length === 0) {
    return null;
  }

  let totalPct = 0;
  for (const score of topicScores) {
    const max = Number(score.max_marks);
    const marks = Number(score.marks);
    if (max > 0) {
      totalPct += (marks / max) * 100;
    }
  }

  return Math.round(totalPct / topicScores.length);
}

// Determine the status label for a topic based on its mastery percentage
export function getTopicStatus(mastery) {
  if (mastery === null || mastery === undefined) {
    return 'No Data';
  }
  if (mastery >= GAP_CONFIG.strongThreshold) {
    return 'Strong';
  }
  if (mastery >= GAP_CONFIG.attentionThreshold) {
    return 'Needs Attention';
  }
  return 'Critical Gap';
}

// Helper to check whether a topic status counts as weak
export function isTopicWeak(status) {
  return status === 'Critical Gap' || status === 'Needs Attention';
}

// Compare the latest two scores for a topic to detect a declining trend (drop >= 10 points)
export function getTopicTrend(topicScores) {
  if (!topicScores || topicScores.length < 2) {
    return { direction: 'stable', isDeclining: false, drop: 0 };
  }

  // Sort oldest to newest by test_date, then id
  const sorted = [...topicScores].sort((a, b) => {
    const dateDiff = new Date(a.test_date) - new Date(b.test_date);
    if (dateDiff !== 0) return dateDiff;
    return (a.id || 0) - (b.id || 0);
  });

  const prev = sorted[sorted.length - 2];
  const latest = sorted[sorted.length - 1];

  const prevPct = (Number(prev.marks) / Number(prev.max_marks)) * 100;
  const latestPct = (Number(latest.marks) / Number(latest.max_marks)) * 100;
  const drop = Math.round(prevPct - latestPct);

  if (drop >= GAP_CONFIG.declineDropThreshold) {
    return { direction: 'declining', isDeclining: true, drop };
  }
  if (latestPct - prevPct >= 5) {
    return { direction: 'improving', isDeclining: false, drop };
  }
  return { direction: 'stable', isDeclining: false, drop };
}

// Count how many topics directly or indirectly depend on each topic
export function countDependentTopics(topics) {
  const childrenMap = new Map();
  for (const t of topics) {
    if (t.prerequisite_topic_id) {
      if (!childrenMap.has(t.prerequisite_topic_id)) {
        childrenMap.set(t.prerequisite_topic_id, []);
      }
      childrenMap.get(t.prerequisite_topic_id).push(t.id);
    }
  }

  const counts = new Map();
  function countDescendants(topicId, visited = new Set()) {
    if (visited.has(topicId)) return 0;
    visited.add(topicId);
    const children = childrenMap.get(topicId) || [];
    let total = children.length;
    for (const childId of children) {
      total += countDescendants(childId, visited);
    }
    return total;
  }

  for (const t of topics) {
    counts.set(t.id, countDescendants(t.id));
  }
  return counts;
}

// Identify Root Gaps and Affected topics by checking prerequisite links
export function findRootGaps(topicResults) {
  const byId = new Map(topicResults.map((t) => [t.id, t]));
  const hasWeakDependent = new Set();
  const affectedIds = new Set();

  for (const topic of topicResults) {
    if (isTopicWeak(topic.status) && topic.prerequisite_topic_id) {
      const prereq = byId.get(topic.prerequisite_topic_id);
      if (prereq && isTopicWeak(prereq.status)) {
        affectedIds.add(topic.id);
        hasWeakDependent.add(prereq.id);
      }
    }
  }

  return topicResults.map((topic) => {
    const isAffected = affectedIds.has(topic.id);
    // A topic is a Root Gap if weak topics depend on it and it isn't itself affected by a weaker prerequisite
    const isRootGap = hasWeakDependent.has(topic.id) && !isAffected;
    return {
      ...topic,
      isRootGap,
      isAffected,
    };
  });
}

// Check if a student's attendance in a subject is below the 75% threshold
export function getAttendanceRisk(attendanceRecord) {
  if (!attendanceRecord || Number(attendanceRecord.total_classes) === 0) {
    return { percentage: null, isAtRisk: false, label: 'No Data' };
  }

  const total = Number(attendanceRecord.total_classes);
  const attended = Number(attendanceRecord.attended);
  const percentage = Math.round((attended / total) * 100);
  const isAtRisk = percentage < GAP_CONFIG.attendanceRiskThreshold;

  return {
    percentage,
    isAtRisk,
    label: isAtRisk ? 'At Risk' : 'Good',
  };
}

// Calculate overall readiness score (0-100) for a subject as the average mastery of its topics
export function getSubjectReadiness(topicResults) {
  const scored = topicResults.filter((t) => t.mastery !== null && t.mastery !== undefined);
  if (scored.length === 0) {
    return 0;
  }
  const sum = scored.reduce((acc, t) => acc + t.mastery, 0);
  return Math.round(sum / scored.length);
}

// Build a prioritized study plan: Root Gaps -> Critical -> Declining -> Needs Attention
export function getStudyPlan(topicResults) {
  const needsWork = topicResults.filter(
    (t) => isTopicWeak(t.status) || t.isDeclining
  );

  function getPriorityRank(topic) {
    if (topic.isRootGap) return 1;
    if (topic.status === 'Critical Gap') return 2;
    if (topic.isDeclining) return 3;
    return 4; // Needs Attention
  }

  function getReason(topic) {
    const depCount = topic.dependentCount || 0;
    if (topic.isRootGap) {
      const noun = depCount === 1 ? 'topic depends' : 'topics depend';
      return `Root gap: ${depCount} later ${noun} on this (${topic.mastery}% mastery)`;
    }
    if (topic.status === 'Critical Gap') {
      return `Critical gap: ${topic.mastery}% mastery (below ${GAP_CONFIG.attentionThreshold}%)`;
    }
    if (topic.isDeclining) {
      return `Declining: dropped ${topic.drop} points in the latest test`;
    }
    return `Needs attention: ${topic.mastery}% mastery (target ${GAP_CONFIG.strongThreshold}%+)`;
  }

  const sorted = [...needsWork].sort((a, b) => {
    const rankDiff = getPriorityRank(a) - getPriorityRank(b);
    if (rankDiff !== 0) return rankDiff;

    // Within the same priority level, topics with more dependent topics come first
    const depDiff = (b.dependentCount || 0) - (a.dependentCount || 0);
    if (depDiff !== 0) return depDiff;

    // Tie-breaker: lower mastery comes first
    return (a.mastery ?? 100) - (b.mastery ?? 100);
  });

  return sorted.map((topic, index) => ({
    ...topic,
    priority: index + 1,
    priorityLevel: getPriorityRank(topic),
    reason: getReason(topic),
  }));
}

// Run the full analysis for a list of topics and a student's scores
export function analyzeStudentTopics(topics, scores, subjectsMap = new Map()) {
  const scoresByTopic = new Map();
  for (const s of scores) {
    if (!scoresByTopic.has(s.topic_id)) {
      scoresByTopic.set(s.topic_id, []);
    }
    scoresByTopic.get(s.topic_id).push(s);
  }

  const topicNameById = new Map(topics.map((t) => [t.id, t.name]));
  const dependentCounts = countDependentTopics(topics);

  const initialResults = topics.map((topic) => {
    const topicScores = scoresByTopic.get(topic.id) || [];
    const mastery = getTopicMastery(topicScores);
    const status = getTopicStatus(mastery);
    const trend = getTopicTrend(topicScores);
    const subject = subjectsMap.get(topic.subject_id);

    return {
      id: topic.id,
      subject_id: topic.subject_id,
      subjectName: subject ? subject.name : '',
      subjectCode: subject ? subject.code : '',
      name: topic.name,
      order_no: topic.order_no,
      prerequisite_topic_id: topic.prerequisite_topic_id,
      prerequisiteName: topic.prerequisite_topic_id
        ? topicNameById.get(topic.prerequisite_topic_id) || null
        : null,
      mastery,
      status,
      trend: trend.direction,
      isDeclining: trend.isDeclining,
      drop: trend.drop,
      dependentCount: dependentCounts.get(topic.id) || 0,
      testCount: topicScores.length,
    };
  });

  return findRootGaps(initialResults);
}

