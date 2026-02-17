/**
 * Mock utilities for OpenAI Responses API testing
 *
 * Provides utilities to mock the GPT-5.2 Responses API for unit and property tests
 * without requiring actual API calls.
 */

/**
 * Responses API request format
 */
export interface ResponsesAPIRequest {
    model: string;
    input: string;
    max_output_tokens: number;
    temperature?: number;
    reasoning?: {
        effort: 'none' | 'low' | 'medium' | 'high';
    };
}

/**
 * Responses API response format
 */
export interface ResponsesAPIResponse {
    id: string;
    object: 'response';
    created: number;
    model: string;
    output: string;
    usage: {
        input_tokens: number;
        output_tokens: number;
        reasoning_tokens?: number;
        total_tokens: number;
    };
}

/**
 * Error response format
 */
export interface ResponsesAPIErrorResponse {
    error: {
        type: string;
        message: string;
        code?: string;
    };
}

/**
 * Responses API Error Types
 */
export enum ResponsesAPIErrorType {
    RATE_LIMIT = 'rate_limit',
    INVALID_MODEL = 'invalid_model',
    CONTEXT_LENGTH_EXCEEDED = 'context_length_exceeded',
    NETWORK = 'network',
    AUTHENTICATION = 'authentication',
    UNKNOWN = 'unknown',
}

/**
 * Captured API call for verification
 */
export interface CapturedAPICall {
    endpoint: string;
    request: ResponsesAPIRequest;
    timestamp: number;
}

/**
 * Mock implementation of the Responses API client
 */
export class ResponsesAPIMock {
    private static capturedCalls: CapturedAPICall[] = [];
    private static mockResponse: ResponsesAPIResponse | null = null;
    private static errorConfig: { statusCode: number; type: string; message: string } | null = null;

    /**
     * Reset mock state
     */
    public static reset(): void {
        this.capturedCalls = [];
        this.mockResponse = null;
        this.errorConfig = null;
    }

    /**
     * Mock successful Responses API call
     *
     * @param output - The output text to return
     * @param usage - Optional usage statistics
     */
    public static mockSuccess(
        output: string,
        usage?: {
            input_tokens: number;
            output_tokens: number;
            reasoning_tokens?: number;
        },
    ): void {
        this.errorConfig = null;
        this.mockResponse = {
            id: `response_${Date.now()}`,
            object: 'response',
            created: Math.floor(Date.now() / 1000),
            model: 'gpt-5.2',
            output,
            usage: {
                input_tokens: usage?.input_tokens ?? 100,
                output_tokens: usage?.output_tokens ?? 50,
                reasoning_tokens: usage?.reasoning_tokens,
                total_tokens:
                    (usage?.input_tokens ?? 100) +
                    (usage?.output_tokens ?? 50) +
                    (usage?.reasoning_tokens ?? 0),
            },
        };
    }

    /**
     * Mock Responses API error
     *
     * @param statusCode - HTTP status code
     * @param errorType - Error type
     * @param message - Error message
     */
    public static mockError(statusCode: number, errorType: string, message: string): void {
        this.mockResponse = null;
        this.errorConfig = { statusCode, type: errorType, message };
    }

    /**
     * Simulate making a Responses API call
     *
     * @param request - The API request
     * @returns The mocked response or throws error
     */
    public static async call(request: ResponsesAPIRequest): Promise<ResponsesAPIResponse> {
        // Capture the call for verification
        this.capturedCalls.push({
            endpoint: '/v1/responses',
            request,
            timestamp: Date.now(),
        });

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Return error if mocked
        if (this.errorConfig) {
            const error = new Error(this.errorConfig.message) as any;
            error.status = this.errorConfig.statusCode;
            error.type = this.errorConfig.type;
            throw error;
        }

        // Return success response
        if (this.mockResponse) {
            return { ...this.mockResponse };
        }

        // Default response
        return {
            id: `response_${Date.now()}`,
            object: 'response',
            created: Math.floor(Date.now() / 1000),
            model: 'gpt-5.2',
            output: 'Default mock response',
            usage: {
                input_tokens: 100,
                output_tokens: 20,
                total_tokens: 120,
            },
        };
    }

    /**
     * Get all captured API calls
     */
    public static getCapturedCalls(): CapturedAPICall[] {
        return [...this.capturedCalls];
    }

    /**
     * Get the last captured call
     */
    public static getLastCall(): CapturedAPICall | undefined {
        return this.capturedCalls[this.capturedCalls.length - 1];
    }

    /**
     * Verify Responses API was called with correct parameters
     *
     * @param expectedParams - Expected request parameters (partial match)
     * @returns True if a matching call was found
     */
    public static verifyCall(expectedParams: Partial<ResponsesAPIRequest>): boolean {
        return this.capturedCalls.some((call) => {
            const request = call.request;

            if (expectedParams.model !== undefined && request.model !== expectedParams.model) {
                return false;
            }
            if (
                expectedParams.input !== undefined &&
                !request.input.includes(expectedParams.input)
            ) {
                return false;
            }
            if (
                expectedParams.max_output_tokens !== undefined &&
                request.max_output_tokens !== expectedParams.max_output_tokens
            ) {
                return false;
            }
            if (expectedParams.reasoning !== undefined) {
                if (
                    !request.reasoning ||
                    request.reasoning.effort !== expectedParams.reasoning.effort
                ) {
                    return false;
                }
            }

            return true;
        });
    }

    /**
     * Verify all calls used the correct model
     */
    public static verifyAllCallsUseModel(model: string): boolean {
        return this.capturedCalls.every((call) => call.request.model === model);
    }

    /**
     * Verify all calls used the correct endpoint
     */
    public static verifyAllCallsUseEndpoint(endpoint: string): boolean {
        return this.capturedCalls.every((call) => call.endpoint === endpoint);
    }

    /**
     * Verify all calls include reasoning effort
     */
    public static verifyAllCallsHaveReasoningEffort(effort: string): boolean {
        return this.capturedCalls.every((call) => call.request.reasoning?.effort === effort);
    }

    /**
     * Get call count
     */
    public static getCallCount(): number {
        return this.capturedCalls.length;
    }
}

/**
 * Helper to classify error type from HTTP status code
 */
export function classifyError(statusCode: number, errorMessage: string): ResponsesAPIErrorType {
    switch (statusCode) {
        case 401:
            return ResponsesAPIErrorType.AUTHENTICATION;
        case 429:
            return ResponsesAPIErrorType.RATE_LIMIT;
        case 404:
            if (errorMessage.toLowerCase().includes('model')) {
                return ResponsesAPIErrorType.INVALID_MODEL;
            }
            return ResponsesAPIErrorType.UNKNOWN;
        case 400:
            if (
                errorMessage.toLowerCase().includes('context') ||
                errorMessage.toLowerCase().includes('token')
            ) {
                return ResponsesAPIErrorType.CONTEXT_LENGTH_EXCEEDED;
            }
            return ResponsesAPIErrorType.UNKNOWN;
        default:
            if (
                errorMessage.toLowerCase().includes('network') ||
                errorMessage.toLowerCase().includes('connection')
            ) {
                return ResponsesAPIErrorType.NETWORK;
            }
            return ResponsesAPIErrorType.UNKNOWN;
    }
}

/**
 * Generate user-friendly error message from API error
 */
export function getUserFriendlyMessage(
    errorType: ResponsesAPIErrorType,
    retryAfter?: number,
): string {
    switch (errorType) {
        case ResponsesAPIErrorType.RATE_LIMIT:
            return retryAfter
                ? `OpenAI API rate limit reached. Please try again in ${retryAfter} seconds.`
                : 'OpenAI API rate limit reached. Please try again later.';
        case ResponsesAPIErrorType.INVALID_MODEL:
            return 'GPT-5.2 model not accessible. Please check your API key has access to GPT-5.2.';
        case ResponsesAPIErrorType.CONTEXT_LENGTH_EXCEEDED:
            return 'Input too large for processing. Content has been truncated.';
        case ResponsesAPIErrorType.NETWORK:
            return 'Network error occurred. Please check your connection and try again.';
        case ResponsesAPIErrorType.AUTHENTICATION:
            return 'Invalid OpenAI API key. Please update your API key in settings.';
        default:
            return 'An unexpected error occurred. Please try again.';
    }
}
