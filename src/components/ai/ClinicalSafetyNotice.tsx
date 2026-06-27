import { ShieldCheck } from 'lucide-react';
import { CLINICAL_DECISION_SUPPORT_DISCLAIMER } from '../../lib/ai/careDroidAI';
import './AIComponents.css';

type ClinicalSafetyNoticeProps = {
  message?: string;
  reviewRequired?: boolean;
};

export function ClinicalSafetyNotice({
  message = CLINICAL_DECISION_SUPPORT_DISCLAIMER,
  reviewRequired = true,
}: ClinicalSafetyNoticeProps) {
  return (
    <div className="cd-ai-safety" role="note" aria-label="AI safety review notice">
      <ShieldCheck aria-hidden="true" size={16} />
      <span>{reviewRequired ? message : 'Review AI output before using it in workflow decisions.'}</span>
    </div>
  );
}
