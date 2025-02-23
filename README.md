# Otak Committer

A VSCode extension that helps generate Git commit messages and Pull Requests using AI.

## Features

- AI-powered commit message generation using OpenAI API
- Support for commit message templates
- Extensive multi-language support
- Customizable message styles (Normal, Emoji, Kawaii)
- Automated Pull Request generation with descriptions
- Easy language switching from the status bar
- Conventional Commits format support

## Prerequisites

- Visual Studio Code 1.76.0 or higher
- Git installed and configured
- OpenAI API key

## Installation

1. Install the extension from VSCode Marketplace
2. Configure your OpenAI API key in the extension settings
3. Select your preferred language from the status bar

## Usage

### Generate Commit Message

1. Stage your changes in Git
2. Click the "Generate Commit Message" button in the Source Control view, or:
3. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
4. Run "Otak Committer: Generate Commit Message"
5. The generated message will appear in the commit message input box
6. Review and edit if needed, then commit manually

### Generate Pull Request

1. Open Command Palette
2. Run "Otak Committer: Generate Pull Request"
3. Select base and target branches
4. Optionally link to an existing issue
5. Choose between Draft or Regular PR
6. Review the generated content and submit

## Commit Message Format

The extension supports two formats:

1. Template-based: If a commit message template exists (`.gitmessage`, `.github/commit_template`, etc.), it will be used as the base format.

2. Conventional Commits: When no template exists, messages follow this format:
```
<type>: <subject>

<body>
```

Available types:
- `fix`: Bug fixes
- `feat`: New features
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test updates
- `chore`: Build/tool changes

## Configuration

### Settings

- `otakCommitter.openaiApiKey`: Your OpenAI API key
- `otakCommitter.language`: Message language (default: `japanese`)
- `otakCommitter.messageStyle`: Message style (default: `normal`)
  - `normal`: Standard commit messages
  - `emoji`: Messages with emoji
  - `kawaii`: Cute style messages

### Language Support

The extension supports the following languages:

#### European Languages
- English (English)
- Français (French)
- Deutsch (German)
- Italiano (Italian)
- Español (Spanish)
- Português (Portuguese)
- Čeština (Czech)
- Magyar (Hungarian)
- Български (Bulgarian)
- Türkçe (Turkish)
- Polski (Polish)
- Русский (Russian)

#### East Asian Languages
- 日本語 (Japanese)
- 简体中文 (Simplified Chinese)
- 繁體中文 (Traditional Chinese)
- 한국어 (Korean)
- Tiếng Việt (Vietnamese)
- ไทย (Thai)

#### South Asian Languages
- हिन्दी (Hindi)
- বাংলা (Bengali)
- Basa Jawa (Javanese)
- தமிழ் (Tamil)
- မြန်မာစာ (Burmese)

#### Middle Eastern Languages
- العربية (Arabic)
- עברית (Hebrew)

You can switch languages anytime using the language selector in the status bar.

## Message Styles

### Normal Style
```
feat: Add user authentication feature

Implement JWT-based authentication system with the following features:
- User registration and login
- Password encryption
- Session management
```

### Emoji Style
```
✨ feat: Add user authentication feature

🔒 Implement JWT-based authentication system with:
- 📝 User registration and login
- 🔐 Password encryption
- ⏲️ Session management
```

### Kawaii Style
```
(｡♥‿♥｡) feat: Add kawaii user authentication~!

(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧ Implement super secure authentication:
♪(^∇^*) User registration and login
(｡◕‿◕｡) Password encryption
(★‿★) Session management
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.