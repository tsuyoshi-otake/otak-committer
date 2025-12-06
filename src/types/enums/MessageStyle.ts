/**
 * Message style options for commit and PR generation
 */
export enum MessageStyle {
    Simple = 'simple',
    Normal = 'normal',
    Detailed = 'detailed'
}

/**
 * Emoji style options
 */
export enum EmojiStyle {
    GitHub = 'github',
    Unicode = 'unicode'
}

/**
 * Message type for generation
 */
export enum MessageType {
    Commit = 'commit',
    PR = 'pr'
}
