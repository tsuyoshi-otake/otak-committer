import * as vscode from 'vscode';
import { BaseServiceFactory } from './base';
import { ServiceConfig } from '../types';
import { OpenAIService } from './openaiService';
import { initializeOpenAIService } from './openaiInitialize';
import { invalidateValidatedApiKey } from './openaiKeyValidationCache';

/**
 * Factory for creating OpenAI service instances
 *
 * Handles service initialization and API key retrieval from storage.
 */
export class OpenAIServiceFactory extends BaseServiceFactory<OpenAIService> {
    async create(config?: Partial<ServiceConfig>): Promise<OpenAIService> {
        return new OpenAIService(config);
    }

    static invalidateValidatedKey(apiKey: string): void {
        invalidateValidatedApiKey(apiKey);
    }

    static async initialize(
        config?: Partial<ServiceConfig>,
        context?: vscode.ExtensionContext,
    ): Promise<OpenAIService | undefined> {
        return initializeOpenAIService(config, context, async (cfg) => new OpenAIService(cfg));
    }
}
