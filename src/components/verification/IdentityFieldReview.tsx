import { FIELD_STATUS_LABEL, fieldDecisionTone } from '../../utils/verificationWorkflow';
import './IdentityFieldReview.css';

export default function IdentityFieldReview({
  fields = [] as any[],
  fieldDecisions = {} as any,
  canVerify = true,
  onFieldDecision,
  onApproveMatching,
  bulkApprovableCount = 0,
}) {
  return (
    <section className="identity-field-review" aria-labelledby="identity-field-review-title">
      <header>
        <h3 id="identity-field-review-title">Identity manual review</h3>
        <p>Approve, reject, or mark edited before finalizing intake.</p>
        {bulkApprovableCount > 0 ? (
          <button
            type="button"
            className="identity-field-review__bulk"
            disabled={!canVerify}
            onClick={onApproveMatching}
          >
            Approve {bulkApprovableCount} matching field{bulkApprovableCount === 1 ? '' : 's'}
          </button>
        ) : null}
      </header>

      <div className="identity-field-review__list">
        {fields.map((field) => {
          const tone = fieldDecisionTone(fieldDecisions[field.field] || field.status);
          return (
            <article key={field.field} className={`identity-field-review__field identity-field-review__field--${tone}`}>
              <div>
                <strong>{field.field}</strong>
                <span>{field.source}</span>
              </div>
              <dl>
                <div>
                  <dt>Extracted</dt>
                  <dd>{field.extracted || 'Missing'}</dd>
                </div>
                <div>
                  <dt>Existing</dt>
                  <dd>{field.existing || 'No existing value'}</dd>
                </div>
              </dl>
              <footer>
                <span>{FIELD_STATUS_LABEL[tone]}</span>
                <button type="button" onClick={() => onFieldDecision(field.field, 'approved')} disabled={!canVerify}>
                  Approve
                </button>
                <button type="button" onClick={() => onFieldDecision(field.field, 'edited')} disabled={!canVerify}>
                  Mark edited
                </button>
                <button type="button" onClick={() => onFieldDecision(field.field, 'rejected')} disabled={!canVerify}>
                  Reject
                </button>
              </footer>
            </article>
          );
        })}
      </div>
    </section>
  );
}
