import * as crypto from 'crypto';
import * as os from 'os';

/**
 * Simple encryption utility for storing sensitive data in GlobalState
 * Uses machine-specific information to create a unique encryption key
 */
export class EncryptionUtil {
    private static readonly ALGORITHM = 'aes-256-gcm';
    private static readonly SALT_LENGTH = 32;
    private static readonly IV_LENGTH = 16;
    private static readonly TAG_LENGTH = 16;

    /**
     * Generate a machine-specific key using multiple factors
     */
    private static generateMachineKey(): Buffer {
        // Combine multiple machine-specific factors
        const factors = [
            os.hostname(), // Machine name
            os.platform(), // OS platform
            os.arch(), // CPU architecture
            os.homedir(), // Home directory path
            process.env.USER || process.env.USERNAME || 'default', // Username
            'otak-committer-v1.8.4', // Application-specific salt
        ].join('|');

        // Create a deterministic key from machine factors
        return crypto.createHash('sha256').update(factors).digest();
    }

    /**
     * Encrypt a string value
     * @param plaintext The plain text to encrypt
     * @returns Base64 encoded encrypted data with salt, iv, and tag
     */
    static encrypt(plaintext: string): string {
        try {
            const key = this.generateMachineKey();

            // Generate random salt and IV for this encryption
            const salt = crypto.randomBytes(this.SALT_LENGTH);
            const iv = crypto.randomBytes(this.IV_LENGTH);

            // Derive key with salt
            const derivedKey = crypto.pbkdf2Sync(key, salt, 100000, 32, 'sha256');

            // Create cipher
            const cipher = crypto.createCipheriv(this.ALGORITHM, derivedKey, iv);

            // Encrypt the plaintext
            const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

            // Get the authentication tag
            const tag = cipher.getAuthTag();

            // Combine all components: salt + iv + tag + encrypted
            const combined = Buffer.concat([salt, iv, tag, encrypted]);

            // Return as base64
            return combined.toString('base64');
        } catch (error) {
            const wrapped = new Error('Failed to encrypt data') as Error & { cause?: unknown };
            wrapped.cause = error;
            throw wrapped;
        }
    }

    /**
     * Decrypt a string value
     * @param encryptedData Base64 encoded encrypted data
     * @returns The decrypted plain text
     */
    static decrypt(encryptedData: string): string {
        try {
            const key = this.generateMachineKey();

            // Decode from base64
            const combined = Buffer.from(encryptedData, 'base64');

            // Extract components
            const salt = combined.slice(0, this.SALT_LENGTH);
            const iv = combined.slice(this.SALT_LENGTH, this.SALT_LENGTH + this.IV_LENGTH);
            const tag = combined.slice(
                this.SALT_LENGTH + this.IV_LENGTH,
                this.SALT_LENGTH + this.IV_LENGTH + this.TAG_LENGTH,
            );
            const encrypted = combined.slice(this.SALT_LENGTH + this.IV_LENGTH + this.TAG_LENGTH);

            // Derive key with salt
            const derivedKey = crypto.pbkdf2Sync(key, salt, 100000, 32, 'sha256');

            // Create decipher
            const decipher = crypto.createDecipheriv(this.ALGORITHM, derivedKey, iv);
            decipher.setAuthTag(tag);

            // Decrypt
            const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

            return decrypted.toString('utf8');
        } catch (error) {
            const wrapped = new Error('Failed to decrypt data') as Error & { cause?: unknown };
            wrapped.cause = error;
            throw wrapped;
        }
    }

    /**
     * Test if encryption/decryption is working
     */
    static async selfTest(): Promise<boolean> {
        const testData = 'test-api-key-sk-1234567890';
        const encrypted = this.encrypt(testData);
        const decrypted = this.decrypt(encrypted);
        return testData === decrypted;
    }
}
