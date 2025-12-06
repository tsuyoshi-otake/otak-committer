/**
 * File information
 */
export interface FileInfo {
    path: string;
    content?: string;
    type?: string;
}

/**
 * Template information
 */
export interface TemplateInfo {
    type: 'commit' | 'pr';
    content: string;
    path: string;
}

/**
 * Service error interface (legacy)
 * @deprecated Use ServiceError class from errors instead
 */
export interface IServiceError extends Error {
    code: string;
    status?: number;
    data?: any;
}
