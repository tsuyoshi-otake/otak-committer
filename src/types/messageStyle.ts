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