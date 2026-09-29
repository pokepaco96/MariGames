export default function ShapeIcon({ shape }) {
  const { tag: Tag, ...attrs } = shape.element;
  return (
    <svg className="shape-icon" viewBox="0 0 100 100" aria-hidden="true">
      <Tag {...attrs} fill={shape.color} stroke="#333" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}
