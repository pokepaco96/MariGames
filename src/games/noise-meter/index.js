import NoiseMeter from './NoiseMeter.jsx';

// A classroom tool for the teacher rather than a game (`type: 'tool'`): Home shows it
// under "Teacher Tools"; it opens through the same `Component` pattern as the games.
export default {
  id: 'noise-meter',
  type: 'tool',
  title: 'Noise Meter',
  description: 'Check your classroom noise level',
  icon: '🚦',
  color: '#C5E1A5',
  Component: NoiseMeter,
};
