import * as path from 'path';
import { readFile } from 'fs/promises';
import { Logger } from '../infrastructure/logging/Logger';
import { TemplateInfo } from '../types';

const MAX_TEMPLATE_BYTES = 100 * 1024;

async function tryReadFirstTemplate(
    workspaceRoot: string,
    type: 'commit' | 'pr',
    paths: string[],
    logger: Logger,
): Promise<TemplateInfo | undefined> {
    for (const templatePath of paths) {
        const fullPath = path.join(workspaceRoot, templatePath);
        try {
            const content = await readFile(fullPath, 'utf-8');
            if (content) {
                if (Buffer.byteLength(content, 'utf-8') > MAX_TEMPLATE_BYTES) {
                    logger.warning(`Template at ${templatePath} exceeds size limit, skipping`);
                    continue;
                }
                logger.info(`Found ${type} template at ${templatePath}`);
                return { type, content, path: templatePath };
            }
        } catch {
            // File doesn't exist, try next path
        }
    }
    return undefined;
}

export async function findTemplates(
    workspaceRoot: string,
    logger: Logger,
): Promise<{ commit?: TemplateInfo; pr?: TemplateInfo }> {
    const templateDefs = [
        {
            type: 'commit' as const,
            paths: [
                '.gitmessage',
                '.github/commit_template',
                '.github/templates/commit_template.md',
                'docs/templates/commit_template.md',
            ],
        },
        {
            type: 'pr' as const,
            paths: [
                '.github/pull_request_template.md',
                '.github/templates/pull_request_template.md',
                'docs/templates/pull_request_template.md',
            ],
        },
    ];

    const templates: { commit?: TemplateInfo; pr?: TemplateInfo } = {};
    logger.debug('Searching for templates');

    for (const def of templateDefs) {
        const found = await tryReadFirstTemplate(workspaceRoot, def.type, def.paths, logger);
        if (found) {
            templates[def.type] = found;
        }
    }

    return templates;
}
