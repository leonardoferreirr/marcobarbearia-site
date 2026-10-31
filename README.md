# Marco Barbearia | site

Site da Marco Barbearia (visagismo e imagem masculina, 4 unidades em São Paulo e Uberlândia). Página estática, sem dependências.

- Todo botão passa por `obrigado.html?c=<contexto>`, que dispara o pixel da Meta (`Contact`) e o evento `contato_whatsapp` do Google Ads e abre o WhatsApp certo:
  - principal e Container: (34) 99726-7707
  - Vinhedos: (34) 99337-0707
  - Brooklin: (11) 98901-7679
  - IronBarber by Marco: (11) 93913-7414
  (os mesmos números de links.marcobarbearia.com.br)
- Pixel da Meta 519533885953931 e Google Ads AW-11189677758 (os mesmos do site antigo) carregam depois do primeiro toque ou rolagem, para não pesar na abertura.
- Os vídeos dos famosos abrem o embed do Instagram só quando o card é tocado.

## Como mexer
Edite `src/*.html`, depois rode `python3 build.py`. Movimento em `assets/main.js`.
Conferir: `python3 tools/shots.py <pasta> 390 844` e `python3 tools/serve.py` (servidor com gzip para o Lighthouse).

## A preencher
- `DOMINIO` em `build.py` quando www.marcobarbeariaman.com.br apontar para a Vercel.
- Ação de conversão no Google Ads: trocar o evento `contato_whatsapp` em `src/obrigado.html` pelo `send_to` com o rótulo da conversão.
- Fotos das unidades de São Paulo (Brooklin e IronBarber) quando houver.
