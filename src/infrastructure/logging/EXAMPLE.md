# Logger Usage Examples

## Basic Usage

```typescript
import { Logger, LogLevel } from '../infrastructure/logging';

// Get the singleton instance
const logger = Logger.getInstance();

// Log at different levels
logger.debug('Detailed debug information');
logger.info('Application started successfully');
logger.warning('Configuration value missing, using default');
logger.error('Failed to connect to API', error);
```

## Setting Log Level

```typescript
import { Logger, LogLevel } from '../infrastructure/logging';

const logger = Logger.getInstance();

// Set to Debug to see all messages
logger.setLogLevel(LogLevel.Debug);

// Set to Error to only see errors
logger.setLogLevel(LogLevel.Error);
```

## In Extension Activation

```typescript
import * as vscode from 'vscode';
import { Logger, LogLevel } from './infrastructure/logging';

export async function activate(context: vscode.ExtensionContext) {
    const logger = Logger.getInstance();
    
    // Set log level based on configuration or environment
    const isDevelopment = process.env.NODE_ENV === 'development';
    logger.setLogLevel(isDevelopment ? LogLevel.Debug : LogLevel.Info);
    
    logger.info('Extension activating...');
    
    // Register dispose
    context.subscriptions.push({
        dispose: () => logger.dispose()
    });
    
    logger.info('Extension activated successfully');
}
```

## In Commands

```typescript
import { Logger } from '../infrastructure/logging';

export async function generateCommit() {
    const logger = Logger.getInstance();
    
    logger.info('Starting commit generation');
    
    try {
        // Command logic here
        logger.debug('Processing git diff...');
        
        // More logic
        logger.info('Commit message generated successfully');
    } catch (error) {
        logger.error('Failed to generate commit message', error);
        throw error;
    }
}
```

## In Services

```typescript
import { Logger } from '../infrastructure/logging';

export class OpenAIService {
    private logger = Logger.getInstance();
    
    async generateMessage(prompt: string): Promise<string> {
        this.logger.debug('Calling OpenAI API', { promptLength: prompt.length });
        
        try {
            const response = await this.callAPI(prompt);
            this.logger.info('OpenAI API call successful');
            return response;
        } catch (error) {
            this.logger.error('OpenAI API call failed', error);
            throw error;
        }
    }
}
```

## Viewing Logs

Users can view logs in VS Code by:
1. Opening the Output panel (View > Output)
2. Selecting "otak-committer" from the dropdown

Or programmatically:
```typescript
logger.show(); // Opens the output channel
```
