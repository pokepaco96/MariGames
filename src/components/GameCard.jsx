export default function GameCard({ game, onSelect }) {
  return (
    <button type="button" className="game-card" style={{ '--card': game.color }} onClick={() => onSelect(game.id)}>
      <span className="game-card-icon" aria-hidden="true">{game.icon}</span>
      <span className="game-card-title">{game.title}</span>
    </button>
  );
}
