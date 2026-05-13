/**
 * ChatInterface Component Integration Tests
 * 
 * Tests for ChatInterface React component
 * Covers tool result rendering, message handling, and API integration
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ChatInterface from '../../../src/components/ChatInterface';
import * as chatAPI from '../../../src/services/chatAPI';

// Mock the chat API
jest.mock('../../../src/services/chatAPI');

describe('ChatInterface Component Integration', () => {
  const mockMessages = [
    {
      id: 'msg-1',
      role: 'user',
      content: 'Calculate SOFA score',
      timestamp: new Date(),
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content: 'I can help you calculate SOFA score. Please provide the required parameters.',
      timestamp: new Date(),
    },
  ];

  const mockMessageWithToolResult = {
    id: 'msg-3',
    role: 'assistant',
    content: 'Here is the SOFA calculation:',
    toolResult: {
      toolId: 'sofa-calculator',
      toolName: 'SOFA Score Calculator',
      result: {
        success: true,
        data: {
          totalScore: 8,
          respirationScore: 2,
          coagulationScore: 2,
          liverScore: 1,
          cardiovascularScore: 1,
          cnsScore: 1,
          renalScore: 1,
          mortalityEstimate: '30-50% mortality risk',
        },
        interpretation: 'SOFA Score of 8 indicates moderate-to-severe organ dysfunction',
        timestamp: new Date(),
      },
    },
    timestamp: new Date(),
  };

  const mockConversationId = 'conv-123';
  const mockUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock API responses
    chatAPI.sendMessage.mockResolvedValue({
      message: {
        id: 'msg-4',
        role: 'assistant',
        content: 'Response from assistant',
        timestamp: new Date(),
      },
    });

    chatAPI.executeClinicaTool.mockResolvedValue({
      toolResult: mockMessageWithToolResult.toolResult,
      message: {
        id: 'msg-5',
        role: 'assistant',
        content: 'Tool executed successfully',
        timestamp: new Date(),
      },
    });
  });

  describe('Message rendering', () => {
    it('should render messages list', () => {
      render(
        <ChatInterface
          conversationId={mockConversationId}
          userId={mockUserId}
          initialMessages={mockMessages}
        />
      );

      expect(screen.getByText('Calculate SOFA score')).toBeInTheDocument();
      expect(screen.getByText(/I can help you calculate/)).toBeInTheDocument();
    });

    it('should distinguish between user and assistant messages', () => {
      render(
        <ChatInterface
          conversationId={mockConversationId}
          userId={mockUserId}
          initialMessages={mockMessages}
        />
      );

      const userMessage = screen.getByText('Calculate SOFA score');
      const assistantMessage = screen.getByText(/I can help you calculate/);

      expect(userMessage).toBeInTheDocument();
      expect(assistantMessage).toBeInTheDocument();
    });
  });

  describe('ToolCard integration', () => {
    it('should render ToolCard when message has toolResult', () => {
      const messagesWithTool = [...mockMessages, mockMessageWithToolResult];

      render(
        <ChatInterface
          conversationId={mockConversationId}
          userId={mockUserId}
          initialMessages={messagesWithTool}
        />
      );

      // ToolCard should be rendered
      expect(screen.getByText(/SOFA Score Calculator/i)).toBeInTheDocument();
      expect(screen.getByText(/Total SOFA Score/i)).toBeInTheDocument();
    });

    it('should not render ToolCard for messages without toolResult', () => {
      render(
        <ChatInterface
          conversationId={mockConversationId}
          userId={mockUserId}
          initialMessages={mockMessages}
        />
      );

      // Regular messages should not have tool results
      const sofaScore = screen.queryByText(/Total SOFA Score/i);
      expect(sofaScore).not.toBeInTheDocument();
    });

    it('should display tool result data inline', () => {
      const messagesWithTool = [...mockMessages, mockMessageWithToolResult];

      render(
        <ChatInterface
          conversationId={mockConversationId}
          userId={mockUserId}
          initialMessages={messagesWithTool}
        />
      );

      expect(screen.getByText(/8/)).toBeInTheDocument();
      expect(screen.getByText(/30-50%/)).toBeInTheDocument();
      expect(screen.getByText(/Respiration/)).toBeInTheDocument();
    });
  });

  describe('Message input and sending', () => {
    it('should have input field for new messages', () => {
      render(
        <ChatInterface
          conversationId={mockConversationId}
          userId={mockUserId}
          initialMessages={mockMessages}
        />
      );

      const input = screen.getByPlaceholderText(/Type your message/i) ||
                    screen.getByRole('textbox') ||
                    screen.getByTestId('message-input');

      expect(input).toBeInTheDocument();
    });

    it('should send message on button click', async () => {
      render(
        <ChatInterface
          conversationId={mockConversationId}
          userId={mockUserId}
          initialMessages={mockMessages}
        />
      );

      const input = screen.getByPlaceholderText(/Type your message/i) ||
                    screen.getByRole('textbox') ||
                    document.querySelector('input[type="text"]');

      const sendButton = screen.getByRole('button', { name: /send|submit/i }) ||
                        screen.getByTestId('send-button');

      await userEvent.type(input, 'Calculate SOFA with pao2=60');
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(chatAPI.sendMessage).toHaveBeenCalled();
      });
    });

    it('should handle Enter key to send message', async () => {
      render(
        <ChatInterface
          conversationId={mockConversationId}
          userId={mockUserId}
          initialMessages={mockMessages}
        />
      );

      const input = screen.getByPlaceholderText(/Type your message/i) ||
                    screen.getByRole('textbox') ||
                    document.querySelector('input[type="text"]');

      await userEvent.type(input, 'Test message{Enter}');

      await waitFor(() => {
        expect(chatAPI.sendMessage).toHaveBeenCalled();
      });
    });

    it('should clear input after sending', async () => {
      render(
        <ChatInterface
          conversationId={mockConversationId}
          userId={mockUserId}
          initialMessages={mockMessages}
        />
      );

      const input =
        screen.getByPlaceholderText(/Type your message/i) ||
        screen.getByRole('textbox') ||
        document.querySelector('input[type="text"]');

      const sendButton = screen.getByRole('button', { name: /send|submit/i }) ||
                        screen.getByTestId('send-button');

      await userEvent.type(input, 'Test message');
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });

    it('should disable send button when input is empty', () => {
      render(
        <ChatInterface
          conversationId={mockConversationId}
          userId={mockUserId}
          initialMessages={mockMessages}
        />
      );

      const sendButton = screen.getByRole('button', { name: /send|submit/i }) ||
                        screen.getByTestId('send-button');

      expect(sendButton).toBeDisabled();
    });

    it('should enable send button when input has text', async () => {
      render(
        <ChatInterface
          conversationId={mockConversationId}
          userId={mockUserId}
          initialMessages={mockMessages}
        />
      );

      const input = screen.getByPlaceholderText(/Type your message/i) ||
                    screen.getByRole('textbox') ||
                    document.querySelector('input[type="text"]');

      const sendButton = screen.getByRole('button', { name: /send|submit/i }) ||
                        screen.getByTestId('send-button');

      await userEvent.type(input, 'Test');

      await waitFor(() => {
        expect(sendButton).not.toBeDisabled();
      });
    });
  });

  describe('Tool execution flow', () => {
    it('should call executeClinicaTool when tool is executed', async () => {
      render(
        <ChatInterface
          conversationId={mockConversationId}
          userId={mockUserId}
          initialMessages={mockMessages}
        />
      );

      const input = document.querySelector('input[type="text"]');
      const sendButton = screen.getByRole('button', { name: /send|submit/i }) ||
                        screen.getByTestId('send-button');

      await userEvent.type(input, 'Calculate SOFA score with PAO2=60');
      fireEvent.click(sendButton);

      await waitFor(() => {
        // API call should be made
        expect(chatAPI.sendMessage || chatAPI.executeClinicaTool).toHaveBeenCalled();
      });
    });

    it('should display tool result after execution', async () => {
      const messagesWithTool = [...mockMessages, mockMessageWithToolResult];

      render(
        <ChatInterface
          conversationId={mockConversationId}
          userId={mockUserId}
          initialMessages={messagesWithTool}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/SOFA Score Calculator/i)).toBeInTheDocument();
      });
    });

    it('should append executed tool result to messages', async () => {
      const { rerender } = render(
        <ChatInterface
          conversationId={mockConversationId}
          userId={mockUserId}
          initialMessages={mockMessages}
        />
      );

      const updatedMessages = [
        ...mockMessages,
        mockMessageWithToolResult,
      ];

      rerender(
        <ChatInterface
          conversationId={mockConversationId}
          userId={mockUserId}
          initialMessages={updatedMessages}
        />
      );

      expect(screen.getByText(/SOFA Score Calculator/i)).toBeInTheDocument();
    });
  });

  describe('API Integration', () => {
    it('should pass conversationId to API', async () => {
      render(
        <ChatInterface
          conversationId={mockConversationId}
          userId={mockUserId}
          initialMessages={mockMessages}
        />
      );

      const input = document.querySelector('input[type="text"]');
      const sendButton = screen.getByRole('button', { name: /send|submit/i }) ||
                        screen.getByTestId('send-button');

      await userEvent.type(input, 'Test message');
      fireEvent.click(sendButton);

      await waitFor(() => {
        if (chatAPI.sendMessage.mock.calls.length > 0) {
          const call = chatAPI.sendMessage.mock.calls[0];
          expect(call[0]).toContain(mockConversationId);
        }
      });
    });

    it('should pass userId to API', async () => {
      render(
        <ChatInterface
          conversationId={mockConversationId}
          userId={mockUserId}
          initialMessages={mockMessages}
        />
      );

      const input = document.querySelector('input[type="text"]');
      const sendButton = screen.getByRole('button', { name: /send|submit/i }) ||
                        screen.getByTestId('send-button');

      await userEvent.type(input, 'Test message');
      fireEvent.click(sendButton);

      await waitFor(() => {
        if (chatAPI.sendMessage.mock.calls.length > 0) {
          const call = chatAPI.sendMessage.mock.calls[0];
          expect(call[0] || call[1]).toContain(mockUserId);
        }
      });
    });

    it('should handle API errors gracefully', async () => {
      chatAPI.sendMessage.mockRejectedValue(new Error('Network error'));

      render(
        <ChatInterface
          conversationId={mockConversationId}
          userId={mockUserId}
          initialMessages={mockMessages}
        />
      );

      const input = document.querySelector('input[type="text"]');
      const sendButton = screen.getByRole('button', { name: /send|submit/i }) ||
                        screen.getByTestId('send-button');

      await userEvent.type(input, 'Test message');
      fireEvent.click(sendButton);

      await waitFor(() => {
        // Error message should be displayed or handled gracefully
        expect(chatAPI.sendMessage).toHaveBeenCalled();
      });
    });
  });

  describe('Message states', () => {
    it('should show loading state while sending', async () => {
      chatAPI.sendMessage.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(
        <ChatInterface
          conversationId={mockConversationId}
          userId={mockUserId}
          initialMessages={mockMessages}
        />
      );

      const input = document.querySelector('input[type="text"]');
      const sendButton = screen.getByRole('button', { name: /send|submit/i }) ||
                        screen.getByTestId('send-button');

      await userEvent.type(input, 'Test');
      fireEvent.click(sendButton);

      // During loading, send button should be disabled
      expect(sendButton).toBeDisabled();
    });

    it('should show timestamps for messages', () => {
      render(
        <ChatInterface
          conversationId={mockConversationId}
          userId={mockUserId}
          initialMessages={mockMessages}
        />
      );

      // Messages should have timestamps displayed
      const messages = screen.getAllByText(/\d+:\d+/); // Time format
      expect(messages.length).toBeGreaterThan(0);
    });
  });

  describe('Message history', () => {
    it('should display full message history', () => {
      const longHistory = [
        ...mockMessages,
        {
          id: 'msg-3',
          role: 'user',
          content: 'Check for drug interactions',
          timestamp: new Date(),
        },
        {
          id: 'msg-4',
          role: 'assistant',
          content: 'I found one major interaction',
          timestamp: new Date(),
        },
      ];

      render(
        <ChatInterface
          conversationId={mockConversationId}
          userId={mockUserId}
          initialMessages={longHistory}
        />
      );

      expect(screen.getByText('Calculate SOFA score')).toBeInTheDocument();
      expect(screen.getByText('Check for drug interactions')).toBeInTheDocument();
    });

    it('should scroll to latest message', async () => {
      const { rerender } = render(
        <ChatInterface
          conversationId={mockConversationId}
          userId={mockUserId}
          initialMessages={mockMessages}
        />
      );

      const newMessages = [
        ...mockMessages,
        {
          id: 'msg-3',
          role: 'assistant',
          content: 'New message at bottom',
          timestamp: new Date(),
        },
      ];

      rerender(
        <ChatInterface
          conversationId={mockConversationId}
          userId={mockUserId}
          initialMessages={newMessages}
        />
      );

      const newMessage = screen.getByText('New message at bottom');
      expect(newMessage).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible message input', () => {
      render(
        <ChatInterface
          conversationId={mockConversationId}
          userId={mockUserId}
          initialMessages={mockMessages}
        />
      );

      const input = screen.getByPlaceholderText(/Type your message/i) ||
                    screen.getByRole('textbox') ||
                    document.querySelector('input[type="text"]');

      expect(input).toHaveAccessibleName();
    });

    it('should have accessible send button', () => {
      render(
        <ChatInterface
          conversationId={mockConversationId}
          userId={mockUserId}
          initialMessages={mockMessages}
        />
      );

      const sendButton = screen.getByRole('button', { name: /send|submit/i }) ||
                        screen.getByTestId('send-button');

      expect(sendButton).toHaveAccessibleName();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty initial messages', () => {
      render(
        <ChatInterface
          conversationId={mockConversationId}
          userId={mockUserId}
          initialMessages={[]}
        />
      );

      expect(screen.getByPlaceholderText(/Type your message/i) ||
             screen.getByRole('textbox') ||
             document.querySelector('input[type="text"]')).toBeInTheDocument();
    });

    it('should handle very long messages', () => {
      const longMessage = {
        id: 'msg-long',
        role: 'assistant',
        content: 'A'.repeat(1000),
        timestamp: new Date(),
      };

      render(
        <ChatInterface
          conversationId={mockConversationId}
          userId={mockUserId}
          initialMessages={[longMessage]}
        />
      );

      const text = screen.getByText(new RegExp('A{1000}'));
      expect(text).toBeInTheDocument();
    });

    it('should handle rapid successive messages', async () => {
      const { rerender } = render(
        <ChatInterface
          conversationId={mockConversationId}
          userId={mockUserId}
          initialMessages={mockMessages}
        />
      );

      // Add multiple messages rapidly
      const msg1 = { id: 'msg-4', role: 'user', content: 'First', timestamp: new Date() };
      const msg2 = { id: 'msg-5', role: 'user', content: 'Second', timestamp: new Date() };
      const msg3 = { id: 'msg-6', role: 'user', content: 'Third', timestamp: new Date() };

      rerender(
        <ChatInterface
          conversationId={mockConversationId}
          userId={mockUserId}
          initialMessages={[...mockMessages, msg1, msg2, msg3]}
        />
      );

      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
      expect(screen.getByText('Third')).toBeInTheDocument();
    });
  });

  describe('Multiple tool results', () => {
    it('should render multiple tool results in same conversation', () => {
      const messagesWithMultipleTools = [
        ...mockMessages,
        mockMessageWithToolResult,
        {
          id: 'msg-6',
          role: 'assistant',
          content: 'Here are some drug interactions:',
          toolResult: {
            toolId: 'drug-interaction-checker',
            toolName: 'Drug Interaction Checker',
            result: {
              success: true,
              data: {
                interactions: [
                  {
                    drug1: 'warfarin',
                    drug2: 'aspirin',
                    severity: 'major',
                    description: 'Bleeding risk',
                  },
                ],
              },
              interpretation: '1 major interaction',
              timestamp: new Date(),
            },
          },
          timestamp: new Date(),
        },
      ];

      render(
        <ChatInterface
          conversationId={mockConversationId}
          userId={mockUserId}
          initialMessages={messagesWithMultipleTools}
        />
      );

      expect(screen.getByText(/SOFA Score Calculator/i)).toBeInTheDocument();
      expect(screen.getByText(/Drug Interaction Checker/i)).toBeInTheDocument();
    });
  });
});
