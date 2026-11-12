"""產生內頁（關於道場、法會活動、服務、相簿）的 HTML：選單、頁首、頁尾都一樣，只有中間內容不同。
用法: python -I tools/make_pages.py
改共用的選單或頁尾：改這支再跑一次。改某一頁的內容：改下面那一頁的 body。
"""
from pathlib import Path

PAGES = [("about.html", "關於道場"), ("events.html", "法會活動"), ("services.html", "服務"), ("gallery.html", "相簿")]
CUR = ' aria-current="page"'


def nav(cur):
    links = "\n".join(f'        <a href="{f}"{CUR if f == cur else ""}>{l}</a>' for f, l in PAGES)
    return f"""    <header class="topbar">
      <nav class="pill" aria-label="主選單">
        <a class="brand" href="index.html">慈惠道場</a>
{links}
      </nav>
    </header>"""


def todo(text):
    return f'<div class="todo"><span class="todo-tag">待填</span>{text}</div>'


def page(file, label, desc, h1, lead, body, wide=False, extra_scripts=""):
    content_class = "content scroll-wrap" if wide else "content"
    return f"""<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{label} — 慈惠道場</title>
    <meta name="description" content="{desc}" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;600;900&family=Noto+Sans+TC:wght@400;500&family=Yuji+Boku&family=LXGW+WenKai+TC:wght@400&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="pages.css" />
  </head>
  <body>
{nav(file)}

    <main>
      <div class="hero">
        <div class="hero-img" aria-hidden="true"></div>
        <div class="hero-text">
          <p class="eyebrow">慈惠道場</p>
          <h1>{h1}</h1>
          <p class="lead">{lead}</p>
        </div>
      </div>

      <div class="{content_class}">
{body}
      </div>
    </main>

    <footer>
      <p>慈惠道場 · 主祀瑤池金母，陪祀九天玄女、中壇元帥、福德正神</p>
      <p><a href="index.html">回首頁</a></p>
      <p class="credit">
        首頁匾額字型：<a href="https://xiaoxue.iis.sinica.edu.tw/chongxi/" target="_blank" rel="noopener">崇羲篆體</a>（中央研究院，CC BY-ND 3.0 TW）
      </p>
    </footer>

    <script type="module" src="js/page.js"></script>{extra_scripts}
  </body>
</html>
"""


def section(title, inner):
    inner = "\n".join("          " + l if l.strip() else l for l in inner.strip("\n").split("\n"))
    return f"""        <section>
          <h2>{title}</h2>
{inner}
        </section>"""


about = "\n\n".join(
    [
        section("道場緣起", todo("道場怎麼開始的：哪一年、誰創立、名字的由來、是不是慈惠堂系統。")),
        section(
            "供奉神明",
            """<p>主祀瑤池金母，陪祀九天玄女、中壇元帥、福德正神。</p>
<div class="cards" id="deityCards"></div>""",
        ),
        section("道場照片", todo('道場外觀、正殿、神像的照片（神像可以拍的話）。照片也會放進<a href="gallery.html">相簿</a>。')),
    ]
)

events = "\n\n".join(
    [
        section(
            "神明聖誕",
            """<figure class="year" id="yearline" aria-hidden="true"></figure>
<p class="year-legend">實心印：日期已確認　虛線印：待確認（各地說法不一樣，等道場確認）</p>
<ul class="events" id="eventList"></ul>""",
        ),
        section("固定活動", todo("道場還有哪些固定活動（例如初一十五、禮斗、普渡、謝平安），在什麼時候。")),
        section("報名方式", todo("哪些活動要先報名、怎麼報名。")),
        section("最新公告", todo("近期的公告。")),
    ]
)

services = "\n\n".join(
    [
        section("服務項目", todo("道場實際有哪些服務（例如點燈、安太歲、收驚、問事），每一項怎麼進行。")),
        section("預約與聯絡", todo("要不要預約、怎麼聯絡（電話、LINE）。")),
        section("費用", todo("要寫價錢、寫「隨喜」，或是不寫。")),
    ]
)

gallery = """        <div class="scroll" id="scroll">
          <div class="scroll-paper" id="scrollPaper" tabindex="0" aria-label="相簿畫卷，可以左右捲動">
            <div class="scroll-track" id="scrollTrack">
              <div class="scroll-empty" id="scrollEmpty">
                """ + todo("照片整理中：法會、道場的照片（一場活動一個資料夾，附上活動名稱和日期）。") + """
              </div>
            </div>
          </div>
          <!-- 兩端捲起來的軸（AI 生成的圖，tools/prep_scroll.py）：右端固定，左端在展開時從右滾到左 -->
          <img class="scroll-end scroll-end-right" src="assets/scroll/end.webp" alt="" aria-hidden="true" />
          <!-- 手機掛軸：上端的天杆和掛繩 -->
          <img class="hang-top" src="assets/scroll/hang-top.webp" alt="" aria-hidden="true" />
          <div class="rod-lane" aria-hidden="true">
            <img class="scroll-end scroll-end-left" src="assets/scroll/end.webp" alt="" aria-hidden="true" />
            <img class="hang-bottom" src="assets/scroll/hang-bottom.webp" alt="" aria-hidden="true" />
          </div>
        </div>
        <p class="scroll-hint" id="scrollHint">畫卷從右往左看 · 往左捲動</p>

        <dialog class="viewer" id="viewer" aria-label="看大圖">
          <figure>
            <img id="viewerImg" alt="" />
            <figcaption id="viewerCap"></figcaption>
          </figure>
          <div class="viewer-bar">
            <button type="button" id="viewerNext">← 下一張</button>
            <button type="button" id="viewerClose">關閉</button>
            <button type="button" id="viewerPrev">上一張 →</button>
          </div>
        </dialog>"""

desc = "慈惠道場，主祀瑤池金母，陪祀九天玄女、中壇元帥、福德正神。"
for args, kw in [
    (("about.html", "關於道場", desc, "關於道場", "主祀瑤池金母", about), {}),
    (("events.html", "法會活動", "慈惠道場一年的神明聖誕與法會活動。", "法會活動", "一年的聖誕與法會 · 日期都是農曆", events), {}),
    (("services.html", "服務", "慈惠道場的服務項目與預約方式。", "服務", "道場為大家做的事", services), {}),
    (
        ("gallery.html", "相簿", "慈惠道場的法會與道場照片。", "相簿", "法會與道場的照片", gallery),
        {"wide": True, "extra_scripts": '\n    <script type="module" src="js/gallery-view.js"></script>'},
    ),
]:
    Path(args[0]).write_text(page(*args, **kw), encoding="utf-8", newline="\n")
    print("wrote", args[0])
