"""Servidor local com gzip, para medir desempenho sem resultado pessimista.

Uso: python3 tools/serve.py [porta=8790]
"""
import functools, gzip, http.server, io, os, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEXTO = ('.html', '.css', '.js', '.svg', '.json')

class Gzip(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def send_head(self):
        caminho = self.translate_path(self.path)
        if os.path.isdir(caminho):
            caminho = os.path.join(caminho, 'index.html')
        if not caminho.endswith(TEXTO) or 'gzip' not in self.headers.get('Accept-Encoding', '') or not os.path.isfile(caminho):
            return super().send_head()
        dados = gzip.compress(open(caminho, 'rb').read(), 6)
        self.send_response(200)
        self.send_header('Content-Type', self.guess_type(caminho))
        self.send_header('Content-Encoding', 'gzip')
        self.send_header('Content-Length', str(len(dados)))
        self.end_headers()
        return io.BytesIO(dados)
    def end_headers(self):
        if self.path.startswith('/assets/'):
            self.send_header('Cache-Control', 'public, max-age=604800')
        super().end_headers()

porta = int(sys.argv[1]) if len(sys.argv) > 1 else 8790
http.server.ThreadingHTTPServer(('127.0.0.1', porta), functools.partial(Gzip, directory=RAIZ)).serve_forever()
