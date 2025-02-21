<p align="center">
  <h1 align="center">otak-committer</h1>
  <p align="center">
    VS Code extension for intelligent SCM operations - Multilingual commit message generation with AI support (supporting 25 languages) and future PR management features.
  </p>
</p>

---

## Usage

![Generate Commit Message Button](images/generate-commit-message.png)

1. Stage your changes in Git  
2. Click the "Generate Commit Message" button in the SCM view (or use the command palette)  
3. Review and optionally edit the generated message  
4. Commit your changes

## Features

otak-committer is a powerful VS Code extension that leverages AI to automatically generate Git commit messages.

### Key Features

- **Multilingual Support**: Generate commit messages in 25 languages:
  - 🇺🇸 English
  - 🇫🇷 Français
  - 🇩🇪 Deutsch
  - 🇮🇹 Italiano
  - 🇪🇸 Español
  - 🇵🇹 Português
  - 🇨🇿 Čeština
  - 🇭🇺 Magyar
  - 🇧🇬 Български
  - 🇹🇷 Türkçe
  - 🇵🇱 Polski
  - 🇷🇺 Русский
  - 🇯🇵 日本語
  - 🇨🇳 中文
  - 🇹🇼 繁體中文
  - 🇰🇷 한국어
  - 🇻🇳 Tiếng Việt
  - 🇹🇭 ไทย
  - 🇮🇳 हिन्दी
  - 🇧🇩 বাংলা
  - 🇮🇩 Basa Jawa
  - 🇮🇳 தமிழ்
  - 🇲🇲 မြန်မာဘာသာ
  - 🇦🇪 العربية
  - 🇮🇱 עברית

- **Flexible Message Styles**: Choose from three levels of detail for your commit messages:
  - **Simple**: Concise summary (100 tokens)
  - **Normal**: Standard length with context (200 tokens)
  - **Detailed**: Comprehensive explanation (500 tokens)

- **Git SCM Integration**: Seamlessly integrated into VS Code's Git interface with a dedicated button in the SCM view.

- **Quick Language Switching**: Change languages directly from the status bar  
  ![Status Bar](images/statusbar.png)
  - One-click language switching
  - Current message style display in tooltip
  - Quick access to settings

- **Custom System Prompt**: Add your own instructions to the AI
  - Customize the message generation process
  - Add specific requirements or guidelines
  - Configure via `otakCommitter.customMessage` setting  
  - Examples of custom messages:
    ```
    Please include JIRA ticket number [PROJ-123] at the start of the commit message
    Add a link to the related documentation at the end of the message
    Always mention performance impact for any code changes
    ```
  *Note*: Custom messages are appended to the Git diff before processing, allowing you to provide additional context or requirements without overriding the core commit message generation logic.

## Requirements

- Visual Studio Code ^1.90.0
- Git installed and configured
- OpenAI API key

### Getting OpenAI API Key

To use this extension, you need an OpenAI API key. Here's how to get one:

1. Go to [OpenAI API Keys page](https://platform.openai.com/api-keys)
2. Sign in or create an OpenAI account
3. Create a new API key
4. Copy the API key
5. Open VS Code Settings (File > Preferences > Settings)
6. Search for `otakCommitter.openaiApiKey`
7. Paste your API key into the text field

*Note*: The extension uses the GPT-4o model to generate commit messages. Make sure your OpenAI account has access to the GPT-4o API.

## Installation

1. Install the extension from the VS Code Marketplace
2. Configure your OpenAI API key in the extension settings
3. Select your preferred language and message style  
   (Default language is English)

## Extension Settings

This extension contributes the following settings:

![Settings](images/settings-otakCommitter.png)

- **`otakCommitter.language`**: Language for commit messages (default: `"english"`).  
  The supported languages include:
  
  ```json
  "enum": [
      "english",
      "french",
      "german",
      "italian",
      "spanish",
      "portuguese",
      "czech",
      "hungarian",
      "bulgarian",
      "turkish",
      "polish",
      "russian",
      "japanese",
      "chinese",
      "traditionalChinese",
      "korean",
      "vietnamese",
      "thai",
      "hindi",
      "bengali",
      "javanese",
      "tamil",
      "burmese",
      "arabic",
      "hebrew"
  ],
  "enumDescriptions": [
      "English",
      "Français",
      "Deutsch",
      "Italiano",
      "Español",
      "Português",
      "Čeština",
      "Magyar",
      "Български",
      "Türkçe",
      "Polski",
      "Русский",
      "日本語",
      "中文",
      "繁體中文",
      "한국어",
      "Tiếng Việt",
      "ไทย",
      "हिन्दी",
      "বাংলা",
      "Basa Jawa",
      "தமிழ்",
      "မြန်မာဘာသာ",
      "العربية",
      "עברית"
  ]
  ```

- **`otakCommitter.messageStyle`**: Style and length of generated commit messages (default: `"normal"`).  
  Options include:
  - Simple (concise summary)
  - Normal (contextual details)
  - Detailed (comprehensive explanation)

- **`otakCommitter.openaiApiKey`**: OpenAI API key for generating commit messages.

- **`otakCommitter.customMessage`**: Additional instructions for commit message generation (optional).  
  Enhance the AI's understanding of your commit requirements by appending custom instructions to the Git diff.  
  Example custom messages:
    ```
    # Project-specific conventions
    Always mention related component name in square brackets
    Include affected service names for backend changes

    # Team workflow requirements
    Add deployment notes if configuration files are modified
    Reference related test cases when fixing bugs
    ```

## Commands

- **`otak-committer.generateMessage`**: Generate a commit message for staged changes.
- **`otak-committer.openSettings`**: Open the extension settings.
- **`otak-committer.changeLanguage`**: Change commit message language (available in the status bar).
- **`otak-committer.changeMessageStyle`**: Change message style.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

For more information, visit the [GitHub repository](https://github.com/tsuyoshi-otake-system-exe-jp/otak-committer).