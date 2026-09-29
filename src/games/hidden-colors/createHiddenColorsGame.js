import HiddenColors from './HiddenColors.jsx';

// Builds a Hidden Colors game for one category. A new category only needs:
//   createHiddenColorsGame({
//     id: 'hidden-colors-toys',
//     title: 'Hidden Colors (Toys)',
//     icon: '🧸',                 // home card picture
//     color: '#A4D4C9',           // home card color
//     prompt: 'Find the toy!',    // shown and spoken each round
//     items: toys,                // [{ id, name, emoji } or { id, name, icon: 'eraser' }]
//   })
// One round is played per entry of `items` (repeats allowed).
export function createHiddenColorsGame({ id, title, icon, color, prompt, items }) {
  return { id, title, icon, color, prompt, items, Component: HiddenColors, inlineFeedback: true };
}
