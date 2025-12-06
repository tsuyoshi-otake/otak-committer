import * as assert from 'assert';
import * as vscode from 'vscode';
import { ConfigManager } from '../ConfigManager';
import { SupportedLanguage } from '../../../types/enums/SupportedLanguage';
import { MessageStyle, EmojiStyle } from '../../../types/enums/MessageStyle';

/**
 * Unit tests for ConfigManager
 * 
 * Tests configuration get/set operations, default value initialization,
 * and configuration target handling.
 * 
 * _Requirements: 7.1_
 */
suite('ConfigManager', () => {
    let configManager: ConfigManager;
    let mockConfigData: Map<string, any>;
    let mockConfiguration: vscode.WorkspaceConfiguration;

    setup(() => {
        // Initialize mock data storage
        mockConfigData = new Map();

        // Create mock workspace configuration
        mockConfiguration = {
            get: <T>(key: string, defaultValue?: T): T | undefined => {
                return mockConfigData.has(key) ? mockConfigData.get(key) : defaultValue;
            },
            has: (key: string): boolean => {
                return mockConfigData.has(key);
            },
            inspect: (key: string) => {
                return undefined;
            },
            update: async (key: string, value: any, target?: vscode.ConfigurationTarget | boolean): Promise<void> => {
                if (value === undefined) {
                    mockConfigData.delete(key);
                } else {
                    mockConfigData.set(key, value);
                }
            }
        } as any;

        // Mock vscode.workspace.getConfiguration
        const originalGetConfig = vscode.workspace.getConfiguration;
        (vscode.workspace as any).getConfiguration = (section?: string) => {
            if (section === 'otakCommitter') {
                return mockConfiguration;
            }
            return originalGetConfig(section);
        };

        configManager = new ConfigManager();
    });

    teardown(() => {
        // Clean up mock data
        mockConfigData.clear();
    });

    suite('Configuration Get Operations', () => {
        test('should get language configuration', () => {
            mockConfigData.set('language', SupportedLanguage.Japanese);
            
            const language = configManager.get('language');
            
            assert.strictEqual(language, SupportedLanguage.Japanese);
        });

        test('should get messageStyle configuration', () => {
            mockConfigData.set('messageStyle', MessageStyle.Detailed);
            
            const messageStyle = configManager.get('messageStyle');
            
            assert.strictEqual(messageStyle, MessageStyle.Detailed);
        });

        test('should get useEmoji configuration', () => {
            mockConfigData.set('useEmoji', true);
            
            const useEmoji = configManager.get('useEmoji');
            
            assert.strictEqual(useEmoji, true);
        });

        test('should get emojiStyle configuration', () => {
            mockConfigData.set('emojiStyle', EmojiStyle.Unicode);
            
            const emojiStyle = configManager.get('emojiStyle');
            
            assert.strictEqual(emojiStyle, EmojiStyle.Unicode);
        });

        test('should get customMessage configuration', () => {
            mockConfigData.set('customMessage', 'Custom commit message');
            
            const customMessage = configManager.get('customMessage');
            
            assert.strictEqual(customMessage, 'Custom commit message');
        });

        test('should return undefined for unset configuration', () => {
            const language = configManager.get('language');
            
            assert.strictEqual(language, undefined);
        });
    });

    suite('Configuration Set Operations', () => {
        test('should set language configuration', async () => {
            await configManager.set('language', SupportedLanguage.French);
            
            assert.strictEqual(mockConfigData.get('language'), SupportedLanguage.French);
        });

        test('should set messageStyle configuration', async () => {
            await configManager.set('messageStyle', MessageStyle.Simple);
            
            assert.strictEqual(mockConfigData.get('messageStyle'), MessageStyle.Simple);
        });

        test('should set useEmoji configuration', async () => {
            await configManager.set('useEmoji', true);
            
            assert.strictEqual(mockConfigData.get('useEmoji'), true);
        });

        test('should set emojiStyle configuration', async () => {
            await configManager.set('emojiStyle', EmojiStyle.GitHub);
            
            assert.strictEqual(mockConfigData.get('emojiStyle'), EmojiStyle.GitHub);
        });

        test('should set customMessage configuration', async () => {
            await configManager.set('customMessage', 'Test message');
            
            assert.strictEqual(mockConfigData.get('customMessage'), 'Test message');
        });

        test('should update existing configuration value', async () => {
            mockConfigData.set('language', SupportedLanguage.English);
            
            await configManager.set('language', SupportedLanguage.Spanish);
            
            assert.strictEqual(mockConfigData.get('language'), SupportedLanguage.Spanish);
        });
    });

    suite('Configuration Target Handling', () => {
        test('should use Global target by default', async () => {
            let capturedTarget: vscode.ConfigurationTarget | undefined;

            // Override update to capture the target
            mockConfiguration.update = async (key: string, value: any, target?: vscode.ConfigurationTarget | boolean) => {
                capturedTarget = target as vscode.ConfigurationTarget;
                mockConfigData.set(key, value);
            };

            await configManager.set('language', SupportedLanguage.English);

            assert.strictEqual(capturedTarget, vscode.ConfigurationTarget.Global);
        });

        test('should accept Workspace target', async () => {
            let capturedTarget: vscode.ConfigurationTarget | undefined;

            mockConfiguration.update = async (key: string, value: any, target?: vscode.ConfigurationTarget | boolean) => {
                capturedTarget = target as vscode.ConfigurationTarget;
                mockConfigData.set(key, value);
            };

            await configManager.set('language', SupportedLanguage.English, vscode.ConfigurationTarget.Workspace);

            assert.strictEqual(capturedTarget, vscode.ConfigurationTarget.Workspace);
        });

        test('should accept WorkspaceFolder target', async () => {
            let capturedTarget: vscode.ConfigurationTarget | undefined;

            mockConfiguration.update = async (key: string, value: any, target?: vscode.ConfigurationTarget | boolean) => {
                capturedTarget = target as vscode.ConfigurationTarget;
                mockConfigData.set(key, value);
            };

            await configManager.set('language', SupportedLanguage.English, vscode.ConfigurationTarget.WorkspaceFolder);

            assert.strictEqual(capturedTarget, vscode.ConfigurationTarget.WorkspaceFolder);
        });
    });

    suite('Get All Configuration', () => {
        test('should return all configuration values', () => {
            mockConfigData.set('language', SupportedLanguage.Korean);
            mockConfigData.set('messageStyle', MessageStyle.Normal);
            mockConfigData.set('useEmoji', false);
            mockConfigData.set('emojiStyle', EmojiStyle.GitHub);
            mockConfigData.set('customMessage', 'Test');

            const allConfig = configManager.getAll();

            assert.strictEqual(allConfig.language, SupportedLanguage.Korean);
            assert.strictEqual(allConfig.messageStyle, MessageStyle.Normal);
            assert.strictEqual(allConfig.useEmoji, false);
            assert.strictEqual(allConfig.emojiStyle, EmojiStyle.GitHub);
            assert.strictEqual(allConfig.customMessage, 'Test');
        });

        test('should return undefined values for unset configuration', () => {
            const allConfig = configManager.getAll();

            assert.strictEqual(allConfig.language, undefined);
            assert.strictEqual(allConfig.messageStyle, undefined);
            assert.strictEqual(allConfig.useEmoji, undefined);
            assert.strictEqual(allConfig.emojiStyle, undefined);
            assert.strictEqual(allConfig.customMessage, undefined);
        });

        test('should return partial configuration when some values are set', () => {
            mockConfigData.set('language', SupportedLanguage.Chinese);
            mockConfigData.set('useEmoji', true);

            const allConfig = configManager.getAll();

            assert.strictEqual(allConfig.language, SupportedLanguage.Chinese);
            assert.strictEqual(allConfig.messageStyle, undefined);
            assert.strictEqual(allConfig.useEmoji, true);
            assert.strictEqual(allConfig.emojiStyle, undefined);
            assert.strictEqual(allConfig.customMessage, undefined);
        });
    });

    suite('Default Value Initialization', () => {
        test('should set default language when not configured', async () => {
            await configManager.setDefaults();

            assert.strictEqual(mockConfigData.get('language'), SupportedLanguage.English);
        });

        test('should set default messageStyle when not configured', async () => {
            await configManager.setDefaults();

            assert.strictEqual(mockConfigData.get('messageStyle'), MessageStyle.Normal);
        });

        test('should set default useEmoji when not configured', async () => {
            await configManager.setDefaults();

            assert.strictEqual(mockConfigData.get('useEmoji'), false);
        });

        test('should set default emojiStyle when not configured', async () => {
            await configManager.setDefaults();

            assert.strictEqual(mockConfigData.get('emojiStyle'), EmojiStyle.GitHub);
        });

        test('should set default customMessage when not configured', async () => {
            await configManager.setDefaults();

            assert.strictEqual(mockConfigData.get('customMessage'), '');
        });

        test('should not override existing language configuration', async () => {
            mockConfigData.set('language', SupportedLanguage.Japanese);

            await configManager.setDefaults();

            assert.strictEqual(mockConfigData.get('language'), SupportedLanguage.Japanese);
        });

        test('should not override existing messageStyle configuration', async () => {
            mockConfigData.set('messageStyle', MessageStyle.Detailed);

            await configManager.setDefaults();

            assert.strictEqual(mockConfigData.get('messageStyle'), MessageStyle.Detailed);
        });

        test('should set all defaults when no configuration exists', async () => {
            await configManager.setDefaults();

            assert.strictEqual(mockConfigData.get('language'), SupportedLanguage.English);
            assert.strictEqual(mockConfigData.get('messageStyle'), MessageStyle.Normal);
            assert.strictEqual(mockConfigData.get('useEmoji'), false);
            assert.strictEqual(mockConfigData.get('emojiStyle'), EmojiStyle.GitHub);
            assert.strictEqual(mockConfigData.get('customMessage'), '');
        });

        test('should only set missing defaults when partial configuration exists', async () => {
            mockConfigData.set('language', SupportedLanguage.German);
            mockConfigData.set('useEmoji', true);

            await configManager.setDefaults();

            // Should preserve existing values
            assert.strictEqual(mockConfigData.get('language'), SupportedLanguage.German);
            assert.strictEqual(mockConfigData.get('useEmoji'), true);
            
            // Should set missing defaults
            assert.strictEqual(mockConfigData.get('messageStyle'), MessageStyle.Normal);
            assert.strictEqual(mockConfigData.get('emojiStyle'), EmojiStyle.GitHub);
            assert.strictEqual(mockConfigData.get('customMessage'), '');
        });
    });

    suite('Type Safety', () => {
        test('should maintain type safety for language values', async () => {
            await configManager.set('language', SupportedLanguage.Arabic);
            const language = configManager.get('language');
            
            // TypeScript should enforce this is SupportedLanguage type
            assert.ok(Object.values(SupportedLanguage).includes(language as SupportedLanguage));
        });

        test('should maintain type safety for messageStyle values', async () => {
            await configManager.set('messageStyle', MessageStyle.Simple);
            const messageStyle = configManager.get('messageStyle');
            
            // TypeScript should enforce this is MessageStyle type
            assert.ok(Object.values(MessageStyle).includes(messageStyle as MessageStyle));
        });

        test('should maintain type safety for boolean values', async () => {
            await configManager.set('useEmoji', true);
            const useEmoji = configManager.get('useEmoji');
            
            assert.strictEqual(typeof useEmoji, 'boolean');
        });
    });
});
