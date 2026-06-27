import './AIComponents.css';

type AIReasoningListProps = {
  reasoning: string[];
  defaultOpen?: boolean;
};

export function AIReasoningList({ reasoning, defaultOpen = false }: AIReasoningListProps) {
  const items = reasoning.filter(Boolean);
  if (!items.length) return null;

  return (
    <details className="cd-ai-reasoning" open={defaultOpen}>
      <summary>Reasoning</summary>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </details>
  );
}
