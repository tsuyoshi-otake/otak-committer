# Verified project rules

- Public TypeScript exports must use multiline JSDoc with `*/` on the line immediately before the export; the architecture property test does not recognize one-line JSDoc.
- On this machine, the transitive c8/yargs stack is incompatible with the default Node 26 runtime. Coverage can be run with a downloaded VS Code Electron binary under `ELECTRON_RUN_AS_NODE=1` (verified with its Node 22 runtime).
- Keep `.codex/**`, `eslint-rules/**`, and `scripts/**` excluded from VSIX packaging, and inspect the produced archive when validating that a dependency/reference is absent.
