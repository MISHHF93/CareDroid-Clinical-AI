// Compatibility wrapper for legacy imports. Parser helpers are consolidated in
// the canonical AI client.
export {
  buildToolResultContextMessages,
  getLatestToolContextMessages,
  injectToolResultsIntoMessages,
  parseAIResponse,
  removeCard,
  streamAIResponse,
  type ActionCard,
  type Citation,
  type DataBlock,
  type ParsedResponse,
  type StreamAIResponseHandlers,
  type ToolCallResult,
} from '../../src/lib/ai/client';
