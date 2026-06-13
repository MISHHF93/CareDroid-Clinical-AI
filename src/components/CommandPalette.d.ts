import type { ComponentType } from 'react';

type CommandAction = {
  type: string;
  path?: string;
  patientId?: string;
  value?: string;
  calculatorId?: string;
};

declare const CommandPalette: ComponentType<{
  open: boolean;
  onClose: () => void;
  onExecute: (action: CommandAction) => void;
}>;

export default CommandPalette;
