import { useId } from 'react';

// Wide card for a teacher tool (e.g. Noise Meter): icon, title and a short description.
// The accessible name is just the title; the description is read as its description.
export default function ToolCard({ tool, onSelect }) {
  const id = useId();
  return (
    <button
      type="button"
      className="tool-card"
      style={{ '--card': tool.color }}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-text`}
      onClick={() => onSelect(tool.id)}
    >
      <span className="tool-card-icon" aria-hidden="true">{tool.icon}</span>
      <span className="tool-card-body">
        <span className="tool-card-title" id={`${id}-title`}>{tool.title}</span>
        <span className="tool-card-text" id={`${id}-text`}>{tool.description}</span>
      </span>
      <svg className="tool-card-go" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 12h14M12 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
