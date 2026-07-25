/**
 * One fixed diff and its coarse semantic expectations for model quality evaluation.
 */
export interface CommitModelEvalCase {
    id: string;
    description: string;
    diff: string;
    expectedTypes: string[];
    expectedTerms: string[];
}

/**
 * Stable, representative commit diffs used for blinded GPT-5.4/Luna comparisons.
 */
export const COMMIT_MODEL_EVAL_CASES: readonly CommitModelEvalCase[] = [
    {
        id: 'bug-null-session',
        description: 'Null-session bug fix',
        expectedTypes: ['fix'],
        expectedTerms: ['session', 'null'],
        diff: `diff --git a/src/auth/session.ts b/src/auth/session.ts
--- a/src/auth/session.ts
+++ b/src/auth/session.ts
@@ -18,7 +18,10 @@ export function getUserName(session?: Session): string {
-  return session.user.name;
+  if (!session?.user) {
+    return 'anonymous';
+  }
+  return session.user.name;
 }`,
    },
    {
        id: 'feature-cache',
        description: 'Add response caching',
        expectedTypes: ['feat'],
        expectedTerms: ['cache', 'response'],
        diff: `diff --git a/src/http/client.ts b/src/http/client.ts
--- a/src/http/client.ts
+++ b/src/http/client.ts
@@ -2,6 +2,13 @@
+const responseCache = new Map<string, Response>();
 export async function get(url: string): Promise<Response> {
-  return fetch(url);
+  const cached = responseCache.get(url);
+  if (cached) return cached.clone();
+  const response = await fetch(url);
+  responseCache.set(url, response.clone());
+  return response;
 }`,
    },
    {
        id: 'refactor-parser',
        description: 'Extract parser responsibility',
        expectedTypes: ['refactor'],
        expectedTerms: ['parser', 'extract'],
        diff: `diff --git a/src/config/index.ts b/src/config/index.ts
--- a/src/config/index.ts
+++ b/src/config/index.ts
@@ -1,8 +1,4 @@
-export function load(raw: string) {
-  const parsed = JSON.parse(raw);
-  return validate(parsed);
-}
+export { load } from './parser';
diff --git a/src/config/parser.ts b/src/config/parser.ts
new file mode 100644
+export function load(raw: string) {
+  return validate(JSON.parse(raw));
+}`,
    },
    {
        id: 'docs-installation',
        description: 'Clarify installation documentation',
        expectedTypes: ['docs'],
        expectedTerms: ['install', 'node'],
        diff: `diff --git a/README.md b/README.md
--- a/README.md
+++ b/README.md
@@ -10,6 +10,9 @@
 ## Installation
+Requires Node.js 20 or newer.
+
 npm install
+npm run build`,
    },
    {
        id: 'test-retry',
        description: 'Cover retry exhaustion',
        expectedTypes: ['test'],
        expectedTerms: ['retry', 'exhaust'],
        diff: `diff --git a/test/retry.test.ts b/test/retry.test.ts
--- a/test/retry.test.ts
+++ b/test/retry.test.ts
@@ -20,4 +20,11 @@
+it('stops after the configured retry limit', async () => {
+  const operation = sinon.stub().rejects(new Error('offline'));
+  await assert.rejects(runWithRetry(operation, 2));
+  assert.equal(operation.callCount, 3);
+});`,
    },
    {
        id: 'build-target',
        description: 'Update TypeScript build target',
        expectedTypes: ['build', 'chore'],
        expectedTerms: ['typescript', 'target'],
        diff: `diff --git a/tsconfig.json b/tsconfig.json
--- a/tsconfig.json
+++ b/tsconfig.json
@@ -2,5 +2,5 @@
   "compilerOptions": {
-    "target": "ES2020"
+    "target": "ES2022"
   }`,
    },
    {
        id: 'security-redaction',
        description: 'Redact bearer credentials',
        expectedTypes: ['fix'],
        expectedTerms: ['redact', 'bearer'],
        diff: `diff --git a/src/logging/redact.ts b/src/logging/redact.ts
--- a/src/logging/redact.ts
+++ b/src/logging/redact.ts
@@ -4,5 +4,7 @@ export function redact(message: string): string {
-  return message.replace(API_KEY_PATTERN, '[REDACTED]');
+  return message
+    .replace(API_KEY_PATTERN, '[REDACTED]')
+    .replace(/Bearer\\s+\\S+/gi, 'Bearer [REDACTED]');
 }`,
    },
    {
        id: 'remove-legacy-endpoint',
        description: 'Remove obsolete API route',
        expectedTypes: ['refactor', 'chore'],
        expectedTerms: ['legacy', 'route'],
        diff: `diff --git a/src/routes.ts b/src/routes.ts
--- a/src/routes.ts
+++ b/src/routes.ts
@@ -8,7 +8,6 @@ export const routes = [
   healthRoute,
-  legacyUsersRoute,
   usersRoute,
 ];`,
    },
    {
        id: 'rename-timeout',
        description: 'Rename timeout setting',
        expectedTypes: ['refactor'],
        expectedTerms: ['timeout', 'rename'],
        diff: `diff --git a/src/options.ts b/src/options.ts
similarity index 82%
rename from src/requestTimeout.ts
rename to src/options.ts
@@ -1,3 +1,3 @@
-export const requestTimeout = 30000;
+export const validationTimeout = 30000;`,
    },
    {
        id: 'localize-cancel',
        description: 'Add Japanese cancellation translation',
        expectedTypes: ['i18n', 'feat'],
        expectedTerms: ['japanese', 'cancel'],
        diff: `diff --git a/locales/ja.json b/locales/ja.json
--- a/locales/ja.json
+++ b/locales/ja.json
@@ -2,5 +2,6 @@
 {
   "save": "保存",
+  "cancel": "キャンセル",
   "close": "閉じる"
 }`,
    },
];
