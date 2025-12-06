# Storage Fallback Mechanisms

This document describes the fallback and graceful degradation mechanisms implemented in the StorageManager.

## Overview

The StorageManager implements a multi-layered fallback strategy to ensure the extension continues to function even when storage operations fail. This provides resilience against various failure scenarios including:

- SecretStorage API failures
- Configuration API failures
- GlobalState corruption
- Encryption/decryption errors
- Network or filesystem issues

## Fallback Chain

### API Key Retrieval (`getApiKey`)

When retrieving an API key, the system attempts the following in order:

1. **Primary**: SecretStorage (encrypted, secure)
2. **Automatic Fallback**: Encrypted GlobalState backup (handled by SecretStorageProvider)
3. **Legacy Fallback**: Configuration storage (for migration scenarios)
4. **Graceful Degradation**: Returns `undefined` instead of throwing

```typescript
// Example usage
const apiKey = await storage.getApiKey('openai');
if (!apiKey) {
    // Prompt user to configure API key
    vscode.window.showWarningMessage('Please configure your OpenAI API key');
}
```

### API Key Storage (`setApiKey`)

When storing an API key, the system attempts:

1. **Primary**: Store in SecretStorage
2. **Automatic Backup**: Store encrypted copy in GlobalState (handled by SecretStorageProvider)
3. **Fallback**: If both fail, attempt to store in legacy Configuration
4. **User Notification**: Show warning if fallback storage is used
5. **Error**: Throw only if all storage mechanisms fail

```typescript
// Example usage
try {
    await storage.setApiKey('openai', 'sk-...');
} catch (error) {
    // All storage mechanisms failed
    vscode.window.showErrorMessage('Failed to store API key');
}
```

### API Key Deletion (`deleteApiKey`)

When deleting an API key, the system:

1. Attempts to delete from SecretStorage (and its backup)
2. Attempts to delete from legacy Configuration
3. Succeeds if deletion works in at least one location
4. Only throws if deletion fails in all locations

### API Key Existence Check (`hasApiKey`)

When checking if an API key exists:

1. Checks SecretStorage (and its backup)
2. Checks legacy Configuration
3. Returns `true` if found in any location
4. Returns `false` on error (graceful degradation)

## Storage Health Monitoring

### Health Check (`checkStorageHealth`)

Tests all storage mechanisms to ensure they are functioning:

```typescript
const health = await storage.checkStorageHealth();
console.log('SecretStorage:', health.secretStorage);
console.log('Configuration:', health.configStorage);
console.log('GlobalState:', health.globalState);
console.log('Encryption:', health.encryption);
```

Returns:
- `secretStorage`: Can read/write to SecretStorage
- `configStorage`: Can read/write to Configuration
- `globalState`: Can read/write to GlobalState
- `encryption`: Encryption/decryption is working

### Diagnostics (`getStorageDiagnostics`)

Provides detailed information about storage state:

```typescript
const diagnostics = await storage.getStorageDiagnostics();
console.log('Migration completed:', diagnostics.migrationCompleted);
console.log('OpenAI key locations:', diagnostics.openaiKeyLocations);
console.log('GitHub key locations:', diagnostics.githubKeyLocations);
console.log('Storage health:', diagnostics.storageHealth);
```

## Error Handling Strategy

### Non-Critical Operations

For operations where failure should not break the extension:

- `getApiKey`: Returns `undefined`
- `hasApiKey`: Returns `false`
- `deleteSecret`: Logs error but doesn't throw
- `deleteConfig`: Logs error but doesn't throw

### Critical Operations

For operations where failure indicates a serious problem:

- `setApiKey`: Throws only if all storage mechanisms fail
- `setSecret`: Throws if storage fails
- `setConfig`: Throws if storage fails

## Migration Fallback

The migration process includes fallback mechanisms:

1. Attempts to migrate from legacy Configuration to SecretStorage
2. If migration fails, leaves data in legacy storage
3. Shows warning to user about fallback storage
4. Extension continues to function using legacy storage
5. Migration will be retried on next activation

## Best Practices

### For Extension Developers

1. **Always check return values**: `getApiKey` may return `undefined`
2. **Handle errors gracefully**: Wrap critical operations in try-catch
3. **Provide user feedback**: Show appropriate messages when storage fails
4. **Use health checks**: Monitor storage health in diagnostics

### Example: Robust API Key Retrieval

```typescript
async function getOpenAIKey(storage: StorageManager): Promise<string | undefined> {
    try {
        // Try to get the API key
        let apiKey = await storage.getApiKey('openai');
        
        if (!apiKey) {
            // Check storage health
            const health = await storage.checkStorageHealth();
            
            if (!health.secretStorage) {
                vscode.window.showWarningMessage(
                    'Secure storage is unavailable. Please check your VS Code installation.'
                );
            } else {
                // Storage is healthy but key is not configured
                vscode.window.showInformationMessage(
                    'Please configure your OpenAI API key.'
                );
            }
        }
        
        return apiKey;
    } catch (error) {
        console.error('Failed to retrieve API key:', error);
        vscode.window.showErrorMessage('Failed to access storage');
        return undefined;
    }
}
```

## Testing Fallback Mechanisms

The fallback mechanisms are tested in `StorageManager.fallback.test.ts`:

- Tests graceful degradation when storage fails
- Tests fallback chain for API key operations
- Tests health check functionality
- Tests diagnostic information
- Tests error handling for all operations

## Security Considerations

1. **Encryption**: All backups in GlobalState are encrypted
2. **Legacy Storage**: Plain-text Configuration is only used as last resort
3. **Migration**: Legacy data is cleaned up after successful migration
4. **Fallback Warning**: Users are notified when fallback storage is used

## Performance Considerations

1. **Parallel Operations**: Primary and backup storage operations run in parallel
2. **Caching**: No caching to ensure data consistency
3. **Lazy Evaluation**: Health checks only run when explicitly requested
4. **Error Recovery**: Failed operations don't block subsequent operations
