export type MessageStyle = 'simple' | 'normal' | 'detailed';

export interface MessageStyleConfig {
    tokens: number;
    description: string;
}

export const MESSAGE_STYLES: Record<MessageStyle, MessageStyleConfig> = {
    simple: {
        tokens: 100,
        description: "Generate a very concise commit message focusing only on the core change."
    },
    normal: {
        tokens: 200,
        description: "Generate a commit message with a brief explanation of the changes."
    },
    detailed: {
        tokens: 500,
        description: "Generate a detailed commit message including context, reasoning, and impact of the changes."
    }
};