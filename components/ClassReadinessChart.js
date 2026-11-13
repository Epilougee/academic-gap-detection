'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// Bar chart showing student readiness distribution across the class
export default function ClassReadinessChart({ distribution }) {
  if (!distribution) return null;

  const data = {
    labels: ['Strong (≥70%)', 'Moderate (50-69%)', 'Critical (<50%)'],
    datasets: [
      {
        label: 'Students',
        data: [distribution.high, distribution.mid, distribution.low],
        backgroundColor: ['#16A34A', '#F59E0B', '#DC2626'],
        borderRadius: 8,
        maxBarThickness: 56,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.raw} student${ctx.raw === 1 ? '' : 's'}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
        grid: {
          color: '#E2E8F0',
        },
      },
      x: {
        grid: { display: false },
        ticks: {
          font: { weight: 600 },
        },
      },
    },
  };

  return (
    <div style={{ height: 220 }}>
      <Bar data={data} options={options} />
    </div>
  );
}
