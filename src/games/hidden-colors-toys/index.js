import { createHiddenColorsGame } from '../hidden-colors/createHiddenColorsGame.js';
import { toys } from '../../data/toys.js';

export default createHiddenColorsGame({
  id: 'hidden-colors-toys',
  title: 'Hidden Colors (Toys)',
  icon: '🧸',
  color: '#A4D4C9',
  prompt: 'Find the toy!',
  items: toys,
});
