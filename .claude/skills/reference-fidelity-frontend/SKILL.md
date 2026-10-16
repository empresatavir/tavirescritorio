---
name: reference-fidelity-frontend
description: Recreates web and mobile interfaces from supplied HTML, screenshots, design files, or an existing UI as the controlling source of truth; preserves screens, modals, labels, and fields across frontend languages and produces per-screen screenshot/semantic comparisons. Use for reference-driven UI implementation, pixel fidelity, Playwright capture, visual regression, and design matching.
---

# Reference-Fidelity Frontend

## Non-negotiable objective

Implement the supplied reference, not a redesign inspired by it. Treat the reference directory/files as the visual source of truth. Match **every supplied screen and state** as closely as the target platform permits, regardless of whether the implementation uses Flutter, native Android/iOS, React Native, web technologies, or another stack.

A skill is an instruction package, not an enforcement mechanism: never claim it can technically force a model to comply. Make compliance inspectable with a screen inventory, screenshots, explicit diffs, and an honest report. Do not claim completion until every in-scope screen has been captured and reported.

## Required workflow

1. **Inventory before edits.** Inspect the repository, target platform, all reference files, assets, fonts, and supplied HTML. Identify each unique screen, state, viewport/device size, and navigation path. Inventory visible copy, headings, labels, field labels/placeholders, controls, icons, and dialogs. For HTML references, inspect source/DOM and assets; do not infer the design from a thumbnail alone. List each modal/drawer and the exact action that opens it as its own screen/state. Make `visual/SCREEN-MAP.md` listing stable ID, source file/artboard, state, viewport/device/orientation, route or reproduction steps, and screenshot filename. Record unknowns rather than silently inventing them.
2. **Extract the visual contract.** Record exact colors, typography, weights, line heights, spacing, dimensions, radii, borders, shadows, icons, imagery, alignment, density, safe areas, status/navigation bars, and component states. Reuse supplied assets and font files. Preserve copy, values, ordering, and visible content. Read `references/visual-fidelity-protocol.md` before implementation.
3. **Resolve ambiguity conservatively.** Prefer explicit reference evidence and the existing codebase. If two reference artifacts conflict, use the clearest/latest artifact and document the choice in the screen map. Ask only when an unresolved decision would materially change product behavior or the visual target. Never fill gaps by applying a generic design system.
4. **Implement the full interface.** Use the project's established stack and conventions; the framework is not a reason to alter appearance. Build all screens and states in the inventory. Keep visual tokens centralized when practical. Do not simplify, omit, reorder, modernize, or substitute details. Treat platform-specific safe areas, system chrome, fonts, and controls as explicit differences to minimize and disclose—not permission to redesign.
5. **Capture actual outputs.** For web/HTML references, define screen-specific, explicit interaction actions in `visual/playwright-screens.json`, then run the bundled Playwright capture script (see `references/capture-and-report.md`). It captures the reference and candidate in fresh pages, records visible text/semantic controls, fields, and dialog markup into JSON, and can launch both reports automatically. For native mobile, use platform inspection/accessibility hierarchy tools separately for labels and controls, then capture on a device/emulator/simulator and save PNGs to `visual/actual/` using mapped filenames. Match the reference viewport, device scale/orientation, content, interaction state, and scroll position. Use a stable environment and suppress animation/caret/volatile content consistently where possible. Do not resize screenshots to make mismatched layouts look similar. Do not blindly click every button; specify the exact action sequence and expected state for each screen.
6. **Compare, repair, repeat.** If not using the Playwright runner, run the bundled tool:

   ```bash
   python3 -m pip install -r "$SKILL_DIR/requirements.txt"
   python3 "$SKILL_DIR/scripts/compare_screens.py" \
     --reference visual/reference \
     --candidate visual/actual \
     --output visual/report \
     --threshold 12
   ```

   Replace `$SKILL_DIR` with this skill's installed directory (or invoke the script by its absolute path). Keep each reference/candidate pair under the same relative filename, e.g. `home.png`. Review the generated HTML report, especially low-scoring screens and highlighted diffs. Fix the implementation, recapture, and rerun until all screens are represented and remaining deviations are either eliminated or specifically explained. Never adjust the source reference to improve the score.
7. **Deliver evidence.** Provide the working implementation and `visual/report/report.html` (plus `metrics.json` and comparison images). Summarize screen coverage, the overall score, per-screen scores, viewport/environment, outstanding deviations, and how to rerun the report. State clearly if any screen could not be captured or compared. Do not present a score as expert human judgment or as proof of functional correctness.

## Acceptance gates

- Every reference screen/state maps to a candidate capture; missing candidate screens are failures, not exclusions.
- Include each relevant modal/dialog/drawer as an explicit open state; a closed or untriggered modal cannot be visually verified from the base screen.
- Review the semantic text/control comparison for missing labels, field placeholders, button names, headings, and dialog names; use deterministic/sanitized test data.
- Each valid pair uses matching pixel dimensions. If dimensions differ, correct the capture setup or report the comparison as invalid; never silently stretch, crop, or scale one image to fit.
- Review side-by-side, 50% overlay, and difference visualization—not the percentage alone.
- No known unreviewed visual regressions, clipped/overflowing content, missing assets, or substituted copy remain.
- Separate functional checks (navigation, interactions, accessibility/platform behavior) from visual similarity; a pixel score cannot certify those.
- Explain unavoidable platform-rendering and dynamic-content differences. Keep such exceptions narrow and auditable.

## Bundled resources

- Read `references/visual-fidelity-protocol.md` for the detail-preservation rules and handling of platform differences.
- Read `references/capture-and-report.md` for the Playwright runner, capture setup, pairing, metric interpretation (including font/anti-aliasing limits), and delivery conventions.
- Read `references/portability-and-sources.md` for installation locations and design/source references.
- Use `templates/SCREEN-MAP.example.md` to inventory screens.
- Use `templates/playwright-screens.example.json` as the action-manifest starting point for web references.
- Run `scripts/capture_playwright.mjs` for declarative web capture and automatic comparison; it requires Playwright and a locally installed Chromium browser.
- It also writes per-screen semantic inventories and `visual/semantics/report.html`; read `references/capture-and-report.md` for coverage limits and privacy controls.
- Run `scripts/compare_screens.py` to produce a portable, static HTML comparison report. It uses Pillow; install from `requirements.txt`.

## Functional QA companion

For behavior-focused QA—walking through buttons, forms, navigation, dialogs, and mobile app journeys as a user—use the separate `frontend-user-journey-qa` skill. Keep its UI/API test results distinct from this skill's pixel-similarity score; visual matching alone does not prove a flow works.

## Portability and invocation

Keep the skill folder intact so its relative `scripts/`, `references/`, and `templates/` paths work. Install it in the host's supported skills directory or explicitly tell the agent to read its `SKILL.md`. Claude Code and Codex discover skills when installed in their documented locations; other agents may need explicit invocation. This skill does not assume a particular frontend language, UI framework, browser, device runner, or agent-specific tool API.
