# Design: Read Instruction File References in Run Command

**Date:** 2026-03-08
**Status:** Approved
**Package:** @automagent/cli

## Problem

`resolveInstructions()` in `run.ts` returns a placeholder string `[System prompt from file: <path>]` when `instructions.system` is a file reference (`{file: "path"}`). It should read the actual file content.

## Change

Update `resolveInstructions()` to:
1. Accept an optional `yamlDir` parameter (directory of the agent.yaml file)
2. When encountering a file reference, resolve the path relative to `yamlDir` and read with `readFileSync`
3. Throw if the file doesn't exist or can't be read

## Files Changed

1. **Edit:** `packages/cli/src/commands/run.ts` — add `readFileSync`/`existsSync` imports, update `resolveInstructions` to read files, pass `yamlDir` from caller
2. **Edit:** `packages/cli/src/commands/__tests__/schema-contract.test.ts` — update file ref test, add test that reads actual file content
