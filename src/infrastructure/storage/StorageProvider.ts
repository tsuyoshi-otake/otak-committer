/**
 * Storage provider interface for unified storage abstraction
 *
 * Provides a common interface for different storage backends
 * (SecretStorage, Configuration, GlobalState, etc.)
 */
export interface StorageProvider {
    /**
     * Retrieves a value from storage
     * @param key - The storage key
     * @returns The stored value or undefined if not found
     */
    get(key: string): Promise<string | undefined>;

    /**
     * Stores a value in storage
     * @param key - The storage key
     * @param value - The value to store
     */
    set(key: string, value: string): Promise<void>;

    /**
     * Deletes a value from storage
     * @param key - The storage key
     */
    delete(key: string): Promise<void>;

    /**
     * Checks if a key exists in storage
     * @param key - The storage key
     * @returns True if the key exists, false otherwise
     */
    has(key: string): Promise<boolean>;
}
