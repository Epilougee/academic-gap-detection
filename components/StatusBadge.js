'use client';

// Status badge with both icon and text label so status is never shown by color alone
export default function StatusBadge({ status }) {
  if (status === 'Strong') {
    return (
      <span className="badge badge-strong">
        <i className="fa-solid fa-circle-check" aria-hidden="true" />
        Strong
      </span>
    );
  }
  if (status === 'Needs Attention') {
    return (
      <span className="badge badge-attention">
        <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
        Needs Attention
      </span>
    );
  }
  if (status === 'Critical Gap') {
    return (
      <span className="badge badge-critical">
        <i className="fa-solid fa-circle-xmark" aria-hidden="true" />
        Critical Gap
      </span>
    );
  }
  return <span className="badge badge-neutral">No Data</span>;
}

