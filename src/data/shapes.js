// Shapes drawn inside a 100x100 SVG box.
export const shapes = [
  { id: 'circle', name: 'circle', color: '#e53935', element: { tag: 'circle', cx: 50, cy: 50, r: 42 } },
  { id: 'square', name: 'square', color: '#1e88e5', element: { tag: 'rect', x: 10, y: 10, width: 80, height: 80, rx: 6 } },
  { id: 'triangle', name: 'triangle', color: '#43a047', element: { tag: 'polygon', points: '50,8 94,90 6,90' } },
  {
    id: 'star',
    name: 'star',
    color: '#fb8c00',
    element: { tag: 'polygon', points: '50,5 61,38 96,38 68,59 79,93 50,72 21,93 32,59 4,38 39,38' },
  },
];
