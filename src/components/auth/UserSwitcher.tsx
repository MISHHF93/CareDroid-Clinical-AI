export type UserSwitcherProps = {
  variant?: 'list' | 'compact' | 'select';
  className?: string;
  onSwitch?: (userId: string) => void;
};

export { default as UserSwitcher } from './DemoUserSwitcher';
export { default } from './DemoUserSwitcher';
