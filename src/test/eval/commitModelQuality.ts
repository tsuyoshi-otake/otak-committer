import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createOpenAIClient } from '../../services/openaiClient';
import { createOpenAIConnectionContext } from '../../services/openaiConnection';
import { requestTextCompletion } from '../../services/openai.completion';
import { COMMIT_MODEL_EVAL_CASES, type CommitModelEvalCase } from './commitModelEvalFixtures';

type EvaluatedModel = 'gpt-5.6-luna' | 'gpt-6-luna';

interface AutomaticChecks {
    nonEmpty: boolean;
    conventionalType: boolean;
    expectedType: boolean;
    expectedTerms: boolean;
    withinLengthLimit: boolean;
    noCodeFence: boolean;
}

interface ModelOutput {
    model: EvaluatedModel;
    output: string;
    checks: AutomaticChecks;
}

interface CaseResult {
    fixture: CommitModelEvalCase;
    outputs: ModelOutput[];
}

const MODELS: readonly EvaluatedModel[] = ['gpt-5.6-luna', 'gpt-6-luna'];
const CONVENTIONAL_SUBJECT =
    /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert|i18n)(\([^)]+\))?:\s+\S+/i;

function buildPrompt(fixture: CommitModelEvalCase): string {
    return `Generate one English commit message for this Git diff.
Use Conventional Commits. Start with a concise subject, then add a short body only when useful.
Do not use Markdown code fences. Do not invent changes. Keep the complete message under 1200 characters.

Git diff:
${fixture.diff}`;
}

function runAutomaticChecks(fixture: CommitModelEvalCase, output: string): AutomaticChecks {
    const normalized = output.toLowerCase();
    const subjectType = output.match(/^([a-z]+)/i)?.[1]?.toLowerCase();
    return {
        nonEmpty: output.trim().length > 0,
        conventionalType: CONVENTIONAL_SUBJECT.test(output.split(/\r?\n/, 1)[0]),
        expectedType: !!subjectType && fixture.expectedTypes.includes(subjectType),
        expectedTerms: fixture.expectedTerms.every((term) =>
            normalized.includes(term.toLowerCase()),
        ),
        withinLengthLimit: output.length <= 1200,
        noCodeFence: !output.includes('```'),
    };
}

async function generateOutput(
    fixture: CommitModelEvalCase,
    model: EvaluatedModel,
    apiKey: string,
    baseURL: string | undefined,
): Promise<ModelOutput> {
    const connection = createOpenAIConnectionContext(apiKey, baseURL);
    const output =
        (await requestTextCompletion({
            openai: createOpenAIClient(connection),
            model,
            systemPrompt:
                'You are an experienced software engineer writing accurate commit messages.',
            userPrompt: buildPrompt(fixture),
            maxCompletionTokens: 5000,
            reasoningEffort: 'high',
        })) ?? '';

    return {
        model,
        output,
        checks: runAutomaticChecks(fixture, output),
    };
}

function createBlindReview(results: CaseResult[]): {
    markdown: string;
    manifest: Record<string, Record<'A' | 'B', EvaluatedModel>>;
} {
    const manifest: Record<string, Record<'A' | 'B', EvaluatedModel>> = {};
    const sections = results.map((result) => {
        const [first, second] =
            crypto.randomInt(2) === 0 ? result.outputs : [result.outputs[1], result.outputs[0]];
        manifest[result.fixture.id] = { A: first.model, B: second.model };
        return `## ${result.fixture.id}: ${result.fixture.description}

### Candidate A

\`\`\`text
${first.output}
\`\`\`

### Candidate B

\`\`\`text
${second.output}
\`\`\`

Score each candidate from 1 (poor) to 5 (excellent):

| Criterion | A | B |
| --- | ---: | ---: |
| Correctness / no invented changes |  |  |
| Coverage of material changes |  |  |
| Conventional Commit format |  |  |
| Clarity and concision |  |  |
| Overall preference |  |  |

Notes:
`;
    });

    return {
        manifest,
        markdown: `# Blinded commit-model quality review

Review all ten cases without opening \`manifest.json\`. A migration passes when GPT-6 Luna has no material correctness regression, no systematic loss of change coverage, and its aggregate human score is not lower than GPT-5.6 Luna by more than 5%.

${sections.join('\n\n')}`,
    };
}

async function main(): Promise<void> {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
        throw new Error(
            'OPENAI_API_KEY is required. Store it in .env.local with dotenvx before running this paid evaluation.',
        );
    }

    const results: CaseResult[] = [];
    for (const fixture of COMMIT_MODEL_EVAL_CASES) {
        // Bound concurrency to two paid calls: one candidate per model for this fixture.
        const outputs = await Promise.all(
            MODELS.map((model) =>
                generateOutput(fixture, model, apiKey, process.env.OPENAI_BASE_URL),
            ),
        );
        results.push({ fixture, outputs });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDirectory = path.join(os.homedir(), 'tmp', 'otak-committer-eval', timestamp);
    fs.mkdirSync(outputDirectory, { recursive: true });

    const blindReview = createBlindReview(results);
    fs.writeFileSync(
        path.join(outputDirectory, 'responses.json'),
        JSON.stringify(results, null, 2),
        'utf8',
    );
    fs.writeFileSync(
        path.join(outputDirectory, 'manifest.json'),
        JSON.stringify(blindReview.manifest, null, 2),
        'utf8',
    );
    fs.writeFileSync(path.join(outputDirectory, 'blind-review.md'), blindReview.markdown, 'utf8');

    console.log(`Quality evaluation written to ${outputDirectory}`);
}

void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
