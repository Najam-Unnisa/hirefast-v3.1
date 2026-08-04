import OpenAI from 'openai';
import { env } from '../../config/env';
import { AppError } from '../../utils/errors';
import type {
  AICompletionRequest,
  AICompletionResponse,
  IAIProvider,
} from './ai-provider.interface';

/**
 * OpenAI provider implementation.
 * Prompts and evaluation logic are intentionally not implemented here.
 */
export class OpenAIProvider implements IAIProvider {
  public readonly name = 'openai';
  private client: OpenAI | null = null;

  isConfigured(): boolean {
    return Boolean(env.openai.apiKey);
  }

  private getClient(): OpenAI {
    if (!this.isConfigured()) {
      throw new AppError('OpenAI provider is not configured.', 503);
    }
    if (!this.client) {
      this.client = new OpenAI({
        apiKey: env.openai.apiKey,
        organization: env.openai.orgId || undefined,
      });
    }
    return this.client;
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const client = this.getClient();
    const model = request.model ?? env.openai.model;

    const completion = await client.chat.completions.create({
      model,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens,
    });

    const content = completion.choices[0]?.message?.content ?? '';

    return {
      content,
      model,
      provider: this.name,
      usage: {
        promptTokens: completion.usage?.prompt_tokens,
        completionTokens: completion.usage?.completion_tokens,
        totalTokens: completion.usage?.total_tokens,
      },
    };
  }
}
