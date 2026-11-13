'use client';

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

// Doughnut chart displaying student's topic breakdown (Strong / Needs Attention / Critical Gap)
export default function StatusBreakdownChart({ distribution }) {
  if (!distribution) return null;

  const data = {
    labels: ['Strong (≥70%)', 'Needs Attention (50-69%)', 'Critical Gap (<50%)'],
    datasets: [
      {
        data: [
          distribution.strong || 0,
          distribution.attention || 0,
          distribution.critical || 0,
        ],
        backgroundColor: [
          '#16A34A', // Vibrant green
          '#F59E0B', // Amber
          '#DC2626', // Crimson red
        ],
        borderColor: ['#FFFFFF', '#FFFFFF', '#FFFFFF'],
        borderWidth: 2,
        hoverOffset: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 14,
          font: {
            size: 12,
            weight: 600,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.label}: ${ctx.raw} topics`,
        },
      },
    },
    cutout: '68%',
  };

  return (
    <div style={{ height: 260, position: 'relative' }}>
      <Doughnut data={data} options={options} />
    </div>
  );
}
