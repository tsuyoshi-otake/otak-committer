import * as vscode from 'vscode';
import { ConfigManager } from '../infrastructure/config/ConfigManager.js';
import { t } from '../i18n/index.js';
import { LANGUAGE_CONFIGS } from '../languages/index.js';
import { MessageStyle } from '../types/enums/MessageStyle.js';

export function getLanguageLabel(language: string): string | undefined {
    return LANGUAGE_CONFIGS[language as keyof typeof LANGUAGE_CONFIGS]?.label;
}

export function buildStatusBarText(
    repoIcon: string,
    isPublicRepo: boolean | null,
    languageLabel: string,
): string {
    const visibilityLabel =
        isPublicRepo === true
            ? t('statusBar.public')
            : isPublicRepo === false
              ? t('statusBar.private')
              : '';

    return visibilityLabel
        ? `${repoIcon} ${visibilityLabel}: ${languageLabel}`
        : `${repoIcon} ${languageLabel}`;
}

export function buildStatusBarTooltip(config: Pick<ConfigManager, 'get'>): vscode.MarkdownString {
    const tooltip = new vscode.MarkdownString();
    tooltip.isTrusted = {
        enabledCommands: ['otak-committer.setApiKey', 'otak-committer.openSettings'],
    };
    tooltip.supportThemeIcons = true;

    const messageStyle = config.get('messageStyle') || MessageStyle.Normal;

    tooltip.appendMarkdown(`${t('statusBar.configuration')}\n\n`);
    tooltip.appendMarkdown(`${t('statusBar.currentStyle')}: ${messageStyle}\n\n`);
    tooltip.appendMarkdown(`---\n\n`);
    tooltip.appendMarkdown(
        `$(key) [${t('statusBar.setApiKey')}](command:otak-committer.setApiKey) &nbsp;&nbsp; ` +
            `$(gear) [${t('statusBar.openSettings')}](command:otak-committer.openSettings)`,
    );

    return tooltip;
}
