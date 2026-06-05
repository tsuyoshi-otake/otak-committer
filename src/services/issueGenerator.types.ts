/**
 * Result of analyzing a single file for inclusion in an issue body prompt.
 */
export interface FileAnalysis {
    path: string;
    content?: string;
    type?: string;
    error?: string;
}
