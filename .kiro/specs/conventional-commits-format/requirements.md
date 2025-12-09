# Requirements Document

## Introduction

このドキュメントは、コミットメッセージのフォーマットをConventional Commits形式（`<type>(<scope>): <subject>`）に対応させる機能の要件を定義します。現在のシステムは `<prefix>: <subject>` の形式でコミットメッセージを生成していますが、これを `fix(search): バグを修正` のような形式に拡張します。

## Glossary

- **System**: OtakCommitter VSCode拡張機能
- **Commit Message**: Gitコミットに付与されるメッセージ
- **Type**: コミットの種類を示すプレフィックス（例: fix, feat, docs）
- **Scope**: 変更の影響範囲を示す識別子（例: search, auth, ui）
- **Subject**: コミットの内容を簡潔に説明する文
- **Conventional Commits**: コミットメッセージの標準化された形式
- **Prompt Service**: AIモデルへのプロンプトを生成するサービス

## Requirements

### Requirement 1

**User Story:** As a developer, I want commit messages to include a scope in the format `<type>(<scope>): <subject>`, so that I can clearly identify which part of the codebase was modified.

#### Acceptance Criteria

1. WHEN the System generates a commit message THEN the System SHALL format it as `<type>(<scope>): <subject>`
2. WHEN the diff contains changes to multiple distinct areas THEN the System SHALL select the most appropriate scope based on the primary change
3. WHEN the scope cannot be determined from the diff THEN the System SHALL omit the scope and use the format `<type>: <subject>`
4. WHEN generating the prompt for AI THEN the System SHALL include instructions to use the Conventional Commits format with scope
5. WHEN the user has a custom template THEN the System SHALL respect the template format over the Conventional Commits format

### Requirement 2

**User Story:** As a developer, I want the AI to intelligently determine the scope from the Git diff, so that I don't have to manually specify it every time.

#### Acceptance Criteria

1. WHEN the diff contains file paths THEN the System SHALL analyze the paths to determine the scope
2. WHEN multiple files are changed in the same directory or module THEN the System SHALL use that directory or module name as the scope
3. WHEN changes span multiple unrelated areas THEN the System SHALL use the most significant area as the scope
4. WHEN the diff includes common patterns (e.g., `src/services/auth/*`) THEN the System SHALL extract `auth` as the scope
5. WHEN the scope would be too generic (e.g., `src`) THEN the System SHALL attempt to find a more specific scope or omit it

### Requirement 3

**User Story:** As a developer, I want the scope format to be configurable, so that I can adapt it to my project's conventions.

#### Acceptance Criteria

1. WHEN the user enables scope in configuration THEN the System SHALL include scope in commit messages
2. WHEN the user disables scope in configuration THEN the System SHALL use the original `<type>: <subject>` format
3. WHEN the configuration is changed THEN the System SHALL apply the new format to subsequent commit message generations
4. WHEN no configuration is set THEN the System SHALL default to including scope

### Requirement 4

**User Story:** As a developer, I want the existing commit message generation features to continue working, so that the new scope feature doesn't break my current workflow.

#### Acceptance Criteria

1. WHEN the System generates a commit message with scope THEN the System SHALL preserve all existing features including emoji support, custom messages, and language selection
2. WHEN the message style is set to simple, normal, or detailed THEN the System SHALL apply the character limits to the entire message including scope
3. WHEN the user has custom instructions THEN the System SHALL apply them in addition to the scope format
4. WHEN templates are used THEN the System SHALL prioritize template format over Conventional Commits format
