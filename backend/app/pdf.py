"""Renders a catalog to PDF with WeasyPrint, following the Alpha Polimer
sample layout: cover page with stats, then one section per category with a
grid of product cards (photo, №, name, price)."""

import datetime
import html
import os
from collections import OrderedDict

from sqlalchemy.orm import Session, joinedload

from .models import Catalog, CatalogItem, Product

UPLOADS_DIR = os.path.abspath(os.environ.get("UPLOADS_DIR", "./uploads"))

GREEN = "#1F9B57"
GREEN_DARK = "#0B4F35"
GREEN_LIGHT = "#8FD3BC"

SORT_LABELS = {
    "revenue": "сортировка по выручке",
    "sales": "сортировка по продажам",
    "price": "сортировка по цене",
    "manual": "свой порядок",
}


def esc(value):
    return html.escape(str(value if value is not None else ""))


def fmt_num(value):
    return f"{int(value):,}".replace(",", " ")


def build_css(cols):
    gap_total = (cols - 1) * 4
    return f"""
@page {{
  size: A4;
  margin: 14mm 12mm 18mm 12mm;
  @bottom-left {{
    content: "ALPHA POLIMER LINE";
    font-family: 'DejaVu Sans', sans-serif;
    font-size: 7pt; font-weight: bold; letter-spacing: 2pt; color: {GREEN};
  }}
  @bottom-right {{
    content: "Стр. " counter(page);
    font-family: 'DejaVu Sans', sans-serif;
    font-size: 7pt; letter-spacing: 1.5pt; color: #555;
  }}
}}
@page cover {{
  margin: 0;
  @bottom-left {{ content: none; }}
  @bottom-right {{ content: none; }}
}}
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
body {{ font-family: 'DejaVu Sans', sans-serif; color: #111; }}

.cover {{
  page: cover;
  width: 100%; height: 297mm;
  padding: 20mm 18mm;
  position: relative;
  overflow: hidden;
}}
.cover .alpha-bg {{
  position: absolute; top: -30mm; right: -60mm;
  font-size: 380pt; font-weight: bold; color: {GREEN_LIGHT};
  opacity: .5;
}}
.cover .logo {{ display: inline-block; background: {GREEN}; color: #fff; font-weight: bold; font-size: 20pt; padding: 3mm 5mm; border-radius: 2mm; }}
.cover .logotext {{ display: inline-block; vertical-align: middle; margin-left: 4mm; }}
.cover .logotext .t1 {{ font-size: 15pt; font-weight: bold; letter-spacing: 1pt; }}
.cover .logotext .t2 {{ font-size: 7pt; letter-spacing: 3pt; color: #444; }}
.cover .eyebrow {{ margin-top: 50mm; color: {GREEN}; font-weight: bold; font-size: 10pt; letter-spacing: 4pt; }}
.cover h1 {{ font-size: 44pt; font-weight: bold; letter-spacing: -1pt; line-height: 1.05; margin-top: 6mm; max-width: 150mm; }}
.cover .year {{ color: {GREEN}; font-size: 38pt; font-weight: bold; margin-top: 4mm; }}
.cover .desc {{ margin-top: 12mm; font-size: 12pt; color: #333; line-height: 1.6; max-width: 120mm; }}
.cover .stats {{ margin-top: 16mm; }}
.cover .stat {{ display: inline-block; margin-right: 18mm; }}
.cover .stat .n {{ font-size: 26pt; font-weight: bold; color: {GREEN_DARK}; }}
.cover .stat .l {{ font-size: 7pt; letter-spacing: 2pt; color: #555; margin-top: 1mm; }}
.cover .coverfoot {{
  position: absolute; bottom: 12mm; left: 18mm; right: 18mm;
  border-top: 0.4pt solid #999; padding-top: 4mm;
  font-size: 7pt; letter-spacing: 2pt; color: #333;
}}
.cover .coverfoot .right {{ float: right; }}

.category {{ page-break-before: always; }}
.cat-header .brandline {{ margin-bottom: 6mm; }}
.cat-header .brand {{ background: {GREEN}; color: #fff; font-weight: bold; font-size: 10pt; padding: 1.5mm 2.5mm; border-radius: 1mm; margin-right: 3mm; }}
.cat-header .brandsub {{ font-size: 6.5pt; letter-spacing: 2.5pt; color: #777; }}
.cat-header .eyebrow {{ color: {GREEN}; font-weight: bold; font-size: 8pt; letter-spacing: 3pt; border-top: 0.4pt solid #ccc; padding-top: 3mm; }}
.cat-header h2 {{ font-size: 22pt; font-weight: bold; margin: 2mm 0; }}
.cat-header .meta {{ font-size: 8.5pt; color: #555; border-bottom: 0.4pt solid #ccc; padding-bottom: 3mm; margin-bottom: 6mm; }}

.grid {{ font-size: 0; }}
.card {{
  display: inline-block; vertical-align: top;
  width: calc((100% - {gap_total}mm) / {cols});
  margin-right: 4mm; margin-bottom: 4mm;
  border: 0.4pt solid #ddd; border-radius: 1.5mm;
  padding: 2.5mm; font-size: 8pt;
  page-break-inside: avoid;
}}
.card:nth-child({cols}n) {{ margin-right: 0; }}
.card-top {{ width: 8mm; height: 0.8mm; background: {GREEN_LIGHT}; margin-bottom: 2mm; }}
.imgbox {{ width: 100%; height: 26mm; text-align: center; margin-bottom: 2mm; background: #f6f6f4; border-radius: 1mm; overflow: hidden; }}
.imgbox img {{ max-width: 100%; max-height: 26mm; object-fit: contain; }}
.noimg {{ width: 100%; height: 26mm; line-height: 26mm; text-align: center; font-size: 16pt; font-weight: bold; color: #ccc; }}
.cnum {{ font-size: 6pt; color: #999; letter-spacing: 1pt; margin-bottom: 1mm; }}
.cname {{ font-size: 7.5pt; line-height: 1.3; height: 8mm; overflow: hidden; margin-bottom: 1.5mm; }}
.cprice {{ font-size: 10pt; font-weight: bold; color: {GREEN_DARK}; border-top: 0.4pt solid #eee; padding-top: 1.5mm; }}
.cprice span {{ font-size: 7pt; font-weight: normal; color: #777; }}
"""


def build_card(product):
    img_file = os.path.join(UPLOADS_DIR, product.image_path) if product.image_path else None
    if img_file and os.path.exists(img_file):
        img_html = f'<img src="file://{img_file}" />'
    else:
        img_html = f'<div class="noimg">{esc((product.name or "?")[0].upper())}</div>'
    num = product.legacy_catalog_number if product.legacy_catalog_number else product.id
    return f"""
    <div class="card">
      <div class="card-top"></div>
      <div class="imgbox">{img_html}</div>
      <div class="cnum">№ {esc(num)}</div>
      <div class="cname">{esc(product.name)}</div>
      <div class="cprice">{fmt_num(product.price_uzs)} <span>сум</span></div>
    </div>"""


def render_catalog_pdf(catalog: Catalog, db: Session) -> bytes:
    from weasyprint import HTML

    items = (
        db.query(CatalogItem)
        .options(joinedload(CatalogItem.product).joinedload(Product.category))
        .filter(CatalogItem.catalog_id == catalog.id)
        .order_by(CatalogItem.position)
        .all()
    )

    total_in_base = db.query(Product).count()
    cols = max(2, min(6, catalog.columns or 5))
    sort_label = SORT_LABELS.get(catalog.sort_key, SORT_LABELS["revenue"])
    year = datetime.date.today().year

    sections = OrderedDict()
    for item in items:
        if not item.product:
            continue
        key = item.product.category.name if item.product.category else "Без категории"
        sections.setdefault(key, []).append(item.product)

    section_html = ""
    for category_name, products in sections.items():
        cards = "".join(build_card(p) for p in products)
        section_html += f"""
        <section class="category">
          <div class="cat-header">
            <div class="brandline"><span class="brand">&#945; ALPHA</span><span class="brandsub">POLIMER LINE</span></div>
            <div class="eyebrow">РАЗДЕЛ</div>
            <h2>{esc(category_name)}</h2>
            <div class="meta">{len(products)} позиций в категории · {cols} колонок · {esc(sort_label)}</div>
          </div>
          <div class="grid">{cards}</div>
        </section>"""

    doc_html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>{build_css(cols)}</style></head>
<body>
  <div class="cover">
    <div class="alpha-bg">&#945;</div>
    <div><span class="logo">&#945;</span><span class="logotext"><div class="t1">ALPHA</div><div class="t2">POLIMER LINE</div></span></div>
    <div class="eyebrow">КАТАЛОГ ТОВАРОВ</div>
    <h1>{esc(catalog.name).upper()}</h1>
    <div class="year">&#9679; {year}</div>
    <div class="desc">Ассортимент хозяйственных изделий из полимера. Систематизирован по категориям, {esc(sort_label)}.</div>
    <div class="stats">
      <div class="stat"><div class="n">{fmt_num(total_in_base)}</div><div class="l">ПОЗИЦИЙ В БАЗЕ</div></div>
      <div class="stat"><div class="n">{len(sections)}</div><div class="l">КАТЕГОРИЙ</div></div>
      <div class="stat"><div class="n">{sum(len(v) for v in sections.values())}</div><div class="l">В КАТАЛОГЕ</div></div>
    </div>
    <div class="coverfoot">TOSHKENT · UZBEKISTAN<span class="right">catalog.omborchi.systems</span></div>
  </div>
  {section_html}
</body></html>"""

    return HTML(string=doc_html).write_pdf()
