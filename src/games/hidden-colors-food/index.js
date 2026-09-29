import { createHiddenColorsGame } from '../hidden-colors/createHiddenColorsGame.js';
import { foods } from '../../data/foods.js';

export default createHiddenColorsGame({
  id: 'hidden-colors-food',
  title: 'Hidden Colors (Food)',
  icon: '🍌',
  color: '#FD8AAB',
  prompt: 'Find the food!',
  items: foods,
});
