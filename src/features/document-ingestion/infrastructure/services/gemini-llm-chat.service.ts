import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { LlmChatService, ChatMessage, ChatResponse } from '../../domain/services/llm-chat.service';

@Injectable()
export class GeminiLlmChatService extends LlmChatService {
  private readonly chatModel: ChatGoogleGenerativeAI;

  constructor(private readonly configService: ConfigService) {
    super();
    this.chatModel = new ChatGoogleGenerativeAI({
      apiKey: this.configService.get('GOOGLE_API_KEY'),
      model: this.configService.get('GEMINI_MODEL', 'gemini-2.5-flash'),
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
