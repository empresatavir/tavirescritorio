# Visual fidelity protocol

## Source hierarchy

Use evidence in this order, resolving conflicts explicitly:

1. User-designated final reference files / exact screen states.
2. Editable original design source (HTML/CSS, design export, source assets, tokens).
3. Supplied screenshots, mockups, or visual notes.
4. Existing implementation and project conventions.
5. Inference, only for details absent from all sources.

When source formats disagree, prefer the user's explicit designation; otherwise prefer editable source over raster guesswork and record the choice. Never overwrite, reformat, or "clean up" source-of-truth files.

## What to preserve

Treat visible content and composition as a contract, not inspiration:

- Screen size, aspect ratio, orientation, safe areas, system chrome, and scroll position.
- Geometry: alignment, hierarchy, spacing, widths/heights, insets, grid, density, and overflow.
- Design tokens: exact colors, font family/files, type scale, weight, line height, tracking, opacity.
- Component construction: borders, radii, separators, shadows, gradients, icon size/stroke, image crop.
- Actual text, numbers, labels, order, and information density.
- Per-screen variants and visible interaction states (focused, selected, disabled, loading, error, empty, expanded).

Use supplied brand assets, icons, fonts, and images wherever available. Do not substitute generic icons, system defaults, placeholders, generated imagery, or newly invented copy when the reference supplies an asset or content. Inspect assets for variants and intended use.

## Allowed adaptations

Adapt only what the target platform or available runtime makes impossible. Keep the closest visual equivalent and document the reason, affected screen/element, and effect on comparison. Examples may include OS status bars, native text rasterization, safe-area insets, or unavailable proprietary fonts. Preserve the same layout size in captures and annotate separately any unavoidable OS chrome differences. Do not label taste, convenience, or framework defaults as platform constraints.

Accessibility and functional correctness still matter, but do not use them as blanket permission for visible redesign. If a strict reference conflicts with a material accessibility or platform requirement, implement the smallest safe adaptation and disclose it. Ask the user only if the trade-off materially changes product behavior or appearance.

## Drift-prevention checklist

Before coding each screen, answer using source evidence:

- What is the screen's defining hierarchy and first focal point?
- Which dimensions, colors, type styles, assets, and content can be measured exactly?
- Which state and viewport must the screenshot reproduce?
- What is unknown, and what is the least-assumptive implementation?

After coding, compare actual screenshots at native capture resolution. Fix large geometry and missing content first; then typography, color, iconography, and micro-spacing. Inspect all reference screens, not only the home screen. Never fix a mismatch by cropping away, stretching, blurring, or otherwise manipulating the candidate screenshot.
