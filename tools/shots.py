"""Fotografa a landing em Chromium/WebKit sem servidor externo.

Uso: python3 tools/shots.py <pasta_saida> [largura=1440] [altura=900] [motor=chromium]
Gera topo.png (após a abertura), quadros ao longo da rolagem e um relatório de checagens no terminal.
"""
import functools, http.server, os, sys, threading, json
from playwright.sync_api import sync_playwright

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
saida = sys.argv[1]
W = int(sys.argv[2]) if len(sys.argv) > 2 else 1440
H = int(sys.argv[3]) if len(sys.argv) > 3 else 900
MOTOR = sys.argv[4] if len(sys.argv) > 4 else 'chromium'
os.makedirs(saida, exist_ok=True)

class Quieto(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quieto, directory=RAIZ))
threading.Thread(target=srv.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{srv.server_address[1]}/'

with sync_playwright() as p:
    CHROME = os.path.expanduser('~/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell')
    nav = p.chromium.launch(executable_path=CHROME) if MOTOR == 'chromium' else getattr(p, MOTOR).launch()
    movel = W < 900
    ctx = nav.new_context(viewport={'width': W, 'height': H}, device_scale_factor=1 if not movel else 2,
                          is_mobile=movel and MOTOR == 'chromium', has_touch=movel)
    pg = ctx.new_page()
    erros = []
    pg.on('console', lambda m: m.type == 'error' and erros.append(m.text))
    pg.on('pageerror', lambda e: erros.append(str(e)))
    pg.goto(url, wait_until='load')
    pg.wait_for_timeout(2800)
    pg.screenshot(path=f'{saida}/topo-{W}.png')
    total = pg.evaluate('document.documentElement.scrollHeight')
    y, i = 0, 0
    while y < total:
        pg.evaluate(f'window.scrollTo(0,{y})')
        pg.wait_for_timeout(700)
        pg.screenshot(path=f'{saida}/q{W}-{i:02d}.png')
        y += int(H * .85); i += 1
    info = pg.evaluate('''() => ({
      larguraDoc: document.documentElement.scrollWidth, tela: innerWidth,
      invisiveis: [...document.querySelectorAll('.rv')].filter(e => getComputedStyle(e).opacity < .5).length,
      imagens: [...document.images].map(i => [i.currentSrc.split('/').pop(), i.naturalWidth]),
      fonte: document.fonts.check('300 16px Poppins'),
    })''')
    print(json.dumps(info, ensure_ascii=False))
    print('erros:', erros)
    nav.close()
srv.shutdown()
