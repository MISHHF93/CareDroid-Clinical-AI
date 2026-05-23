import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Patients from './Patients';
import Operations from './Operations';
import {
  mockConversationValue,
  mockToolPreferencesValue,
} from '../test/testRenderUtils';
import { applyRegistryToolLaunch } from '../navigation/registryToolLaunch';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../contexts/ConversationContext', () => ({
  useConversation: () => mockConversationValue,
}));

vi.mock('../contexts/ToolPreferencesContext', () => ({
  useToolPreferences: () => mockToolPreferencesValue,
}));

vi.mock('../navigation/registryToolLaunch', () => ({
  applyRegistryToolLaunch: vi.fn(),
}));

vi.mock('./OperatingWorkspace.css', () => ({}));

describe('operating workspace launch harness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('routes patient workflow cards through the registry launch resolver', () => {
    render(<Patients />);

    fireEvent.click(screen.getByRole('button', { name: /summarize active case/i }));

    expect(applyRegistryToolLaunch).toHaveBeenCalledWith(
      'patient-summary-ai',
      expect.objectContaining({
        navigate: navigateMock,
        addMessage: mockConversationValue.addMessage,
        selectTool: mockConversationValue.selectTool,
        setActiveTool: mockConversationValue.setActiveTool,
        recordToolAccess: mockToolPreferencesValue.recordToolAccess,
      })
    );
  });

  it('routes fleet operation cards through the registry launch resolver', () => {
    render(<Operations />);

    fireEvent.click(screen.getByRole('button', { name: /fleet command/i }));

    expect(applyRegistryToolLaunch).toHaveBeenCalledWith(
      'fleet-command',
      expect.objectContaining({
        navigate: navigateMock,
        addMessage: mockConversationValue.addMessage,
        selectTool: mockConversationValue.selectTool,
        setActiveTool: mockConversationValue.setActiveTool,
        recordToolAccess: mockToolPreferencesValue.recordToolAccess,
      })
    );
  });

  it('keeps non-tool operational cards on explicit workspace routes', () => {
    render(<Operations />);

    fireEvent.click(screen.getByRole('button', { name: /clinical alerts/i }));

    expect(applyRegistryToolLaunch).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith('/clinical/alerts');
  });
});
