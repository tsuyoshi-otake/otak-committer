# Storage Failure Handling

This document describes how `StorageManager` handles storage failures.

## Overview

API keys are sensitive and must only be stored in VS Code `SecretStorage`.
The extension no longer keeps encrypted API-key backups in `globalState`, no
longer stores API keys in Settings Sync, and no longer writes API keys to
Configuration as a runtime fallback.

The only accepted fallback behavior for API-key reads is a safe default:
return `undefined` and prompt the user to configure storage or enter the key
again.

## API Key Retrieval (`getApiKey`)

When retrieving an API key, the system attempts the following:

1. Read from `SecretStorage`.
2. Delete any old `otak-committer.backup.*` value from `globalState`.
3. If a legacy Configuration value exists and `SecretStorage` is available,
   migrate it to `SecretStorage`, delete the legacy value, and return it.
4. If `SecretStorage` is unavailable or migration fails, return `undefined`.

Legacy Configuration values are not returned unless they have been migrated to
`SecretStorage` successfully.

## API Key Storage (`setApiKey`)

When storing an API key, the system:

1. Stores the value in `SecretStorage`.
2. Deletes any old `otak-committer.backup.*` value from `globalState`.
3. Registers only non-sensitive keys for Settings Sync.
4. Deletes the legacy Configuration value after the secure write succeeds.
5. Throws `StorageError` if `SecretStorage` cannot store the key.

API keys are not written to Configuration, Settings Sync, or `globalState` as a
fallback.

## API Key Deletion (`deleteApiKey`)

When deleting an API key, the system attempts cleanup from every historical
location:

1. `SecretStorage`
2. Legacy Settings Sync-backed `globalState`
3. Legacy Configuration
4. Legacy `otak-committer.backup.*` `globalState` values

Deletion succeeds if at least one cleanup path succeeds. It throws only when all
known cleanup paths fail.

## API Key Existence Check (`hasApiKey`)

`hasApiKey` checks `SecretStorage` first. It may also detect a legacy
Configuration value so the extension can guide migration or setup, but `getApiKey`
will only return that value after a successful secure migration.

## Migration

Legacy migration moves API keys from Configuration to `SecretStorage`.

1. Read the legacy Configuration key.
2. Store it in `SecretStorage`.
3. Delete the legacy Configuration key.
4. Mark migration complete only after all existing legacy keys are migrated.
5. If migration fails, leave the legacy value in place for a later retry.

The extension warns the user when migration cannot complete. It does not use the
legacy key until secure storage is available.

## Non-Sensitive Storage

Non-sensitive preferences can still use Configuration or `globalState`.
Settings Sync registration is limited to non-sensitive keys such as
`otak-committer.alwaysStageAll`.

## Diagnostics

`checkStorageHealth` verifies:

- `secretStorage`: can read/write to `SecretStorage`
- `configStorage`: can read/write to Configuration
- `globalState`: can read/write to `globalState`
- `encryption`: legacy encryption utility availability for diagnostics

`getStorageDiagnostics` reports where keys appear, including historical
locations, so users can identify stale data that should be cleaned up.

## Testing

Storage tests verify:

- API keys are stored and retrieved from `SecretStorage`.
- API keys are not backed up to `globalState`.
- API keys are not written to Configuration as a fallback.
- Legacy values are returned only after successful secure migration.
- Legacy values are preserved for retry when migration fails.
- Old Settings Sync and `globalState` backup entries are cleaned up.

## Security Considerations

1. `SecretStorage` is the only runtime storage for API keys.
2. Settings Sync must not contain API keys.
3. `globalState` must not contain API-key backups.
4. Plaintext Configuration values are legacy data only and are deleted after
   successful migration.
5. Failed migration must not silently expose legacy API keys to external AI
   service calls.
