/**
 * Storage key identifier
 */
export interface StorageKey {
    service: 'openai' | 'github';
    key: string;
}

/**
 * Storage value with metadata
 */
export interface StorageValue {
    value: string;
    encrypted: boolean;
    timestamp: number;
}

/**
 * Storage provider interface
 */
export interface StorageProvider {
    get(key: string): Promise<string | undefined>;
    set(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
    has(key: string): Promise<boolean>;
}
