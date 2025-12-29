export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  content: string;
}

export abstract class LlmChatService {
  abstract invoke(messages: ChatMessage[]): Promise<ChatResponse>;
  abstract stream(messages: ChatMessage[]): AsyncIterable<ChatResponse>;
}
