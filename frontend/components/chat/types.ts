/**
 * Shared types for chat components.
 */

/** A suggestion prompt for the chat interface */
export interface ChatSuggestion {
  label: string;
  query: string;
}

/** A chat message with optional sources */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
}

/** A source citation from RAG retrieval */
export interface ChatSource {
  url: string;
  title?: string;
  content?: string;
  score?: number;
}
