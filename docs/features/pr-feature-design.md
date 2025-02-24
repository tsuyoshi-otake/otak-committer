# PR生成機能の設計

## 1. 機能概要

### 1.1 目的
- コミットメッセージ生成と同様の使いやすさでPR生成を実現
- Issue連携によるスマートなPR作成をサポート
- 多言語対応による国際的な開発をサポート

### 1.2 主な機能
- Base/Compare指定によるPR生成
- Issue連携PR生成
- 多言語PRメッセージ生成

## 2. システム設計

### 2.1 型定義（src/types/github.ts）
```typescript
export interface GitHubConfig {
    token: string;
    owner: string;
    repo: string;
}

export interface PullRequestParams {
    base: string;
    compare: string;
    title?: string;
    body?: string;
    issueNumber?: number;
}

export interface IssueInfo {
    number: number;
    title: string;
    body: string;
    labels: string[];
}

export interface PullRequestDiff {
    files: GitHubDiffFile[];
    stats: {
        additions: number;
        deletions: number;
    };
}

export interface GitHubDiffFile {
    filename: string;
    additions: number;
    deletions: number;
    patch: string;
}
```

### 2.2 サービス実装（src/services/github.ts）
```typescript
export class GitHubService {
    constructor(private config: GitHubConfig) {}

    // PRの差分を取得
    async getDiff(base: string, compare: string): Promise<PullRequestDiff>;

    // Issueの情報を取得
    async getIssue(number: number): Promise<IssueInfo>;

    // PRを作成
    async createPullRequest(params: PullRequestParams): Promise<void>;
}
```

### 2.3 PR生成コマンド（src/commands/generatePR.ts）
```typescript
export async function generatePullRequest(
    base: string,
    compare: string,
    issueNumber?: number
): Promise<void> {
    // 1. 差分の取得
    // 2. Issue情報の取得（指定がある場合）
    // 3. OpenAI APIでPRメッセージ生成
    // 4. PRの作成
}
```

### 2.4 多言語サポート拡張
- 各language/*.tsファイルに以下を追加：
```typescript
prTitlePrompt: string;
prBodyPrompt: string;
issueLinkedPrPrompt: string;
```

## 3. UI/UX設計

### 3.1 コマンドパレット
- `Generate Pull Request`: PR生成コマンド
- `Link Issue to PR`: Issue連携コマンド

### 3.2 ステータスバーボタン
- Generate PRボタンをGenerate Commitボタンの横に配置
- クリックでクイックピッカー表示（Base/Compare選択）

### 3.3 設定項目の追加
```json
{
    "otakCommitter.github": {
        "token": "GitHub personal access token",
        "owner": "リポジトリオーナー",
        "repo": "リポジトリ名"
    }
}
```

## 4. 実装手順

1. 型定義とサービスの実装
   - github.tsとGitHubServiceの実装
   - テストの作成

2. コマンドの実装
   - generatePR.tsの実装
   - コマンド登録とUI統合

3. 多言語対応の拡張
   - 各言語ファイルにPR関連プロンプトを追加
   - メッセージ生成ロジックの実装

4. 設定とドキュメント
   - package.jsonに設定項目を追加
   - READMEの更新

## 5. エラーハンドリング

### 5.1 想定されるエラー
- GitHub API認証エラー
- ブランチ不在エラー
- Issue未存在エラー
- APIレート制限

### 5.2 エラーメッセージ
- 具体的な対処方法を含める
- 設定確認手順を提示
- 多言語対応

## 6. テスト計画

### 6.1 単体テスト
- GitHubService
- PR生成ロジック
- 多言語メッセージ生成

### 6.2 統合テスト
- コマンド実行フロー
- GitHub API通信
- エラーハンドリング

## 7. セキュリティ考慮事項

- GitHub tokenの安全な保管
- APIレート制限への対応
- エラーメッセージでの機密情報漏洩防止