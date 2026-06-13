import type { ComponentType } from 'react';

declare const ReassessmentDrawer: ComponentType<{
  open: boolean;
  count: number;
  onClose: () => void;
}>;

export default ReassessmentDrawer;
