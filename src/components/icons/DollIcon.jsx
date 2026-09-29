// Our own doll drawing (🪆 is a nesting doll): brown hair, pink dress, open arms.
export default function DollIcon() {
  return (
    <svg className="item-svg" viewBox="0 0 100 100" aria-hidden="true">
      <g stroke="#2b2d42" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
        <path d="M28 34 C28 10 72 10 72 34 L76 58 H24 Z" fill="#8B5A2B" />
        <path d="M40 58 L24 74 M60 58 L76 74" fill="none" />
        <path d="M40 52 H60 L80 94 H20 Z" fill="#E83E8C" />
        <circle cx="24" cy="75" r="5" fill="#FFD9B8" />
        <circle cx="76" cy="75" r="5" fill="#FFD9B8" />
        <circle cx="50" cy="33" r="18" fill="#FFD9B8" />
        <path d="M32 30 C34 16 66 16 68 30 C58 23 42 23 32 30 Z" fill="#8B5A2B" />
        <path d="M44 41 Q50 46 56 41" fill="none" strokeWidth="3" />
      </g>
      <circle cx="43" cy="34" r="2.8" fill="#2b2d42" />
      <circle cx="57" cy="34" r="2.8" fill="#2b2d42" />
      <circle cx="39" cy="40" r="3" fill="#F48FB1" />
      <circle cx="61" cy="40" r="3" fill="#F48FB1" />
    </svg>
  );
}
