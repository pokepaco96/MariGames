import EraserIcon from './icons/EraserIcon.jsx';
import GlueIcon from './icons/GlueIcon.jsx';
import DollIcon from './icons/DollIcon.jsx';

// Pictures for vocabulary items: an emoji, or one of our own SVG icons
// when no good emoji exists (item.icon names the drawing).
const customIcons = { eraser: EraserIcon, glue: GlueIcon, doll: DollIcon };

export default function ItemIcon({ item }) {
  const Icon = item.icon && customIcons[item.icon];
  return Icon ? <Icon /> : item.emoji;
}
