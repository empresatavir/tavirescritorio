#!/usr/bin/env python3
"""Compare paired UI screenshots and generate an inspectable HTML report.

Pair images by their relative path without extension. Example:
  ref/home.png <-> actual/home.png
  ref/jobs/detail.png <-> actual/jobs/detail.jpg

Similarity is a pixel-agreement heuristic, not a perceptual or human score.
Requires Pillow (pip install -r requirements.txt).
"""
from __future__ import annotations

import argparse
import html
import json
import shutil
import statistics
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    from PIL import Image
except ImportError:
    print("Missing dependency: Pillow. Install it with: python3 -m pip install Pillow", file=sys.stderr)
    raise SystemExit(2)

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"}


def image_map(folder: Path) -> dict[str, Path]:
    found: dict[str, Path] = {}
    for path in sorted(folder.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        key = path.relative_to(folder).with_suffix("").as_posix().casefold()
        if key in found:
            raise ValueError(f"Ambiguous screenshot pairing key '{key}': {found[key]} and {path}")
        found[key] = path
    return found


def safe_image(path: Path) -> Image.Image:
    with Image.open(path) as im:
        rgba = im.convert("RGBA")
        canvas = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
        canvas.alpha_composite(rgba)
        return canvas.convert("RGB")


def analyze(reference: Image.Image, candidate: Image.Image, threshold: int) -> tuple[dict[str, Any], Image.Image, Image.Image]:
    if reference.size != candidate.size:
        raise ValueError(f"dimension mismatch: reference {reference.width}x{reference.height}, candidate {candidate.width}x{candidate.height}")

    ref_bytes = reference.tobytes()
    cand_bytes = candidate.tobytes()
    total = reference.width * reference.height
    within = 0
    exact = 0
    absolute_error_sum = 0
    highlight_bytes = bytearray(len(ref_bytes))
    width, height = reference.size
    for i in range(0, len(ref_bytes), 3):
        r0, g0, b0 = ref_bytes[i], ref_bytes[i + 1], ref_bytes[i + 2]
        dr = abs(r0 - cand_bytes[i])
        dg = abs(g0 - cand_bytes[i + 1])
        db = abs(b0 - cand_bytes[i + 2])
        absolute_error_sum += dr + dg + db
        delta = (dr + dg + db) / 3.0
        if delta <= threshold:
            within += 1
            if dr == 0 and dg == 0 and db == 0:
                exact += 1
            # Neutral grey means the pixels fall within the configured tolerance.
            grey = round((r0 * 0.299 + g0 * 0.587 + b0 * 0.114) * 0.72)
            highlight_bytes[i] = highlight_bytes[i + 1] = highlight_bytes[i + 2] = grey
        else:
            # Bright magenta marks pixels whose mean RGB difference exceeds threshold.
            highlight_bytes[i] = 255
            highlight_bytes[i + 1] = 0
            highlight_bytes[i + 2] = 96

    score = (within / total * 100.0) if total else 0.0
    exact_pct = (exact / total * 100.0) if total else 0.0
    mae = absolute_error_sum / (total * 3.0) if total else 0.0
    overlay = Image.blend(reference, candidate, 0.5)
    highlight = Image.frombytes("RGB", reference.size, bytes(highlight_bytes))
    metrics = {
        "width": width,
        "height": height,
        "pixels": total,
        "similarity_percent": round(score, 2),
        "exact_pixel_percent": round(exact_pct, 2),
        "mean_absolute_error_rgb": round(mae, 3),
        "changed_pixels": total - within,
        "changed_pixel_percent": round((total - within) / total * 100.0, 2) if total else 0.0,
    }
    return metrics, overlay, highlight


def copy_image(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)


def fmt(value: Any) -> str:
    if value is None:
        return "—"
    if isinstance(value, float):
        return f"{value:.2f}"
    return str(value)


def create_report(records: list[dict[str, Any]], report_path: Path, threshold: int, ref_count: int, candidate_count: int) -> None:
    scored = [r["similarity_percent"] for r in records if r["status"] in {"compared", "missing_candidate", "dimension_mismatch"}]
    overall = statistics.fmean(scored) if scored else None
    compared_count = sum(r["status"] == "compared" for r in records)
    missing_count = sum(r["status"] == "missing_candidate" for r in records)
    mismatch_count = sum(r["status"] == "dimension_mismatch" for r in records)
    unexpected_count = sum(r["status"] == "unexpected_candidate" for r in records)

    cards = []
    for row in records:
        title = html.escape(row["key"])
        status = row["status"]
        label = {
            "compared": "Comparada",
            "missing_candidate": "Falta captura da implementação · score 0",
            "dimension_mismatch": "Dimensões incompatíveis · score 0",
            "unexpected_candidate": "Captura sem referência correspondente",
        }.get(status, status)
        score_text = f'{fmt(row.get("similarity_percent"))}%' if row.get("similarity_percent") is not None else "N/A"
        detail = ""
        images = []
        for key, caption in (("reference_image", "Fonte da verdade"), ("candidate_image", "Implementação"), ("overlay_image", "Sobreposição 50/50"), ("difference_image", "Diferença · magenta = acima do limite")):
            filename = row.get(key)
            if filename:
                images.append(f'<figure><a href="{html.escape(filename, quote=True)}"><img loading="lazy" src="{html.escape(filename, quote=True)}" alt="{html.escape(caption)} — {title}"></a><figcaption>{html.escape(caption)}</figcaption></figure>')
        if row.get("status") == "compared":
            m = row["metrics"]
            detail = (f'<p class="metrics">{m["width"]}×{m["height"]} px · pixels exatos: {m["exact_pixel_percent"]:.2f}% · '
                      f'MAE RGB: {m["mean_absolute_error_rgb"]:.3f} · pixels fora do limite: {m["changed_pixel_percent"]:.2f}%</p>')
        elif row.get("message"):
            detail = f'<p class="notice">{html.escape(row["message"])}</p>'
        cards.append(f'<details class="screen {html.escape(status)}" open><summary><span class="screen-title">{title}</span><span class="score">{score_text}</span><span class="badge">{html.escape(label)}</span></summary>{detail}<div class="images">{"".join(images)}</div></details>')

    overall_text = f"{overall:.2f}%" if overall is not None else "N/A — nenhuma referência encontrada"
    generated = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    doc = f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Relatório de fidelidade visual</title>
<style>
:root{{color-scheme:light;--ink:#16202b;--muted:#657386;--line:#dbe2e9;--bg:#f3f6f8;--green:#087f5b;--red:#b42318;--amber:#8b5e00}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}}
header,main{{max-width:1440px;margin:auto;padding:24px}}header{{padding-top:34px;padding-bottom:18px}}h1{{font-size:clamp(1.6rem,3vw,2.3rem);line-height:1.15;margin:0 0 8px}}p{{margin:6px 0;color:var(--muted)}}.summary{{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:22px}}.stat{{padding:15px 17px;background:white;border:1px solid var(--line);border-radius:12px}}.stat strong{{display:block;font-size:1.45rem}}.stat span{{color:var(--muted);font-size:.88rem}}.score-main{{color:{'#087f5b' if overall is not None and overall >= 90 else '#8b5e00' if overall is not None and overall >= 70 else '#b42318'}}}
.screen{{background:white;border:1px solid var(--line);border-radius:12px;margin:12px 0;overflow:hidden}}summary{{list-style:none;cursor:pointer;display:flex;align-items:center;gap:12px;padding:15px 17px}}summary::-webkit-details-marker{{display:none}}.screen-title{{font-weight:700;flex:1;overflow-wrap:anywhere}}.score{{font-weight:750;font-size:1.2rem;font-variant-numeric:tabular-nums}}.badge{{border-radius:999px;padding:4px 9px;background:#edf1f4;color:#334155;font-size:.78rem}}.compared .badge{{color:var(--green);background:#e9f7f1}}.missing_candidate .badge,.dimension_mismatch .badge{{color:var(--red);background:#fff0ef}}.unexpected_candidate .badge{{color:var(--amber);background:#fff5db}}.metrics,.notice{{margin:0 17px 12px}}.notice{{color:var(--red)}}.images{{padding:0 17px 17px;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:12px}}figure{{margin:0;min-width:0}}figure a{{display:block;background:#eef1f4;border:1px solid var(--line);border-radius:8px;overflow:auto;max-height:80vh}}img{{display:block;max-width:100%;height:auto}}figcaption{{font-size:.82rem;color:var(--muted);padding:5px 2px}}.method{{margin-top:22px;background:#fff;border:1px solid var(--line);border-radius:12px;padding:18px}}code{{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}}footer{{color:var(--muted);padding:10px 24px 35px;text-align:center;font-size:.85rem}}
@media(max-width:600px){{header,main{{padding:16px}}summary{{gap:8px;flex-wrap:wrap}}.screen-title{{min-width:45%}}.badge{{margin-left:auto}}}}
</style></head><body><header><h1>Comparação de fidelidade visual</h1><p>Gerado em {html.escape(generated)} · limite por pixel: média absoluta RGB ≤ {threshold}/255</p><div class="summary"><div class="stat"><strong class="score-main">{overall_text}</strong><span>Média simples por tela</span></div><div class="stat"><strong>{ref_count}</strong><span>Telas de referência</span></div><div class="stat"><strong>{compared_count}/{ref_count}</strong><span>Telas comparadas</span></div><div class="stat"><strong>{missing_count + mismatch_count}</strong><span>Ausentes ou inválidas</span></div><div class="stat"><strong>{unexpected_count}</strong><span>Capturas sem referência</span></div></div></header><main>
<div class="method"><strong>Como interpretar</strong><p>A porcentagem é uma heurística de concordância de pixels: fração de pixels cuja diferença média absoluta nos canais RGB fica dentro do limite configurado. Não é uma avaliação humana universal nem valida comportamento funcional. Revise os pares, a sobreposição e as regiões magenta. O score geral dá o mesmo peso a cada tela; telas sem captura candidata ou com dimensão incompatível contam como 0. Não se redimensionam imagens automaticamente.</p></div>
<h2>Telas e capturas</h2>{''.join(cards)}
</main><footer>Relatório estático criado por reference-fidelity-frontend. Os PNGs estão na pasta assets ao lado deste arquivo.</footer></body></html>'''
    report_path.write_text(doc, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Compare UI screenshots and generate an HTML visual-fidelity report.")
    parser.add_argument("--reference", type=Path, required=True, help="Directory of reference screenshots")
    parser.add_argument("--candidate", type=Path, required=True, help="Directory of implementation screenshots")
    parser.add_argument("--output", type=Path, required=True, help="Output directory for report and comparison assets")
    parser.add_argument("--threshold", type=int, default=12, help="Per-pixel mean absolute RGB delta tolerated (0–255; default: 12)")
    args = parser.parse_args()
    if not 0 <= args.threshold <= 255:
        parser.error("--threshold must be between 0 and 255")
    if not args.reference.is_dir():
        parser.error(f"Reference directory does not exist: {args.reference}")
    if not args.candidate.is_dir():
        parser.error(f"Candidate directory does not exist: {args.candidate}")
    try:
        refs, candidates = image_map(args.reference), image_map(args.candidate)
        if not refs:
            parser.error(f"No supported reference images found under {args.reference}")
        args.output.mkdir(parents=True, exist_ok=True)
        asset_dir = args.output / "assets"
        asset_dir.mkdir(parents=True, exist_ok=True)
        records: list[dict[str, Any]] = []
        all_keys = sorted(set(refs) | set(candidates))
        for index, key in enumerate(all_keys, start=1):
            ref_path, cand_path = refs.get(key), candidates.get(key)
            row: dict[str, Any] = {"key": key}
            prefix = f"{index:03d}-{index_slug(key)}"
            if ref_path:
                ref_name = f"{prefix}-reference{ref_path.suffix.lower()}"
                copy_image(ref_path, asset_dir / ref_name)
                row["reference_image"] = f"assets/{ref_name}"
                row["reference_source"] = ref_path.as_posix()
            if cand_path:
                cand_name = f"{prefix}-implementation{cand_path.suffix.lower()}"
                copy_image(cand_path, asset_dir / cand_name)
                row["candidate_image"] = f"assets/{cand_name}"
                row["candidate_source"] = cand_path.as_posix()

            if ref_path and not cand_path:
                row.update(status="missing_candidate", similarity_percent=0.0, message="Não há captura da implementação com este caminho relativo.")
            elif cand_path and not ref_path:
                row.update(status="unexpected_candidate", similarity_percent=None, message="Não há imagem de referência com este caminho relativo; crie/atualize o mapa de telas e verifique o nome.")
            else:
                assert ref_path is not None and cand_path is not None
                try:
                    metric, overlay, highlight = analyze(safe_image(ref_path), safe_image(cand_path), args.threshold)
                    overlay_name, diff_name = f"{prefix}-overlay.png", f"{prefix}-difference.png"
                    overlay.save(asset_dir / overlay_name, optimize=True)
                    highlight.save(asset_dir / diff_name, optimize=True)
                    row.update(status="compared", similarity_percent=metric["similarity_percent"], metrics=metric,
                               overlay_image=f"assets/{overlay_name}", difference_image=f"assets/{diff_name}")
                except ValueError as exc:
                    row.update(status="dimension_mismatch", similarity_percent=0.0, message=str(exc))
            records.append(row)

        # The output JSON is intentionally concise but includes sources, statuses, and every per-screen metric.
        scored = [r["similarity_percent"] for r in records if r["status"] in {"compared", "missing_candidate", "dimension_mismatch"}]
        payload = {
            "metric": "pixel_agreement_within_mean_absolute_rgb_threshold",
            "threshold": args.threshold,
            "overall_macro_average_percent": round(statistics.fmean(scored), 2) if scored else None,
            "reference_screens": len(refs),
            "candidate_images": len(candidates),
            "compared_screens": sum(r["status"] == "compared" for r in records),
            "missing_candidate_screens": sum(r["status"] == "missing_candidate" for r in records),
            "dimension_mismatches": sum(r["status"] == "dimension_mismatch" for r in records),
            "unexpected_candidate_images": sum(r["status"] == "unexpected_candidate" for r in records),
            "records": records,
        }
        (args.output / "metrics.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        create_report(records, args.output / "report.html", args.threshold, len(refs), len(candidates))
        print(f"Reference screens: {len(refs)} | Candidate images: {len(candidates)} | Compared: {payload['compared_screens']}")
        print(f"Overall macro-average: {payload['overall_macro_average_percent']}% (threshold {args.threshold})")
        print(f"HTML report: {args.output / 'report.html'}")
        print(f"Metrics JSON: {args.output / 'metrics.json'}")
        return 0
    except (OSError, ValueError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 2


def index_slug(value: str) -> str:
    slug = "".join(c.lower() if c.isalnum() else "-" for c in value)
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug.strip("-")[:70] or "screen"


if __name__ == "__main__":
    raise SystemExit(main())
