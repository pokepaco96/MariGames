import { createHiddenColorsGame } from '../hidden-colors/createHiddenColorsGame.js';
import { schoolObjects } from '../../data/schoolObjects.js';

export default createHiddenColorsGame({
  id: 'hidden-colors-school',
  title: 'Hidden Colors (School)',
  icon: '🎒',
  color: '#8AB0D1',
  prompt: 'Find the object!',
  items: schoolObjects,
});
