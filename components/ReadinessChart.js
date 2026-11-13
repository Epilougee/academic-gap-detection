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

// Bar chart showing readiness percentage per subject with status-aware color coding
export default function ReadinessChart({ subjects }) {
  // Color bars based on subject readiness percentage
  const barColors = subjects.map((s) => {
    if (s.readiness >= 70) return '#16A34A'; // Strong green
    if (s.readiness >= 50) return '#D97706'; // Amber attention
    return '#DC2626'; // Critical red
  });

  const data = {
    labels: subjects.map((s) => s.code || s.name),
    datasets: [
      {
        label: 'Readiness %',
        data: subjects.map((s) => s.readiness),
        backgroundColor: barColors,
        borderRadius: 8,
        maxBarThickness: 48,
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
          label: (ctx) => `Readiness: ${ctx.parsed.y}%`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: (value) => `${value}%`,
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
    <div style={{ height: 260 }}>
      <Bar data={data} options={options} />
    </div>
  );
}
