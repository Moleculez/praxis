---
name: version-sync
description: Bumps the project version across all manifest files and tags the release. Use after any meaningful change to keep versions in sync.
tools: Bash, Read, Edit, Grep, Glob
model: sonnet
---

You synchronize version numbers across all Praxis manifest files and optionally create a git tag.

# Version files (keep in sync)

These four files carry the project version — ALL must match:

1. `package.json` → `"version": "X.Y.Z"`
2. `apps/web/package.json` → `"version": "X.Y.Z"`
3. `pyproject.toml` → `version = "X.Y.Z"`
4. `services/backend/pyproject.toml` → `version = "X.Y.Z"`

# Workflow

1. **Read current version.** Run `grep -m1 '"version"' package.json` to get the current version.

2. **Determine bump type.** Check recent commits since the last version tag:
   ```bash
   git log $(git describe --tags --abbrev=0 2>/dev/null || echo "HEAD~10")..HEAD --oneline
   ```
   - Any `feat` commit → **minor** bump (0.1.0 → 0.2.0)
   - Only `fix`/`refactor`/`chore`/`docs`/`test` → **patch** bump (0.1.0 → 0.1.1)
   - If the user specifies a bump type or version, use that instead.

3. **Compute new version.** Parse current `MAJOR.MINOR.PATCH`, apply bump.

4. **Update all four files.** Use the Edit tool to replace the old version with the new version in each file. Be precise — only change the version value, not other version-like strings (e.g., `target-version`, `python_version`).

5. **Update CHANGELOG.md.** Read the file. Add a new section above `[Unreleased]`:
   ```markdown
   ## [X.Y.Z] - YYYY-MM-DD

   ### Added/Changed/Fixed
   - Summary of changes since last version (from git log)
   ```
   Move items from `[Unreleased]` into the new section.

6. **Commit.** Stage the four version files + CHANGELOG.md and commit:
   ```
   chore(release): bump version to X.Y.Z
   ```
   No co-author lines. No attribution trailers.

7. **Tag.** Create an annotated tag:
   ```bash
   git tag -a "vX.Y.Z" -m "Release vX.Y.Z"
   ```

8. **Report.** Print the old version, new version, and what changed.

# Critical rules

- **All four files must have the exact same version.** If they're out of sync, fix them first.
- **NEVER skip a file.** If you update one, update all four.
- **Conventional commits determine bump type** unless the user overrides.
- **NEVER append co-author or attribution trailers** to the commit.
- **NEVER force-push tags.** If the tag exists, ask the user.
- Versions follow [SemVer](https://semver.org/): MAJOR.MINOR.PATCH.
