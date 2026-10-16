# Capture and report protocol

## Automated capture for HTML and web references

The Playwright runner opens a reference URL/local HTML file and the candidate app separately, reproduces each screen using a declarative action list, saves matched PNGs, and launches the bundled comparator after both sides finish. It uses fresh browser contexts per screen so navigation/storage state from one capture cannot contaminate the next. It does not guess which buttons represent the intended screens.

Install the runner dependency and Chromium from the project root:

```bash
npm install --save-dev playwright
npx playwright install chromium
```

Copy `templates/playwright-screens.example.json` to `visual/playwright-screens.json`. Set each side's `url` to a local HTML file or running app URL, adjust viewport, and list each screen. For a static folder with relative fonts/assets or ES modules, serve the reference directory over HTTP (for example, `python3 -m http.server 4174 --directory /path/to/reference`) rather than opening it as `file://`; this avoids browser origin/module restrictions. Start the candidate web app separately, then:

```bash
node "$SKILL_DIR/scripts/capture_playwright.mjs" --manifest visual/playwright-screens.json
```

The runner accepts `--side reference` or `--side candidate` for capture-only runs and `--headed` for debugging. A normal `--side both` run emits screenshots, a visual HTML report/JSON metrics, semantic inventory JSON per screen, and `visual/semantics/report.html` with missing/extra text, controls, and dialogs. It supports explicit `goto`, `click`, `fill`, `press`, `check`, `uncheck`, `selectOption`, `hover`, `waitFor`, `assertVisible`, and `assertText` actions. Prefer role/name or label-based locators; use exact CSS selectors only when the reference lacks usable accessible names. For a navigation sequence, configure actions separately for each screen and side. To include a modal/drawer visually, add a separate screen/state whose actions click the opener and assert the dialog's title/content before capture. Do not click every button indiscriminately: actions can be destructive, unpredictable, or land in the wrong state.

The runner waits for local/web fonts (with a finite timeout), uses Playwright screenshot options to disable animations and hide the caret, and does not add CSS that restyles the page. Configure deterministic app data and use semantic waits for asynchronous UI. It is for web pages and HTML prototypes; native Android/iOS/Flutter screens must be captured through the appropriate emulator/device or platform tooling and then passed to the same comparator.

### What the semantic inventory reads

For every captured state, the runner records direct visible text nodes, headings/landmarks, accessible-name hints, labels, buttons/links, form controls, placeholders, control type, required/disabled/checked/selected state, visible image alt text, and dialogs. It traverses the main document, its frames, and open shadow roots. It writes per-screen JSON under `visual/semantics/reference/` and `visual/semantics/candidate/`, plus a cross-side comparison report. The semantic report matches normalized text and control signatures exactly (ignoring repeated whitespace and Unicode normalization) and lists missing/extra items; it does not produce a second misleading single similarity percentage.

Dialog elements using `<dialog>`, `role="dialog"`, `role="alertdialog"`, or `aria-modal="true"` are catalogued when present in the DOM, including their visible/closed state. A closed dialog's title/text in the inventory does **not** prove its open appearance. To compare the actual modal, reproduce it with explicit actions and capture it as a separate screen. Custom overlays without dialog semantics may not be recognized automatically; inspect the source/DOM and add explicit states/selectors. Canvas-rendered text, inaccessible browser chrome, and closed shadow roots are not extractable through this DOM inventory. The inventory is a useful implementation checklist, not a complete accessibility-tree audit.

Input values are omitted by default to avoid copying user or customer data into artifacts. Labels, accessible names, placeholders, type, and whether a field is populated are recorded. Only set `includeFieldValues: true` in the manifest (or for a specific side) when using safe synthetic data and when visible values themselves need auditing. Text present in the visible page is still recorded; use sanitized deterministic fixtures before saving reports.

## Build the screen inventory

Create `visual/SCREEN-MAP.md` before implementation. Give each screen and state a stable ID. Include source artifact/artboard, route or interaction steps, reference viewport in pixels, device scale factor if relevant, orientation, scroll offset, state/data, actual filename, and notes. For a multi-screen HTML design file, enumerate every artboard/section rather than treating the entire canvas as one screen. When source HTML is interactive, record how to open each state and use the assets beside it.

Copy or export the approved reference screenshots to `visual/reference/` and candidate screenshots to `visual/actual/`. Use identical relative paths and filenames for pairs, for example:

```text
visual/
  SCREEN-MAP.md
  reference/
    home.png
    jobs/queue.png
    jobs/detail.png
  actual/
    home.png
    jobs/queue.png
    jobs/detail.png
  report/                 # generated
```

Capture at the same dimensions and matching state. Use the same viewport, browser/device scale factor, browser engine or emulator when possible, fonts, locale, theme, content, and OS chrome. Wait for fonts/images/data to settle. Disable animations and volatile content consistently without hiding real UI. For native mobile, use the emulator/simulator or authorized device screenshot mechanism; for web, use a browser screenshot. The implementation language does not change the pairing/report process.

Never generate a "reference" from the candidate implementation. Never edit a reference image to improve a score. Keep raw captures unchanged; if masking volatile regions is unavoidable, document exact regions and apply the same mask to both images before comparison, retaining originals.

## Run the comparator

Install Pillow once in the environment running the script:

```bash
python3 -m pip install -r "$SKILL_DIR/requirements.txt"
python3 "$SKILL_DIR/scripts/compare_screens.py" \
  --reference visual/reference --candidate visual/actual \
  --output visual/report --threshold 12
```

The script recursively pairs supported image formats by relative path without extension. It composites transparent pixels over white, then compares same-size images without rescaling/cropping. For each matched pair with equal dimensions it reports:

- **Similarity score**: if each image has `N` pixels and `dᵢ = (|Rᵢ−R'ᵢ| + |Gᵢ−G'ᵢ| + |Bᵢ−B'ᵢ|) / 3`, a pixel is counted as matching when `dᵢ ≤ T`. The screen score is `100 × count(dᵢ ≤ T) / N`. `T` is `--threshold` (default 12 on a 0–255 channel scale).
- **Exact pixel agreement**: `100 × count(RGB exactly equal) / N`.
- **MAE RGB**: average absolute channel error over all channels and pixels, `sum(|channel difference|) / (3N)`, still on a 0–255 scale.
- **Changed-pixel percentage**: `100 − similarity score` (up to rounding).
- Side-by-side images, a 50/50 overlay, and an amplified difference image that highlights changed pixels.

The overall score is the unweighted arithmetic mean of per-reference-screen scores; missing candidate screens count as 0. A same-name candidate with different dimensions is invalid and counts as 0. Candidate-only images are reported as unexpected. The report includes each issue; no unmatched screen is silently omitted from the screen coverage summary.

### Fonts, anti-aliasing, and rendering differences

The comparator is **not font-aware and does not perform perceptual registration or alignment**. It treats font pixels like any other RGB pixels. Small glyph-edge changes from anti-aliasing pass only if their mean RGB delta is at or below `T`; stronger edge changes, different glyph shapes, line breaks, weight/size differences, fallback fonts, changed font metrics, or shifted text blocks are counted as changed pixels. A one-pixel text shift can affect both the old and new glyph edges and lower the score more than its apparent visual impact. Font differences are not ignored, blurred, or automatically masked.

For a fairer comparison, first stabilize the rendering environment: use the same Chromium/Playwright version, OS/container, viewport, device scale factor, locale, color scheme, installed font files, and loaded webfont assets on both sides. Wait for `document.fonts.ready`; confirm the intended font actually loaded (font-load failures can silently change line wrapping). Capture the reference and candidate in the same browser installation whenever possible. This matters especially when comparing HTML in one browser to a native mobile screenshot: different text rasterizers and system fonts can create systematic pixel differences even when layouts look similar.

The `--threshold` setting gives **one uniform RGB tolerance per pixel**, not a font-specific exemption. Default `12` tolerates very small channel variation; raising it may reduce sensitivity to benign rasterization noise but also hides real color/edge errors. Record any chosen threshold and compare several screens visually before adopting it. Do not keep increasing it until a preferred score appears. If rendering engines cannot be aligned, state that limitation and treat the pixel score as a rough tracking signal, not a definitive similarity grade. Do not blur, resize, or erase text regions. Any deliberate mask for genuinely volatile content must be symmetric, documented, applied identically to both images, and preserve original captures.

## Interpret honestly

Use the score to locate and track visual differences—not to claim that a design is "X% identical" in a universal sense. A high pixel score can still conceal a broken interaction or one important small omission; a low score can reflect a large background-color shift or environment noise. Combine the numeric score with per-screen visual inspection and functional checks.

A valid completion report states: number of reference screens; number captured; number compared; any missing, unexpected, or invalid pairs; macro-average score and threshold; capture environment/dimensions; unresolved deviations and rationale; and the HTML report path. Do not report a score if no screen pairs were successfully compared.
