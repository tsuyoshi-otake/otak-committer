// Base interfaces
export interface ServiceConfig {
    openaiApiKey?: string;
    language: string;
    messageStyle: string;
    useEmoji: boolean;
}

export interface ServiceError extends Error {
    code: string;
    status?: number;
    data?: any;
}

// Common types
export interface FileInfo {
    path: string;
    content?: string;
    type?: string;
}

export interface TemplateInfo {
    type: 'commit' | 'pr';
    content: string;
    path: string;
}

// Re-export specific types
export * from './git';
export * from './github';
export * from './language';
export * from './messageStyle';