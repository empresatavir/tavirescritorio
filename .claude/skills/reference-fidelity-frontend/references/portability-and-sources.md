# Portability notes and sources

## Skill portability

The package uses the open `SKILL.md` directory format: required YAML `name` and `description`, with optional relative scripts, references, and templates. Hosts differ in discovery and permissions; a folder alone does not override system instructions or enforce compliance. When discovery is unavailable, invoke the skill explicitly by providing its `SKILL.md`.

- Claude Code project scope: `.claude/skills/reference-fidelity-frontend/SKILL.md`; personal scope: `~/.claude/skills/reference-fidelity-frontend/SKILL.md`.
- Codex repository scope: `.agents/skills/reference-fidelity-frontend/SKILL.md`; personal scope: `~/.agents/skills/reference-fidelity-frontend/SKILL.md`.
- Other compatible agents: follow the host's documented skill directory or load `SKILL.md` explicitly. Preserve the complete folder so its bundled resources remain available.

Check host documentation for current installation behavior before team-wide/plugin distribution.

## Design basis consulted

- [Agent Skills specification](https://agentskills.io/specification) — folder structure, metadata constraints, references, scripts, and progressive disclosure.
- [Claude Code: Extend Claude with skills](https://code.claude.com/docs/en/skills) — project/personal discovery paths, skill invocation, and bundling scripts.
- [OpenAI: Build skills for ChatGPT and Codex](https://learn.chatgpt.com/docs/build-skills) — Codex skill structure and repository/user scopes.
- [Anthropic frontend-design skill](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md) — planning, using supplied context, screenshot review, and critique. This reference focuses on design creation; this skill intentionally differs by making fidelity to the user's supplied reference override creative redesign.
- [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots) — screenshot baselines, rendering variance across environments, and tolerance-based pixel comparisons.
- [Playwright screenshots](https://playwright.dev/docs/screenshots) — viewport/full-page and element screenshots.
- [Playwright locators](https://playwright.dev/docs/locators) — recommended accessible role/name locators and their auto-waiting behavior.
- [Playwright Page API](https://playwright.dev/docs/api/class-page) — navigation and screenshot methods used by the capture runner.

The bundled comparator is deliberately transparent and dependency-light. It uses per-pixel RGB agreement, not Playwright's implementation or a learned perceptual score; see `capture-and-report.md` for the exact definition and limitations.
