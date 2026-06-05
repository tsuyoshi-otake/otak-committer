import { COMMIT_PREFIXES, CommitPrefix } from '../constants/commitGuide';
import { TemplateInfo } from '../types';
import {
    extractFilePathsFromDiff,
    generateScopeHint,
    getConventionalCommitsFormat,
    getTraditionalFormat,
} from '../utils/conventionalCommits';
import {
    getMessageLengthLimit,
    PromptGenerationOptions,
    sanitizeTemplateContent,
} from './promptConfig';

export function createCommitPromptContent(
    diff: string,
    language: string,
    messageStyle: string,
    template: TemplateInfo | undefined,
    options: PromptGenerationOptions,
): string {
    if (template) {
        const sanitizedTemplate = sanitizeTemplateContent(template.content);
        return `Based on the following template and Git diff, generate a commit message:

Template:
${sanitizedTemplate}

Git diff:
${diff}

Please follow the template format strictly without any leading newlines.`;
    }

    const prefixDescriptions = getCommitPrefixDescriptions(language);
    const charLimit = getMessageLengthLimit(messageStyle);
    const filePaths = extractFilePathsFromDiff(diff);
    const scopeHint = generateScopeHint(filePaths);
    const formatInstruction = options.useConventionalCommits
        ? getConventionalCommitsFormat(scopeHint)
        : getTraditionalFormat(scopeHint);
    const emojiInstruction = options.useEmoji
        ? 'Feel free to use emojis for emphasis and key points.'
        : 'DO NOT use any emojis in the content.';
    const customInstruction = options.customMessage
        ? `\nAdditional requirements: ${options.customMessage}`
        : '';

    return `Generate a commit message in ${language} for the following Git diff.
Use one of these prefixes:

${prefixDescriptions}

The commit message should follow this format without any leading newlines:
${formatInstruction}

<body>

The total commit message should be under ${charLimit} characters.
The style should be: ${messageStyle}

Git diff:
${diff}

Please provide a clear and ${messageStyle} commit message following the format above.
${options.useBulletList ? 'Format the body as follows: first write a brief summary of the changes in up to 3 lines of prose, then leave a blank line, then list the specific changes as a bullet list (use "- " prefix for each item). Each bullet point should describe one logical change.' : ''}
${emojiInstruction}${customInstruction}`;
}

function getCommitPrefixDescriptions(language: string): string {
    return COMMIT_PREFIXES.map((prefix) => {
        const desc =
            prefix.description[language as keyof CommitPrefix['description']] ||
            prefix.description.english;
        return `${prefix.prefix}: ${desc}`;
    }).join('\n');
}
