import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { LlmChatService, ChatMessage, ChatResponse } from '../../domain/services/llm-chat.service';

@Injectable()
export class OllamaLlmChatService extends LlmChatService {
  private readonly chatModel: ChatOllama;

  constructor(private readonly configService: ConfigService) {
    super();
    this.chatModel = new ChatOllama({
      baseUrl: this.configService.get('OLLAMA_BASE_URL', 'http://localhost:11434'),
      model: this.configService.get('OLLAMA_CHAT_MODEL', 'llama3.2:3b'),
      temperature: 0.3,
    });
  }

  async invoke(messages: ChatMessage[]): Promise<ChatResponse> {
    const langchainMessages = messages.map((msg) =>
      msg.role === 'system' ? new SystemMessage(msg.content) : new HumanMessage(msg.content),
    );
    const response = await this.chatModel.invoke(langchainMessages);
    return { content: response.content as string };
  }

  async *stream(messages: ChatMessage[]): AsyncIterable<ChatResponse> {
    const langchainMessages = messages.map((msg) =>
      msg.role === 'system' ? new SystemMessage(msg.content) : new HumanMessage(msg.content),
    );
    const stream = await this.chatModel.stream(langchainMessages);
    for await (const chunk of stream) {
      yield { content: chunk.content as string };
    }
  }
}
