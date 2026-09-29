// Our own eraser drawing (no emoji exists): pink rubber with a blue end.
export default function EraserIcon() {
  return (
    <svg className="item-svg" viewBox="0 0 100 100" aria-hidden="true">
      <g transform="rotate(-25 50 50)" stroke="#2b2d42" strokeWidth="4" strokeLinejoin="round">
        <rect x="4" y="28" width="92" height="46" rx="10" fill="#F48FB1" />
        <path d="M60 28 H86 a10 10 0 0 1 10 10 V64 a10 10 0 0 1 -10 10 H60 Z" fill="#4A90E2" />
        <line x1="14" y1="38" x2="46" y2="38" stroke="#fff" strokeOpacity="0.75" strokeWidth="5" strokeLinecap="round" />
      </g>
    </svg>
  );
}
