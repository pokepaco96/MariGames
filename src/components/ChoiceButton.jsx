export default function ChoiceButton({ option, variant = 'picture', state, onChoose }) {
  return (
    <button
      type="button"
      className={`choice choice-${variant} is-${state}`}
      aria-label={option.label}
      onClick={() => onChoose(option)}
    >
      {option.content}
    </button>
  );
}
