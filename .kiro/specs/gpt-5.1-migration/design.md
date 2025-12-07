# Design Document

## Overview

This design migrates the Otak Committer extension from GPT-4.1 with Chat Completions API to GPT-5.1 with Responses API. The migration unifies token limits to 200K across all features (commit messages, pull requests, and issues) and leverages GPT-5.1's improved capabilities with configurable reasoning effort. The Responses API provides better handling of long-form inputs and more predictable token management compared to the Chat Completions API.

## Architecture

The migration maintains the existing service architecture with modifications to the OpenAI service layer:

### Current Architecture
```
Commands (Commit/PR/Issue)
    ↓
OpenAI Service (Chat Completions API)
    ↓
Prompt Service
    ↓
GPT-4.1 Model
```

### New Architecture
```
Commands (Commit/PR/Issue)
    ↓
OpenAI Service (Responses API)
    ↓
Prompt Service
    ↓
GPT-5.1 Model (with reasoning.effort)
```

### Key Changes

1. **API Endpoint**: `/v1/chat/completions` → `/v1/responses`
2. **Model**: `gpt-4.1` → `gpt-5.1`
3. **Request Format**: Messages array → Single input string
4. **Token Limits**: 200K/100K → Unified 200K
5. **Reasoning Control**: None → `reasoning.effort: "low"`

## Components and Interfaces

### Enhanced OpenAI Service

```typescript
export class OpenAIService extends BaseService {
    protected openai: OpenAI;
    private promptService: PromptService;
    
    // Token limits
    private static readonly MAX_INPUT_TOKENS = 200 * 1000;  // 200K unified limit
    private static readonly CHARS_PER_TOKEN = 4;
    
    // Output token allocations
    private static readonly OUTPUT_TOKENS = {
        COMMIT_MESSAGE: 2000,
        PR_TITLE: 200,
        PR_BODY: 4000,
        ISSUE: 8000
    };
    
    // Reasoning effort setting
    private static readonly REASONING_EFFORT = 'low';
    
    /**
     * Generate content using Responses API
     */
    private async generateWithResponsesAPI(params: {
        input: string;
        maxOutputTokens: number;
        temperature?: number;
    }): Promise<string | undefined>;
    
    /**
     * Generate commit message using GPT-5.1
     */
    async generateCommitMessage(
        diff: string,
        language: string,
        messageStyle: MessageStyle | string,
        template?: TemplateInfo
    ): Promise<string | undefined>;
    
    /**
     * Generate PR content using GPT-5.1
     */
    async generatePRContent(
        diff: PullRequestDiff,
        language: string,
        template?: TemplateInfo
    ): Promise<{ title: string; body: string } | undefined>;
}
```

### Responses API Request Format

```typescript
interface ResponsesAPIRequest {
    model: 'gpt-5.1';
    input: string;  // Single prompt string (not messages array)
    max_output_tokens: number;
    temperature?: number;
    reasoning?: {
        effort: 'none' | 'low' | 'medium' | 'high';
    };
}

interface ResponsesAPIResponse {
    id: string;
    object: 'response';
    created: number;
    model: string;
    output: string;  // Direct output string
    usage: {
        input_tokens: number;
        output_tokens: number;
        reasoning_tokens?: number;
        total_tokens: number;
    };
}
```

### Token Management

```typescript
class TokenManager {
    private static readonly MAX_INPUT_TOKENS = 200 * 1000;
    private static readonly CHARS_PER_TOKEN = 4;
    private static readonly CONTEXT_LIMIT = 400 * 1000;  // GPT-5.1 limit
    
    /**
     * Estimate token count from text
     */
    static estimateTokens(text: string): number {
        return Math.ceil(text.length / this.CHARS_PER_TOKEN);
    }
    
    /**
     * Truncate input to fit within token limit
     */
    static truncateInput(input: string, maxTokens: number): string {
        const estimatedTokens = this.estimateTokens(input);
        if (estimatedTokens <= maxTokens) {
            return input;
        }
        
        const maxChars = maxTokens * this.CHARS_PER_TOKEN;
        return input.substring(0, maxChars);
    }
    
    /**
     * Validate token allocation
     */
    static validateAllocation(inputTokens: number, outputTokens: number): boolean {
        // Ensure input + output + buffer for reasoning tokens < 400K
        const buffer = 10000;  // Reserve for reasoning tokens
        return (inputTokens + outputTokens + buffer) <= this.CONTEXT_LIMIT;
    }
}
```

## Data Models

### Configuration

```typescript
interface OpenAIConfig extends ServiceConfig {
    openaiApiKey: string;
    model: 'gpt-5.1';
    maxInputTokens: number;
    reasoningEffort: 'none' | 'low' | 'medium' | 'high';
    temperature: number;
}
```

### Error Types

```typescript
interface ResponsesAPIError {
    type: 'rate_limit' | 'invalid_model' | 'context_length_exceeded' | 'network' | 'unknown';
    message: string;
    statusCode?: number;
    retryAfter?: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After analyzing all acceptance criteria, the following redundancies were identified and consolidated:
- Requirements 1.1, 1.2, 1.3 all verify GPT-5.1 + Responses API usage → Combined into Property 1
- Requirements 2.1, 2.2, 2.3 all verify 200K input support → Combined into Property 2
- Requirements 3.1, 3.2, 3.3 all verify reasoning effort setting → Combined into Property 3
- Requirements 5.2, 5.3, 5.4, 5.5 all verify configuration preservation → Combined into Property 5

Property 1: API endpoint and model consistency
*For any* AI generation request (commit message, PR, or issue), the system should use the `/v1/responses` endpoint with the `gpt-5.1` model
**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

Property 2: 200K token input support
*For any* input (diff or file content) up to 200,000 tokens, the system should accept and process the input without errors
**Validates: Requirements 2.1, 2.2, 2.3**

Property 3: Input truncation with warning
*For any* input exceeding 200,000 tokens, the system should truncate the input to 200K tokens and display a warning message to the user
**Validates: Requirements 2.4**

Property 4: Token estimation consistency
*For any* text input, calculating tokens using the 4 characters per token ratio should produce consistent results
**Validates: Requirements 2.5**

Property 5: Reasoning effort configuration
*For any* AI generation request, the system should include `reasoning.effort: "low"` in the API request parameters
**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

Property 6: Error logging completeness
*For any* failed Responses API call, the system should log the error with full context including request parameters, error type, and stack trace
**Validates: Requirements 4.1**

Property 7: User-friendly error messages
*For any* failed Responses API call, the system should display a user-friendly error message that explains the issue without exposing technical details
**Validates: Requirements 4.2**

Property 8: Configuration preservation
*For any* existing user configuration (temperature, language, emoji, custom messages), the system should apply these settings to Responses API calls after migration
**Validates: Requirements 5.2, 5.3, 5.4, 5.5**

Property 9: Commit message output allocation
*For any* commit message generation request, the system should allocate exactly 2,000 output tokens in the API request
**Validates: Requirements 6.1**

Property 10: PR title output allocation
*For any* pull request title generation request, the system should allocate exactly 200 output tokens in the API request
**Validates: Requirements 6.2**

Property 11: PR body output allocation
*For any* pull request body generation request, the system should allocate exactly 4,000 output tokens in the API request
**Validates: Requirements 6.3**

Property 12: Issue output allocation
*For any* GitHub issue generation request, the system should allocate exactly 8,000 output tokens in the API request
**Validates: Requirements 6.4**

Property 13: Token budget invariant
*For any* API request, the sum of input tokens, output tokens, and a 10,000 token buffer for reasoning should not exceed 400,000 tokens
**Validates: Requirements 6.5**

## Error Handling

### Error Classification

```typescript
enum ResponsesAPIErrorType {
    RATE_LIMIT = 'rate_limit',
    INVALID_MODEL = 'invalid_model',
    CONTEXT_LENGTH_EXCEEDED = 'context_length_exceeded',
    NETWORK = 'network',
    AUTHENTICATION = 'authentication',
    UNKNOWN = 'unknown'
}
```

### Error Handling Strategy

1. **Rate Limit Errors (429)**
   - Log: Full error details with retry-after header
   - User Message: "OpenAI API rate limit reached. Please try again in X seconds."
   - Action: Display retry-after time if available

2. **Invalid Model Errors (404)**
   - Log: API key permissions and model name
   - User Message: "GPT-5.1 model not accessible. Please check your API key has access to GPT-5.1."
   - Action: Suggest checking OpenAI account tier

3. **Context Length Exceeded (400)**
   - Log: Input token count and limit
   - User Message: "Input too large for processing. Content has been truncated."
   - Action: Automatic truncation already applied

4. **Network Errors**
   - Log: Network error details and request URL
   - User Message: "Network error occurred. Please check your connection and try again."
   - Action: Suggest retry

5. **Authentication Errors (401)**
   - Log: API key validation failure
   - User Message: "Invalid OpenAI API key. Please update your API key in settings."
   - Action: Prompt for new API key

### Error Recovery

```typescript
class ErrorRecovery {
    /**
     * Attempt to recover from API errors
     */
    static async handleAPIError(error: ResponsesAPIError): Promise<void> {
        switch (error.type) {
            case ResponsesAPIErrorType.RATE_LIMIT:
                await this.handleRateLimit(error);
                break;
            case ResponsesAPIErrorType.INVALID_MODEL:
                await this.handleInvalidModel(error);
                break;
            case ResponsesAPIErrorType.CONTEXT_LENGTH_EXCEEDED:
                await this.handleContextExceeded(error);
                break;
            case ResponsesAPIErrorType.NETWORK:
                await this.handleNetworkError(error);
                break;
            case ResponsesAPIErrorType.AUTHENTICATION:
                await this.handleAuthError(error);
                break;
            default:
                await this.handleUnknownError(error);
        }
    }
}
```

## Testing Strategy

### Test Environment Setup

Tests are organized into three categories based on API key requirements:

1. **Unit Tests & Property Tests**: Use mocked API responses, no API key required
2. **Integration Tests**: Use real API calls, require API key managed by dotenvx

**Environment Configuration with dotenvx:**

dotenvx provides encrypted secret management for secure API key storage:

```bash
# Install dotenvx globally or as dev dependency
npm install -D @dotenvx/dotenvx

# Set encrypted API key
npx dotenvx set OPENAI_API_KEY "sk-..." -f .env.local

# Run tests with dotenvx
npx dotenvx run -- npm test

# Or use npm script
npm run test:integration
```

**Benefits of dotenvx:**
- Encrypted secrets at rest
- Safe to commit `.env.local` (encrypted)
- Automatic decryption during test execution
- Better security than plain text `.env` files

The test suite will:
- Skip integration tests if `OPENAI_API_KEY` is not set
- Run all unit and property tests without API key
- Provide clear messages when integration tests are skipped

### Unit Testing (No API Key Required)

Unit tests will verify specific behaviors and edge cases using mocked API responses:

1. **Token Management**
   - Test token estimation with various text lengths
   - Test truncation at exactly 200K tokens
   - Test truncation with multi-byte characters (Japanese, emoji)

2. **API Request Construction (Mocked)**
   - Mock Responses API endpoint
   - Verify request format (model, input, max_output_tokens, reasoning)
   - Verify parameter inclusion for different request types
   - Test prompt construction with templates

3. **Error Handling (Mocked)**
   - Mock different HTTP status codes (429, 404, 400, 401, 500)
   - Test error classification for each status code
   - Test user message generation for each error type
   - Test logging includes required context

4. **Configuration Migration**
   - Test reading existing settings
   - Test applying settings to new API format
   - Test default values when settings are missing

### Property-Based Testing (No API Key Required)

Property-based tests will verify universal properties across all inputs using **fast-check** library with mocked API responses:

1. **API Consistency Property** (Property 1)
   - Generate random request types (commit/PR/issue)
   - Verify all use `/v1/responses` endpoint and `gpt-5.1` model
   - Run 100 iterations

2. **Token Limit Property** (Property 2)
   - Generate random inputs up to 200K tokens
   - Verify all are accepted without truncation
   - Run 100 iterations

3. **Truncation Property** (Property 3)
   - Generate random inputs exceeding 200K tokens
   - Verify truncation occurs and warning is displayed
   - Run 100 iterations

4. **Token Estimation Property** (Property 4)
   - Generate random text strings
   - Verify token count = Math.ceil(length / 4)
   - Run 100 iterations

5. **Reasoning Effort Property** (Property 5)
   - Generate random request types
   - Verify all include `reasoning.effort: "low"`
   - Run 100 iterations

6. **Error Logging Property** (Property 6)
   - Generate random API errors
   - Verify all are logged with full context
   - Run 100 iterations

7. **Configuration Preservation Property** (Property 8)
   - Generate random configuration combinations
   - Verify all settings are applied to API requests
   - Run 100 iterations

8. **Output Allocation Properties** (Properties 9-12)
   - Generate random requests for each type
   - Verify correct output token allocation
   - Run 100 iterations per type

9. **Token Budget Invariant** (Property 13)
   - Generate random input sizes and request types
   - Verify input + output + buffer ≤ 400K
   - Run 100 iterations

### Integration Testing (Requires API Key managed by dotenvx)

Integration tests will verify end-to-end workflows with real GPT-5.1 API calls:

**Prerequisites:**
- Install dotenvx: `npm install -D @dotenvx/dotenvx`
- Set encrypted API key: `npx dotenvx set OPENAI_API_KEY "sk-..." -f .env.local`
- Ensure `.env.local` is in `.gitignore` (even though it's encrypted, keep it local)

**Test Execution:**
- Run with dotenvx: `npx dotenvx run -- npm test` or `npm run test:integration`
- Tests will check for `process.env.OPENAI_API_KEY`
- Skip integration tests if API key is not available
- Display clear message: "Skipping integration tests (OPENAI_API_KEY not set. Run: npx dotenvx set OPENAI_API_KEY 'sk-...' -f .env.local)"

**Integration Test Cases:**

1. **Commit Message Generation**
   - Test with real Git diffs of various sizes (small, medium, large)
   - Verify GPT-5.1 Responses API is called correctly
   - Verify response format matches expected structure
   - Verify output quality and relevance to diff

2. **Pull Request Generation**
   - Test with real branch diffs
   - Verify title and body generation with GPT-5.1
   - Verify markdown formatting is preserved
   - Verify content structure matches requirements

3. **Issue Generation**
   - Test with real file content
   - Verify issue structure (title and body)
   - Verify content relevance to input files
   - Verify GPT-5.1 handles large file sets (up to 200K tokens)

### Migration Testing (Mixed: Some require API Key)

Migration tests will verify backward compatibility:

1. **Settings Migration (No API Key Required)**
   - Test with existing VS Code settings
   - Verify all settings are preserved
   - Verify new defaults for new settings
   - Use mocked API calls

2. **API Key Migration (Requires API Key managed by dotenvx)**
   - Test with existing stored API keys
   - Verify keys work with GPT-5.1 via real API call
   - Verify validation process
   - Test error handling for invalid keys
   - Run with: `npx dotenvx run -- npm test`

### Mock Utilities

Create test utilities for mocking Responses API:

```typescript
// src/test/mocks/responsesAPI.mock.ts
export class ResponsesAPIMock {
    /**
     * Mock successful Responses API call
     */
    static mockSuccess(output: string, usage?: {
        input_tokens: number;
        output_tokens: number;
        reasoning_tokens?: number;
    }): void;
    
    /**
     * Mock Responses API error
     */
    static mockError(statusCode: number, errorType: string, message: string): void;
    
    /**
     * Verify Responses API was called with correct parameters
     */
    static verifyCall(expectedParams: {
        model: string;
        input: string;
        max_output_tokens: number;
        reasoning?: { effort: string };
    }): void;
}
```

## Implementation Notes

### Responses API Client

The OpenAI SDK may not have built-in support for the Responses API endpoint. Implementation options:

1. **Use OpenAI SDK with custom endpoint**
   ```typescript
   const openai = new OpenAI({
       apiKey: this.config.openaiApiKey,
       baseURL: 'https://api.openai.com/v1'
   });
   
   // Make custom request to /responses endpoint
   const response = await openai.post('/responses', {
       model: 'gpt-5.1',
       input: prompt,
       max_output_tokens: 2000,
       reasoning: { effort: 'low' }
   });
   ```

2. **Use direct HTTP requests**
   ```typescript
   const response = await fetch('https://api.openai.com/v1/responses', {
       method: 'POST',
       headers: {
           'Authorization': `Bearer ${apiKey}`,
           'Content-Type': 'application/json'
       },
       body: JSON.stringify({
           model: 'gpt-5.1',
           input: prompt,
           max_output_tokens: 2000,
           reasoning: { effort: 'low' }
       })
   });
   ```

### Prompt Format Changes

The Responses API uses a single `input` string instead of a messages array. Prompts need to be reformatted:

**Before (Chat Completions):**
```typescript
{
    messages: [
        { role: 'system', content: 'You are a helpful assistant' },
        { role: 'user', content: 'Generate a commit message for...' }
    ]
}
```

**After (Responses API):**
```typescript
{
    input: 'Generate a commit message for...'
}
```

System instructions should be incorporated into the prompt text itself.

### Configuration Updates

New VS Code settings to add:

```json
{
    "otakCommitter.reasoningEffort": {
        "type": "string",
        "enum": ["none", "low", "medium", "high"],
        "default": "low",
        "description": "GPT-5.1 reasoning effort level (affects response quality and latency)"
    },
    "otakCommitter.maxInputTokens": {
        "type": "number",
        "default": 200000,
        "description": "Maximum input tokens for AI processing (default: 200K)"
    }
}
```

## Migration Path

### Phase 1: Preparation
1. Update OpenAI SDK to latest version
2. Add Responses API client implementation
3. Add token management utilities
4. Update error handling for new error types

### Phase 2: Core Migration
1. Update OpenAI service to use Responses API
2. Update prompt service to generate single input strings
3. Update token limit constants
4. Add reasoning effort configuration

### Phase 3: Testing
1. Run unit tests
2. Run property-based tests
3. Run integration tests
4. Manual testing with real data

### Phase 4: Deployment
1. Update documentation
2. Add migration notes to changelog
3. Release as minor version update
4. Monitor for issues

## Performance Considerations

### Expected Improvements

1. **Latency**: GPT-5.1 with `reasoning.effort: "low"` should have similar or better latency than GPT-4.1
2. **Quality**: GPT-5.1 has improved understanding and generation quality
3. **Token Efficiency**: Unified 200K limit simplifies token management

### Monitoring

Track the following metrics:
- Average response time per feature
- Token usage per request
- Error rates by type
- User satisfaction (via feedback)

## Rollback Plan

If critical issues are discovered:

1. **Immediate Rollback**
   - Revert to GPT-4.1 with Chat Completions API
   - Keep token limits at current values
   - Deploy hotfix release

2. **Gradual Rollback**
   - Add feature flag to toggle between GPT-4.1 and GPT-5.1
   - Allow users to opt-in to GPT-5.1
   - Collect feedback before full migration

3. **Partial Rollback**
   - Keep GPT-5.1 for some features (e.g., commit messages)
   - Revert others to GPT-4.1 (e.g., issues)
   - Evaluate performance per feature
