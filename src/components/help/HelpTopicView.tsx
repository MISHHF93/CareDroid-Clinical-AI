import { Link } from 'react-router-dom';
import type { ManualTopic } from '../../config/userManual.config';
import { getManualTopicById } from '../../config/userManual.config';

type HelpTopicViewProps = {
  topic: ManualTopic;
  onSelectTopic?: (topicId: string) => void;
  compact?: boolean;
};

export default function HelpTopicView({ topic, onSelectTopic, compact = false }: HelpTopicViewProps) {
  return (
    <article className="help-topic">
      <header className="help-topic__header">
        <p className="help-topic__eyebrow">{topic.eyebrow}</p>
        <h3 className="help-topic__title">{topic.title}</h3>
        <p className="help-topic__purpose">{topic.purpose}</p>
        {!compact ? (
          <p className="help-topic__when">
            <strong>When to use:</strong> {topic.whenToUse}
          </p>
        ) : null}
        {topic.notFor ? (
          <p className="help-topic__not-for">
            <strong>Not for:</strong> {topic.notFor}
          </p>
        ) : null}
      </header>

      <section className="help-topic__section">
        <h4>Procedure</h4>
        <ol className="help-topic__steps">
          {topic.procedure.map((step) => (
            <li key={step.order}>
              <strong>{step.action}</strong>
              {step.detail ? <span> — {step.detail}</span> : null}
            </li>
          ))}
        </ol>
      </section>

      {topic.queues?.length ? (
        <section className="help-topic__section">
          <h4>Queues</h4>
          <dl className="help-topic__queues">
            {topic.queues.map((q) => (
              <div key={q.name} className="help-topic__queue-row">
                <dt>{q.name}</dt>
                <dd>{q.meaning}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {topic.tips?.length ? (
        <section className="help-topic__section">
          <h4>Tips</h4>
          <ul className="help-topic__tips">
            {topic.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="help-topic__footer">
        <Link to={topic.route} className="help-topic__route-link">
          Go to screen →
        </Link>
        {topic.relatedTopicIds?.length && onSelectTopic ? (
          <div className="help-topic__related">
            <span>Related:</span>
            {topic.relatedTopicIds.map((id) => {
              const related = getManualTopicById(id);
              if (!related) return null;
              return (
                <button key={id} type="button" className="help-topic__related-btn" onClick={() => onSelectTopic(id)}>
                  {related.title}
                </button>
              );
            })}
          </div>
        ) : null}
      </footer>
    </article>
  );
}