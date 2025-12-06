/**
 * @deprecated Import from '../types/enums/MessageStyle' instead
 */
export { MessageStyle, MessageType, EmojiStyle } from './enums/MessageStyle';

/**
 * @deprecated Import from '../types/interfaces/Config' instead
 */
export type { MessageStyleConfig, EmojiConfig } from './interfaces/Config';

/**
 * Message style configurations with token limits
 */
export const MESSAGE_STYLES: Record<import('./enums/MessageStyle').MessageStyle, import('./interfaces/Config').MessageStyleConfig> = {
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

/**
 * Emoji categories for commit messages
 */
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