<p align="center">
  <h1 align="center">otak-committer</h1>
  <p align="center">
    AI-assisted commit messages, pull requests, and issues for VS Code.
  </p>
</p>

---

Generate commit messages, PRs, and issues without leaving VS Code. Multilingual, template-aware, and team-friendly.

![Commit Message](images/generate-commit-message.png)

## Quick Start

### Commit Messages

1. Stage your changes.
2. Click "Generate Commit Message" in Source Control.
3. Review and edit the result.
4. Commit.

Uses your repo's commit templates (`.gitmessage`, `.github/commit_template`, etc.) and adapts to your conventions.

### Pull Requests

![Generate Pull Request Button](images/generate-pull-request.png)

1. Click "Generate Pull Request" in Source Control.
2. Select an issue to link (optional).
3. Choose base and target branches.
4. Review the generated description.
5. Submit as draft or ready for review.

Automatically uses PR templates, links issues, and applies labels/milestones when available. Requires GitHub sign-in via VS Code.

### Issues

![Generate Issue Button](images/generate-issue.png)

1. Click "Generate Issue" in Source Control.
2. Choose the issue type (bug, feature, task, etc.).
3. Select relevant files for context (optional).
4. Describe your issue.
5. Review the AI-enhanced description.
6. Create or modify before submitting.

Generates clear titles, structured descriptions, and relevant labels.

## Features

- **UI internationalization** — Auto-detect VS Code UI language or pick one manually. Supported UI languages: English, Japanese, Korean, Vietnamese, Simplified Chinese, Traditional Chinese.
- **Multilingual commit messages** — 25 languages: English, Français, Deutsch, Italiano, Español, Português, Čeština, Magyar, Български, Türkçe, Polski, Русский, 日本語, 中文, 繁體中文, 한국어, Tiếng Việt, ไทย, हिन्दी, বাংলা, Basa Jawa, தமிழ், မြန်မာဘာသာ, العربية, עברית.
- **Message styles** — `simple`, `normal`, or `detailed`.
- **Deep VS Code integration** — Source Control panel actions, status bar controls, and full UI localization.
- **Smart PRs and issues** — Context-aware descriptions, template support, and issue linking.
- **Custom instructions** — Team-specific guidance via `otakCommitter.customMessage`.

## How It Works

### Commit Message Flow

- Analyzes staged diffs locally.
- Applies your commit template and style.
- Generates output in your selected language and detail level.

### Pull Request Flow

- Builds a description from your changes.
- Honors your PR template.
- Links issues and applies labels/milestones when available.

### Issue Flow

- Structures the issue based on the selected type.
- Adds concise, actionable titles and descriptions.
- Includes relevant context from selected files.

### GitHub Authentication

Uses VS Code's built-in GitHub authentication. Sign in and out through the Accounts icon in the Activity Bar.

## Configuration

![Settings](images/settings-otakCommitter.png)

### Settings

- **`otakCommitter.language`**: Commit message language (default: `english`)
- **`otakCommitter.messageStyle`**: Message detail level (default: `normal`)
- **`otakCommitter.i18n.uiLanguage`**: UI language preference (default: `auto`)
  - `auto`, `en`, `ja`, `ko`, `vi`, `zh-cn`, `zh-tw`
- **`otakCommitter.customMessage`**: Custom AI instructions (optional)
- **`otakCommitter.useEmoji`**: Enable emoji prefixes (default: `false`)
- **`otakCommitter.emojiStyle`**: Emoji format (`github` or `unicode`)
- **`otakCommitter.reasoningEffort`**: AI reasoning depth — `none`, `low`, `medium`, `high` (default: `low`)
- **`otakCommitter.maxInputTokens`**: Maximum input tokens for diff analysis (default: `200000`)
- **`otakCommitter.useConventionalCommits`**: Use strict Conventional Commits format (default: `false`)
- **`otakCommitter.appendCommitTrailer`**: Append `Commit-Message-By: otak-committer` trailer (default: `true`)
- **`otakCommitter.syncApiKeys`**: Sync API keys via VS Code Settings Sync (default: `false`)

### Custom Instructions Examples

```text
// Examples:
"Include JIRA ticket [PROJ-XXX] in commit messages"
"Add breaking changes section when modifying APIs"
"Reference design docs for UI changes"
```

## Commands

Access via the Command Palette (`Cmd/Ctrl+Shift+P`):

- `Generate Commit Message`
- `Generate Pull Request`
- `Generate Issue`
- `Set OpenAI API Key`
- `Change Language`
- `Change Message Style`
- `Diagnose API Key Storage`
- `Open Settings`

## Requirements

- Visual Studio Code 1.90.0 or higher
- Git
- OpenAI API key (for AI features)
- GitHub sign-in via VS Code for PR/issue features

## Installation

1. Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-committer).
2. Get an OpenAI API key from [OpenAI](https://platform.openai.com/api-keys).
3. Run `otak-committer: Set OpenAI API Key`.
4. (Optional) Sign in to GitHub via the Accounts icon in the Activity Bar for PR/issue features.

Default: English + Normal style. Change anytime from the status bar.

The extension uses GPT-5.2 for high-quality commit message generation.

## Security & Privacy

### API Key Protection

- **Secure Storage (default)**: API keys are stored using VS Code SecretStorage.
- **Settings Sync (optional)**: If `otakCommitter.syncApiKeys` is enabled, a copy of your API keys is stored in synced extension state for cross-device usage.
- **Encrypted Backups**: Redundant storage uses AES-256-GCM encryption with machine-specific keys.
- **Automatic Migration**: Legacy API keys in settings are migrated to secure storage and deleted.
- **No `settings.json` secrets**: Keys never appear in `settings.json`.
- **Diagnostic Tools**: Built-in diagnostics verify storage health.

### Data Handling

- Git diff analysis happens locally.
- Only necessary diff context is sent to OpenAI for generation.
- Large diffs are truncated to avoid excessive exposure.

### Privacy Guarantees

- No telemetry or usage analytics.
- No intermediaries: requests go directly to OpenAI's API.
- Source code is available for security review on GitHub.

### GitHub Integration

- Uses GitHub's official REST API.
- GitHub tokens are stored in the same secure storage as API keys.
- Only requests the `repo` scope for PR and issue operations.

### Best Practices

- Use dedicated API keys for this extension.
- Rotate API keys regularly.
- Review generated content before committing or submitting PRs.

## Troubleshooting

- **No output or empty results**: Ensure you have staged changes and an OpenAI API key configured.
- **PR/issue creation fails**: Verify GitHub auth is signed in via the Accounts icon in the Activity Bar.
- **Wrong UI language**: Check `otakCommitter.i18n.uiLanguage` (default: `auto`).

## Related Extensions

- **[otak-monitor](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-monitor)** — Real-time system monitoring in VS Code.
- **[otak-proxy](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-proxy)** — One-click proxy management for VS Code, Git, npm, and terminals.
- **[otak-restart](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-restart)** — Quick reload shortcuts.
- **[otak-clock](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-clock)** — Dual time zone clock for VS Code.
- **[otak-pomodoro](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-pomodoro)** — Pomodoro timer in VS Code.
- **[otak-zen](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-zen)** — Minimal, distraction-free VS Code UI.

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Links

- **[VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-committer)**
- **[GitHub](https://github.com/tsuyoshi-otake/otak-committer)**
- **[Issues](https://github.com/tsuyoshi-otake/otak-committer/issues)**
