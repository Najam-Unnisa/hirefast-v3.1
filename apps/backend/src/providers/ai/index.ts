import type {
  AICompletionRequest,
  AICompletionResponse,
  IAIProvider,
} from './ai-provider.interface';
import { OpenAIProvider } from './openai.provider';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';

/**
 * AIService orchestrates provider selection.
 * Does not contain prompts or evaluation business logic.
 */
export class AIService {
  constructor(private readonly provider: IAIProvider = new OpenAIProvider()) {}

  getProviderName(): string {
    return this.provider.name;
  }

  isReady(): boolean {
    return this.provider.isConfigured();
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    if (!this.provider.isConfigured()) {
      throw new AppError('AI provider is not configured.', 503);
    }

    logger.info('AI completion requested', {
      provider: this.provider.name,
      model: request.model,
    });

    return this.provider.complete(request);
  }
}

export const aiService = new AIService();

export * from './ai-provider.interface';
export * from './openai.provider';
