import NoiseMeter from './NoiseMeter.jsx';

// A classroom tool for the teacher rather than a game, but it uses the same
// `Component` pattern so Home and GamePage handle it like any other card.
export default {
  id: 'noise-meter',
  title: 'Noise Meter',
  icon: '🚦',
  color: '#C5E1A5',
  Component: NoiseMeter,
};
