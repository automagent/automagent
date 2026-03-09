# Automagent Versioning Policy

This document defines the versioning, release, and publishing policy for the two packages in the automagent monorepo:

| Package | npm name | Current version |
|---------|----------|----------------|
| Schema | `@automagent/schema` | 0.1.0 |
| CLI | `automagent` | 0.1.0 |

---

## 1. Semver Rules for Schema Changes

`@automagent/schema` is the contract that all consumers depend on. Every change to the JSON Schema (`v1.schema.json`, `compose.schema.json`), the TypeScript types, or the validator constitutes a public API change and must be versioned carefully.

The guiding principle: **will this change cause a previously-valid `agent.yaml` to become invalid, or a previously-working consumer to break?**

### 1.1 Patch bump (0.1.x)

Changes that are invisible to existing consumers:

- **Bug fixes in validation logic** (e.g., the Ajv validator was incorrectly rejecting valid input).
- **Documentation-only changes** to schema `description` fields.
- **Internal refactors** that do not change the schema shape, exported types, or validation behavior.

### 1.2 Minor bump (0.x.0)

Changes that are **backward-compatible** -- existing valid YAML files remain valid, existing TypeScript code continues to compile:

| Change | Bump | Rationale |
|--------|------|-----------|
| Adding a new **optional** field | **minor** | Existing files without the field remain valid. Consumers using index signatures (`[key: string]: unknown`) are unaffected. |
| Adding a new **enum value** (e.g., a new `kind` or `workflow.type`) | **minor** | Existing files never use the new value, so they remain valid. Consumers doing exhaustive switches may get warnings, but that is expected for minor bumps. |
| **Loosening** validation -- removing `required`, removing `pattern`, increasing `maxLength`, removing `minLength` | **minor** | Previously-valid files remain valid. Previously-invalid files may become valid, which is a feature, not a breakage. |
| Adding a new **exported function or type** | **minor** | Additive API surface. |
| Adding a new **definition** (`$ref`) to the schema | **minor** | Existing files are unaffected. |

### 1.3 Major bump (x.0.0)

Changes that **break backward compatibility** -- some previously-valid YAML files will fail validation, or existing TypeScript consumers will get compile errors:

| Change | Bump | Rationale |
|--------|------|-----------|
| Adding a new **required** field | **MAJOR** | Existing files that lack the field will fail validation. |
| **Changing a field's type** (e.g., `string` to `object`, `string` to `number`) | **MAJOR** | Existing files with the old type will fail validation; existing TS code will not compile. |
| **Removing a field** from the schema or types | **MAJOR** | Consumers referencing the field will break. |
| **Renaming a field** | **MAJOR** | Equivalent to removing the old name and adding a new required one. |
| **Tightening validation** -- adding a new `pattern`, reducing `maxLength`, adding `minLength`, adding `required` to a nested object | **MAJOR** | Previously-valid files may become invalid. |
| **Removing an enum value** | **MAJOR** | Files using that value will fail validation. |
| **Changing the `$id`** of a schema | **MAJOR** | External tooling referencing the schema by URI will break. |
| **Removing or renaming an exported function or type** | **MAJOR** | Importing consumers will break at compile time. |

### 1.4 Gray areas

- **Adding a new enum value to `transport`** (currently `"stdio" | "streamable-http"`): This is a minor bump. The TypeScript union type grows, but existing code only uses existing values. Consumers doing exhaustive matching should have a default case.
- **Changing `additionalProperties` from `true` to `false`**: This is a **major** bump. Any file that has extra fields will suddenly fail validation.
- **Adding a `default` value to an existing field**: This is a **patch** bump. It changes documentation/tooling hints but not validation.

---

## 2. Schema-CLI Version Coupling

### 2.1 Dependency range

The CLI currently declares:

```json
"@automagent/schema": "^0.1.0"
```

**This is incorrect for pre-1.0 semver.** Under semver, `^0.1.0` is equivalent to `>=0.1.0 <0.2.0`. This means a minor bump (0.1.0 -> 0.2.0) in the schema would *not* be picked up by the CLI automatically. That is actually reasonable for pre-1.0 where minor bumps can contain breaking changes (see Section 3).

**Recommendation: keep `^0.1.0` during the 0.x series.** This gives you a safety net -- when the schema makes a breaking change and bumps to 0.2.0, the CLI will not accidentally pull it in. You must explicitly update the CLI's dependency range when upgrading.

After 1.0.0, the same `^` behavior will correctly auto-upgrade within major versions:
- `^1.0.0` means `>=1.0.0 <2.0.0` -- correct for semver.

### 2.2 Version synchronization

The CLI and schema versions **do not need to be identical**. They are separate packages with separate release cadences.

However, maintain a clear compatibility matrix in release notes:

| automagent | @automagent/schema |
|-----------------|-------------------|
| 0.1.x | 0.1.x |
| 0.2.x | 0.1.x or 0.2.x |

### 2.3 When to bump the CLI

- **Schema minor/major bump**: Always release a new CLI version that updates the schema dependency, even if no CLI code changed. This is a **minor** bump for the CLI (dependency update).
- **CLI-only changes** (new commands, bug fixes, output formatting): Follow normal semver for the CLI independently.
- **CLI depends on new schema features**: Bump the CLI's minimum schema version in `package.json` and do a minor CLI bump.

---

## 3. Pre-1.0 Policy

### 3.1 What 0.x means

Per semver, 0.x.y is the "initial development" phase. The public API is not considered stable. In practice, for automagent:

- **0.x minor bumps (0.1.0 -> 0.2.0)** may contain breaking changes to the schema. This is the pre-1.0 equivalent of a major bump.
- **0.x patch bumps (0.1.0 -> 0.1.1)** should remain backward-compatible.
- Communicate breaking changes clearly in release notes even during 0.x. Users deserve fair warning.

### 3.2 Stability guarantees during 0.x

- The three required fields (`name`, `description`, `model`) are considered stable and will not be removed.
- The `apiVersion` field exists specifically to allow future schema evolution. If a V2 schema is introduced, V1 files will continue to validate against the V1 schema.
- The `additionalProperties: true` setting on most objects is intentional and will remain, ensuring forward compatibility.
- TypeScript types may change shape between minor versions. Pin your `@automagent/schema` version with `~` or exact versions if you need stability.

### 3.3 Criteria for 1.0.0

The schema should reach 1.0.0 when all of the following are true:

1. **Real-world validation.** At least 3-5 non-trivial agent definitions have been written against the schema by people other than the author.
2. **Stable required fields.** The set of required fields (`name`, `description`, `model`) has not changed in at least 2 minor releases.
3. **Stable core types.** The TypeScript types for `AgentDefinition` and `ComposeDefinition` have not had breaking changes in at least 2 minor releases.
4. **Validator coverage.** The Ajv validator correctly handles all documented fields and edge cases, with a comprehensive test suite.
5. **Tooling ecosystem signal.** At least one external tool (IDE extension, CI plugin, or third-party framework adapter) consumes the schema.
6. **Documentation.** A complete schema reference exists with examples for every top-level field.

**Target: 1.0.0 should not be rushed. Stay at 0.x until you are confident the schema shape is right. Changing a 1.x schema is expensive.**

---

## 4. Release Checklist

Run through this list for every release:

### 4.1 Before starting

- [ ] All changes are committed and pushed to the main branch.
- [ ] `npm run test --workspaces` passes.
- [ ] `npm run lint --workspaces` passes.
- [ ] `npm run build --workspaces` succeeds with no errors.

### 4.2 Version decision

- [ ] Determine which package(s) changed since the last release.
- [ ] Classify every change using the rules in Section 1 (patch/minor/major).
- [ ] Pick the highest bump level across all changes for each package.
- [ ] If schema bumped, determine whether CLI needs a corresponding bump.

### 4.3 Version bump

- [ ] Update `version` in the changed package(s)' `package.json`.
- [ ] If schema was bumped, update `@automagent/schema` version range in `packages/cli/package.json`.
- [ ] Run `npm install` at the root to update `package-lock.json`.

### 4.4 Validation

- [ ] Run `npm run build --workspaces` again after version changes.
- [ ] Run `npm run test --workspaces` again after version changes.
- [ ] Manually test: `node packages/cli/dist/index.js validate` against a sample `agent.yaml`.

### 4.5 Publish

- [ ] Publish `@automagent/schema` first (CLI depends on it).
- [ ] Publish `automagent` second.
- [ ] Verify both packages are visible on npmjs.com.

### 4.6 Post-publish

- [ ] Create a git tag for each published package (e.g., `schema-v0.2.0`, `cli-v0.2.0`).
- [ ] Push tags.
- [ ] Write release notes on GitHub describing what changed and any migration steps.

---

## 5. How to Publish

### 5.1 Prerequisites

```bash
# Ensure you are logged in to npm
npm whoami
# Should print your npm username. If not:
npm login
```

### 5.2 Schema-only release

```bash
# 1. Bump version (choose one)
cd /path/to/automagent
npm version patch --workspace=packages/schema   # 0.1.0 -> 0.1.1
npm version minor --workspace=packages/schema   # 0.1.0 -> 0.2.0
npm version major --workspace=packages/schema   # 0.1.0 -> 1.0.0

# 2. Rebuild
npm run build --workspace=packages/schema

# 3. Run tests
npm run test --workspace=packages/schema

# 4. Publish
npm publish --workspace=packages/schema

# 5. Tag
git add .
git commit -m "release: @automagent/schema v$(node -p "require('./packages/schema/package.json').version")"
git tag "schema-v$(node -p "require('./packages/schema/package.json').version")"
git push && git push --tags
```

### 5.3 CLI-only release (no schema change)

```bash
# 1. Bump version
npm version patch --workspace=packages/cli   # or minor/major

# 2. Rebuild
npm run build --workspace=packages/cli

# 3. Run tests
npm run test --workspace=packages/cli

# 4. Publish
npm publish --workspace=packages/cli

# 5. Tag
git add .
git commit -m "release: automagent v$(node -p "require('./packages/cli/package.json').version")"
git tag "cli-v$(node -p "require('./packages/cli/package.json').version")"
git push && git push --tags
```

### 5.4 Coordinated release (both packages)

This is the most common case when the schema changes and the CLI must update its dependency.

```bash
# 1. Bump schema version
npm version minor --workspace=packages/schema   # example: 0.1.0 -> 0.2.0

# 2. Update CLI's dependency on schema
#    Edit packages/cli/package.json manually:
#    "@automagent/schema": "^0.2.0"
#
#    Then bump CLI version:
npm version minor --workspace=packages/cli      # example: 0.1.0 -> 0.2.0

# 3. Update lockfile
npm install

# 4. Build both (schema first, CLI second -- npm workspaces respects topo order)
npm run build

# 5. Test both
npm run test

# 6. Publish schema FIRST
npm publish --workspace=packages/schema

# 7. Publish CLI SECOND (it depends on the schema being available on npm)
npm publish --workspace=packages/cli

# 8. Commit and tag
git add .
git commit -m "release: @automagent/schema v$(node -p "require('./packages/schema/package.json').version"), automagent v$(node -p "require('./packages/cli/package.json').version")"
git tag "schema-v$(node -p "require('./packages/schema/package.json').version")"
git tag "cli-v$(node -p "require('./packages/cli/package.json').version")"
git push && git push --tags
```

### 5.5 Dry run

To verify what would be published without actually publishing:

```bash
npm publish --workspace=packages/schema --dry-run
npm publish --workspace=packages/cli --dry-run
```

This shows the tarball contents and catches common mistakes (missing `files`, wrong `main` path, etc.).

### 5.6 Unpublish safety

npm allows unpublishing within 72 hours of publishing. If you publish a broken version:

```bash
npm unpublish @automagent/schema@0.2.0
```

Prefer publishing a fixed patch version over unpublishing when possible.

---

## Appendix: Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-07 | Adopt this versioning policy | Need clear rules before publishing 0.2.0 |
| 2026-03-07 | Keep `^0.x.0` caret ranges during pre-1.0 | Caret at 0.x only allows patch updates, providing natural breakage protection |
| 2026-03-07 | Use separate version numbers for schema and CLI | They have different release cadences; lockstep versioning creates phantom releases |
| 2026-03-07 | Tag format: `schema-v0.x.y` / `cli-v0.x.y` | Distinguishes which package a tag refers to in a monorepo |
