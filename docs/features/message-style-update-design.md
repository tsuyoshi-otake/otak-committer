# メッセージスタイルの拡張設計

## 1. トークン量の調整

### 1.1 コミットメッセージ（既存）
- simple: 100トークン
- normal: 200トークン
- detailed: 500トークン

### 1.2 PRメッセージ（新規）
- simple: 400トークン
- normal: 800トークン
- detailed: 2000トークン

## 2. 型定義の更新（src/types/messageStyle.ts）

```typescript
export type MessageStyle = 'simple' | 'normal' | 'detailed';
export type MessageType = 'commit' | 'pr';

export interface MessageStyleConfig {
    tokens: {
        commit: number;
        pr: number;
    };
    description: string;
}

export const MESSAGE_STYLES: Record<MessageStyle, MessageStyleConfig> = {
    simple: {
        tokens: {
            commit: 100,
            pr: 400
        },
        description: "Generate a very concise message focusing only on the core changes."
    },
    normal: {
        tokens: {
            commit: 200,
            pr: 800
        },
        description: "Generate a message with a brief explanation of the changes."
    },
    detailed: {
        tokens: {
            commit: 500,
            pr: 2000
        },
        description: "Generate a detailed message including context, reasoning, and impact of the changes."
    }
};
```

## 3. 絵文字サポートの追加

### 3.1 設定項目の追加（package.json）
```json
{
    "configuration": {
        "title": "otak-committer",
        "properties": {
            "otakCommitter.useEmoji": {
                "type": "boolean",
                "default": false,
                "description": "Use emoji in commit messages and PR descriptions"
            },
            "otakCommitter.emojiStyle": {
                "type": "string",
                "default": "github",
                "enum": [
                    "github",
                    "unicode"
                ],
                "enumDescriptions": [
                    "GitHub style emoji codes (:smile:)",
                    "Unicode emoji characters (😊)"
                ],
                "description": "Style of emoji to use in messages"
            }
        }
    }
}
```

### 3.2 型定義の追加（src/types/emoji.ts）
```typescript
export interface EmojiConfig {
    enabled: boolean;
    style: 'github' | 'unicode';
}

export const EMOJI_CATEGORIES = {
    feature: ['✨', ':sparkles:'],
    bugfix: ['🐛', ':bug:'],
    docs: ['📚', ':books:'],
    style: ['💎', ':gem:'],
    refactor: ['♻️', ':recycle:'],
    performance: ['⚡', ':zap:'],
    test: ['🧪', ':test_tube:'],
    chore: ['🔧', ':wrench:']
} as const;
```

## 4. 多言語サポートの拡張

### 4.1 言語設定の更新
各language/*.tsファイルに絵文字関連のプロンプトを追加：

```typescript
export interface LanguageConfig {
    // 既存のフィールド
    name: string;
    systemPrompt: (style: MessageStyle, type: MessageType) => string;
    diffMessage: string;

    // 新規追加
    emojiPrompt: string;  // 絵文字使用時の追加指示
}
```

## 5. メッセージ生成ロジックの更新

### 5.1 OpenAI APIリクエストの調整
```typescript
interface MessageGenerationParams {
    messageType: MessageType;
    messageStyle: MessageStyle;
    emojiConfig: EmojiConfig;
    language: string;
    diff: string;
}

async function generateMessage(params: MessageGenerationParams): Promise<string> {
    const {
        messageType,
        messageStyle,
        emojiConfig,
        language,
        diff
    } = params;

    const languageConfig = LANGUAGE_CONFIGS[language];
    const tokenLimit = MESSAGE_STYLES[messageStyle].tokens[messageType];
    
    // システムプロンプトの構築
    const systemPrompt = [
        languageConfig.systemPrompt(messageStyle, messageType),
        emojiConfig.enabled && languageConfig.emojiPrompt
    ].filter(Boolean).join('\n');

    // OpenAI APIリクエスト
    // ...
}
```

## 6. 実装手順

1. メッセージスタイル型定義の更新
   - MessageStyleConfig型の更新
   - トークン量の調整

2. 絵文字サポートの実装
   - 設定項目の追加
   - 絵文字ユーティリティの実装

3. 多言語サポートの拡張
   - 言語設定ファイルの更新
   - プロンプトの調整

4. メッセージ生成ロジックの更新
   - generateCommitMessageWithAIの更新
   - generatePullRequestMessageの実装

5. UI/UX調整
   - ステータスバーの更新
   - クイックピッカーの調整

## 7. テスト計画

1. メッセージ生成
   - コミットメッセージのトークン制限
   - PRメッセージのトークン制限
   - 絵文字の正しい挿入

2. 設定変更
   - 絵文字の有効/無効切り替え
   - 絵文字スタイルの切り替え

3. 多言語対応
   - 各言語での絵文字サポート
   - プロンプトの正確性