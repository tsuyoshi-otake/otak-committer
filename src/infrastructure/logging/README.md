# Logger Infrastructure

This module provides a unified logging interface for the otak-committer extension.

## Features

- **Singleton Pattern**: Single instance across the extension
- **Log Levels**: Debug, Info, Warning, Error with filtering
- **Output Channel Integration**: Logs to VS Code output channel
- **Console Logging**: Also logs to console for development
- **Formatted Messages**: Timestamps and log level indicators

## Usage

```typescript
import { Logger, LogLevel } from './infrastructure/logging';

// Get the singleton instance
const logger = Logger.getInstance();

// Set log level (optional, defaults to Info)
logger.setLogLevel(LogLevel.Debug);

// Log messages at different levels
logger.debug('Debug information');
logger.info('General information');
logger.warning('Warning message');
logger.error('Error message', errorObject);

// Show the output channel
logger.show();
```

## Log Levels

- **Debug (0)**: Detailed information for debugging
- **Info (1)**: General informational messages
- **Warning (2)**: Warning messages
- **Error (3)**: Error messages

Messages are filtered based on the current log level. For example, if the log level is set to `Info`, `Debug` messages will not be displayed.

## Implementation Details

- Uses VS Code's `OutputChannel` API for display
- Logs are formatted with ISO timestamps and log level indicators
- Additional arguments are JSON-stringified for readability
- Console logging is always enabled for development purposes

## Testing

Unit tests are located in `__tests__/Logger.test.ts`.

For manual testing in a VS Code extension development host, see `__tests__/Logger.manual-test.ts`.
