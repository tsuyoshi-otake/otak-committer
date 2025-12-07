# Requirements Document

## Introduction

この機能は、otak-committer拡張機能のユーザーインターフェース（UI）を多言語化し、日本語、英語、ベトナム語、韓国語、中国語（簡体字・繁体字）をサポートします。VS Codeの表示言語設定を自動検出し、適切な言語でUIメッセージを表示します。過剰なローカライズは避け、必要最小限の実装を目指します。

## Glossary

- **UI**: User Interface - ユーザーインターフェース。ユーザーが拡張機能と対話するための視覚的要素とメッセージ
- **i18n**: Internationalization - 国際化。ソフトウェアを複数の言語に対応させるプロセス
- **Locale**: ロケール。ユーザーの言語と地域設定（ja, en, vi, ko, zh-cn, zh-twなど）
- **VS Code Display Language**: VS Codeの表示言語。Language Packによって設定される（Japanese, Vietnamese, Korean, Chinese (Simplified), Chinese (Traditional)など）
- **Extension**: 拡張機能。otak-committer VS Code拡張機能
- **Message**: メッセージ。ユーザーに表示されるテキスト文字列
- **Commit Message**: コミットメッセージ。Gitコミットに付与される説明文
- **Message Style**: メッセージスタイル。コミットメッセージの詳細度（Simple、Normal、Detailed）
- **Language Preference**: 言語設定。ユーザーが選択したコミットメッセージ生成用の言語

## Requirements

### Requirement 1

**User Story:** As a user, I want the extension UI to display in my preferred language (Japanese, English, Vietnamese, Korean, Chinese Simplified, or Chinese Traditional), so that I can use the extension in my native language.

#### Acceptance Criteria

1. WHEN the VS Code display language is Japanese THEN the Extension SHALL display all UI messages in Japanese
2. WHEN the VS Code display language is Vietnamese THEN the Extension SHALL display all UI messages in Vietnamese
3. WHEN the VS Code display language is Korean THEN the Extension SHALL display all UI messages in Korean
4. WHEN the VS Code display language is Chinese (Simplified) THEN the Extension SHALL display all UI messages in Chinese (Simplified)
5. WHEN the VS Code display language is Chinese (Traditional) THEN the Extension SHALL display all UI messages in Chinese (Traditional)
6. WHEN the VS Code display language is English or any other unsupported language THEN the Extension SHALL display all UI messages in English
7. WHEN the display language changes THEN the Extension SHALL update UI messages to match the new language without requiring a restart

### Requirement 2

**User Story:** As a developer, I want a simple and maintainable internationalization system, so that adding or updating translations is straightforward.

#### Acceptance Criteria

1. THE Extension SHALL store all translatable strings in a centralized location
2. THE Extension SHALL provide a simple API for retrieving translated strings
3. WHEN a translation key is missing THEN the Extension SHALL fall back to the English translation
4. THE Extension SHALL NOT include excessive or unnecessary translations

### Requirement 3

**User Story:** As a user, I want consistent language across all UI elements, so that the interface feels cohesive and professional.

#### Acceptance Criteria

1. THE Extension SHALL translate all user-facing messages including information messages, error messages, warning messages, and quick pick items
2. THE Extension SHALL translate all command titles and descriptions
3. THE Extension SHALL translate all status bar text
4. THE Extension SHALL NOT translate technical terms, API keys, or configuration values

### Requirement 4

**User Story:** As a developer, I want the internationalization system to integrate seamlessly with existing code, so that minimal refactoring is required.

#### Acceptance Criteria

1. THE Extension SHALL provide a translation function that can replace existing hardcoded strings
2. WHEN integrating translations THEN the Extension SHALL maintain existing functionality without breaking changes
3. THE Extension SHALL detect the VS Code display language using the standard VS Code API

### Requirement 5

**User Story:** As a user, I want commit messages to be generated in my UI display language, so that commit messages are consistent with the interface language I'm using.

#### Acceptance Criteria

1. WHEN the UI display language is Japanese THEN the Extension SHALL generate commit messages in Japanese
2. WHEN the UI display language is Vietnamese THEN the Extension SHALL generate commit messages in Vietnamese
3. WHEN the UI display language is Korean THEN the Extension SHALL generate commit messages in Korean
4. WHEN the UI display language is Chinese (Simplified) THEN the Extension SHALL generate commit messages in Chinese (Simplified)
5. WHEN the UI display language is English or any other unsupported language THEN the Extension SHALL generate commit messages in English
6. WHEN a user manually selects a language through the configuration command THEN the Extension SHALL generate all subsequent commit messages in that selected language
7. WHEN a user changes the language setting THEN the Extension SHALL persist the language preference and use it for future commit message generation

### Requirement 6

**User Story:** As a user, I want longer commit messages with more detail, so that I can better understand the changes without reading the full diff.

#### Acceptance Criteria

1. WHEN the message style is Simple THEN the Extension SHALL generate commit messages with a maximum length of 100 characters (doubled from 50)
2. WHEN the message style is Normal THEN the Extension SHALL generate commit messages with a maximum length of 144 characters (increased from 72)
3. WHEN the message style is Detailed THEN the Extension SHALL generate commit messages with a maximum length of 200 characters (increased from 100)
