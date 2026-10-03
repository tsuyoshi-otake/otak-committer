import { scanTextForInvisibleUnicode } from '../scripts/lib/invisible-unicode.mjs';

/** @type {import('eslint').Rule.RuleModule} */
export default {
    meta: {
        type: 'problem',
        docs: {
            description:
                'Disallow invisible or display-spoofing Unicode code points that can hide executable payloads from review.',
        },
        schema: [
            {
                type: 'object',
                properties: {
                    allowEmojiPresentation: { type: 'boolean' },
                },
                additionalProperties: false,
            },
        ],
        messages: {
            invisibleUnicode: 'Invisible Unicode character {{escape}} ({{label}}). {{reason}}',
        },
    },

    create(context) {
        const options = context.options[0] ?? {};
        const sourceCode = context.sourceCode;

        return {
            Program(node) {
                for (const finding of scanTextForInvisibleUnicode(sourceCode.getText(), options)) {
                    context.report({
                        node,
                        loc: sourceCode.getLocFromIndex(finding.index),
                        messageId: 'invisibleUnicode',
                        data: {
                            escape: finding.escape,
                            label: finding.label,
                            reason: finding.reason,
                        },
                    });
                }
            },
        };
    },
};
