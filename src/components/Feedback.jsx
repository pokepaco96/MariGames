// Short positive message floating over the game.
export default function Feedback({ message }) {
  if (!message) return null;
  return (
    <div key={message.id} className={`feedback feedback-${message.type}`} role="status">
      {message.type === 'success' && <span className="feedback-star" aria-hidden="true">⭐</span>}
      {message.text}
    </div>
  );
}
