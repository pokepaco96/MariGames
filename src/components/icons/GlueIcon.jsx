// Our own school glue bottle drawing (no emoji exists): white bottle, orange cap, a drop.
export default function GlueIcon() {
  return (
    <svg className="item-svg" viewBox="0 0 100 100" aria-hidden="true">
      <g stroke="#2b2d42" strokeWidth="4" strokeLinejoin="round">
        <rect x="45" y="3" width="10" height="12" rx="3" fill="#F39C12" />
        <path d="M36 36 L44 13 H56 L64 36 Z" fill="#F39C12" />
        <rect x="20" y="34" width="60" height="62" rx="14" fill="#ffffff" />
        <rect x="20" y="52" width="60" height="26" fill="#F6C945" />
        <path d="M78 6 C85 17 87 24 80 28 C73 24 73 17 78 6 Z" fill="#8AB0D1" />
      </g>
    </svg>
  );
}
