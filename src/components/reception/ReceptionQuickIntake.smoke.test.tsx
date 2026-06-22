import { describe, expect, it } from 'vitest';
import ReceptionQuickIntake from './ReceptionQuickIntake';

describe('ReceptionQuickIntake module', () => {
  it('loads without runtime enum reference errors', () => {
    expect(ReceptionQuickIntake).toBeTypeOf('function');
  });
});
