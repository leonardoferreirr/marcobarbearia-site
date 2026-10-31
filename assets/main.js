// Marco Barbearia: movimento da página, sem bibliotecas (rAF + IntersectionObserver).
// Regra: nada nasce invisível dependendo daqui; se o script falhar, a página aparece inteira.
(() => {
  const d = document, root = d.documentElement;
  const $ = s => d.querySelector(s), $$ = s => [...d.querySelectorAll(s)];
  const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const desktop = () => innerWidth >= 900;
  const lim = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const sai = t => 1 - Math.pow(1 - t, 3);

  /* ---------- espelho do topo: a cor aparece dentro do aro ---------- */
  const hero = $('#hero'), foto = $('.hero-foto');
  let alvo = null, pos = null, raio = 0, ultimoMouse = 0, heroNaTela = true, t0 = performance.now();
  const raioAlvo = () => desktop() ? Math.max(120, Math.min(230, innerWidth * .15)) : Math.max(96, innerWidth * .28);
  const centro = () => {
    const r = hero.getBoundingClientRect();
    return desktop() ? { x: r.width * .72, y: r.height * .44 } : { x: r.width * .5, y: r.height * .34 };
  };
  if (hero && foto && !reduz) {
    pos = centro(); alvo = { ...pos };
    hero.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      const r = hero.getBoundingClientRect();
      alvo = { x: e.clientX - r.left, y: e.clientY - r.top }; ultimoMouse = performance.now();
    });
    const quadro = agora => {
      if (heroNaTela) {
        const r = hero.getBoundingClientRect();
        if (agora - ultimoMouse > 2500) {           // sem mouse: o espelho passeia devagar
          const c = centro(), t = (agora - t0) / 1000;
          alvo = { x: c.x + Math.sin(t * .32) * r.width * (desktop() ? .12 : .22), y: c.y + Math.sin(t * .47) * r.height * .1 };
        }
        pos.x += (alvo.x - pos.x) * .08; pos.y += (alvo.y - pos.y) * .08;
        raio += (raioAlvo() - raio) * .06;
        foto.style.setProperty('--x', pos.x.toFixed(1) + 'px');
        foto.style.setProperty('--y', pos.y.toFixed(1) + 'px');
        foto.style.setProperty('--r', raio.toFixed(1) + 'px');
      }
      requestAnimationFrame(quadro);
    };
    requestAnimationFrame(quadro);
  } else if (foto) {
    foto.style.setProperty('--r', raioAlvo() + 'px');
  }

  /* ---------- formato de rosto que se transforma ---------- */
  const FORMATOS = [
    ['oval', 'Oval', 'Proporções equilibradas, que aceitam quase tudo. O cuidado é não colocar volume demais num ponto só e quebrar esse equilíbrio.', y => .74 * Math.sqrt(1 - y * y) * (1 - .1 * Math.max(y, 0)), 1],
    ['redondo', 'Redondo', 'A ideia é alongar: mais volume no topo, laterais mais baixas e uma barba que desenha o queixo.', y => .9 * Math.pow(1 - y * y, .42), .86],
    ['quadrado', 'Quadrado', 'Mandíbula marcada é presença. Dá para suavizar com textura no topo ou reforçar com linhas retas, conforme o jeito como você quer ser visto.', y => .82 * Math.pow(1 - Math.pow(Math.abs(y), 5), .2), .9],
    ['alongado', 'Alongado', 'Pede menos altura no topo e um pouco mais de volume nas laterais, e uma franja ou textura ajuda a encurtar a linha do rosto.', y => .64 * Math.pow(1 - Math.pow(Math.abs(y), 4.5), 1 / 4.5), 1.08],
    ['triangular', 'Triangular', 'Quando a mandíbula é mais larga que a testa, volume na parte de cima equilibra a base, com a barba mais curta nas laterais.', y => (.5 + .34 * (y + 1) / 2) * Math.pow(1 - Math.pow(Math.abs(y), 4), .25), .96],
    ['coracao', 'Coração', 'Testa larga e queixo fino pedem menos volume no topo e uma barba que dê corpo ao queixo.', y => (.88 - .4 * Math.pow((y + 1) / 2, 1.3)) * Math.pow(1 - Math.pow(Math.abs(y), 2.2), 1 / 2.2), .98],
    ['losango', 'Losango', 'As maçãs do rosto aparecem mais. Volume na testa e no queixo equilibram, sem exagero nas laterais.', y => .82 * Math.pow(Math.max(0, 1 - Math.pow(Math.abs((y + .12) / 1.12), 1.5)), .9), 1],
  ];
  const N = 44, S = 172, H = 205, NIV = [-.55, -.1, .55];
  const pontos = ([, , , W, v]) => {
    const dir = [], esq = [];
    for (let i = 0; i <= N; i++) {
      const y = -1 + 2 * i / N, x = S * W(y);
      dir.push([x, y * H * v]); esq.unshift([-x, y * H * v]);
    }
    return { pts: [...dir, ...esq.slice(1, -1)], nivel: NIV.map(y => ({ y: y * H * v, x: S * W(y) })) };
  };
  const face = $('#face');
  if (face) {
    const caminho = pts => 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z';
    const lista = $('#formatos'), dica = $('#dica-rosto');
    lista.innerHTML = FORMATOS.map(([id, nome], i) => `<button type="button" data-i="${i}" aria-pressed="${i === 0}">${nome}</button>`).join('');
    let atual = pontos(FORMATOS[0]);
    const pinta = forma => {
      face.setAttribute('d', caminho(forma.pts));
      forma.nivel.forEach((n, k) => {
        $('#g' + (k + 1)).setAttribute('y1', n.y); $('#g' + (k + 1)).setAttribute('y2', n.y);
        const m = $('#m' + (k + 1)); m.setAttribute('x1', -n.x); m.setAttribute('x2', n.x); m.setAttribute('y1', n.y); m.setAttribute('y2', n.y);
        const t = $('#t' + (k + 1)); t.setAttribute('x', n.x + 12); t.setAttribute('y', n.y + 4);
      });
      const yb = forma.nivel[1].y - 34, xb = forma.nivel[1].x * .62;
      $('#sobr').setAttribute('d', `M${-xb} ${yb + 4}Q${-xb / 2} ${yb - 8} ${-12} ${yb + 2}M${xb} ${yb + 4}Q${xb / 2} ${yb - 8} ${12} ${yb + 2}`);
    };
    const escreve = i => { dica.innerHTML = `<b>Rosto ${FORMATOS[i][1].toLowerCase()}</b><p>${FORMATOS[i][2]}</p>`; };
    pinta(atual); escreve(0);
    let anima = null;
    lista.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const i = +b.dataset.i;
      lista.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
      escreve(i);
      const de = atual, para = pontos(FORMATOS[i]);
      if (reduz) { atual = para; pinta(atual); return; }
      cancelAnimationFrame(anima);
      const ini = performance.now();
      const passo = agora => {
        const k = sai(lim((agora - ini) / 650));
        atual = {
          pts: de.pts.map((p, j) => [p[0] + (para.pts[j][0] - p[0]) * k, p[1] + (para.pts[j][1] - p[1]) * k]),
          nivel: de.nivel.map((n, j) => ({ y: n.y + (para.nivel[j].y - n.y) * k, x: n.x + (para.nivel[j].x - n.x) * k })),
        };
        pinta(atual);
        if (k < 1) anima = requestAnimationFrame(passo);
      };
      anima = requestAnimationFrame(passo);
    });
  }

  /* ---------- galeria de clientes: corre de lado com a rolagem (computador) ---------- */
  const palco = $('#palco'), fila = $('#fila');
  let curso = 0;
  function medeGaleria() {
    if (!palco || !fila) return;
    if (!desktop() || reduz) { palco.style.height = ''; fila.style.transform = ''; curso = 0; return; }
    curso = Math.max(0, fila.scrollWidth - innerWidth);
    palco.style.height = (innerHeight + curso) + 'px';
  }

  /* ---------- vídeo do Instagram só carrega quando abre ---------- */
  const modal = $('#modal'), video = $('#video');
  const fecha = () => { if (modal.open) modal.close(); };
  if (modal && modal.showModal) {
    fila && fila.addEventListener('click', e => {
      const c = e.target.closest('[data-ig]'); if (!c) return;
      video.src = `https://www.instagram.com/${c.dataset.ig}/embed/`;
      modal.showModal();
    });
    $('#fecha').addEventListener('click', fecha);
    modal.addEventListener('click', e => { if (e.target === modal) fecha(); });
    modal.addEventListener('close', () => { video.src = 'about:blank'; });
  } else if (fila) {
    // navegador sem <dialog>: abre o post direto no Instagram
    fila.addEventListener('click', e => { const c = e.target.closest('[data-ig]'); if (c) open(`https://www.instagram.com/${c.dataset.ig}/`, '_blank', 'noopener'); });
  }

  /* ---------- um laço só para o que depende da rolagem ---------- */
  const topo = $('#topo'), passos = $('#passos'), tempo = $('#linha-tempo'), fim = $('#fim'), flutua = $('#flutua');
  const itensPasso = passos ? $$('#passos .passo') : [], marcos = tempo ? $$('#linha-tempo .marco') : [];
  let pedido = false, fimNaTela = false, heroCta = true;
  const pede = () => { if (!pedido) { pedido = true; requestAnimationFrame(rolagem); } };
  function rolagem() {
    pedido = false;
    const vh = innerHeight;
    topo.classList.toggle('solido', scrollY > 30);
    if (curso && palco) {
      const r = palco.getBoundingClientRect();
      const p = lim(-r.top / (r.height - vh));
      fila.style.transform = `translate3d(${(-p * curso).toFixed(1)}px,0,0)`;
    }
    if (passos && !reduz) {
      const r = passos.getBoundingClientRect();
      const p = lim((vh * .78 - r.top) / (r.height + vh * .2));
      passos.style.setProperty('--p', p.toFixed(3));
      itensPasso.forEach((li, i) => li.classList.toggle('on', p >= i / (itensPasso.length - 1) - .05 || !desktop()));
    } else itensPasso.forEach(li => li.classList.add('on'));
    if (tempo && !reduz) {
      const r = tempo.getBoundingClientRect();
      const p = lim((vh * .7 - r.top) / r.height);
      tempo.style.setProperty('--p', p.toFixed(3));
      marcos.forEach((m, i) => m.classList.toggle('on', p >= (i + .5) / marcos.length));
    } else marcos.forEach(m => m.classList.add('on'));
    if (fim && !reduz) {
      const r = fim.getBoundingClientRect();
      const p = lim(-r.top / (r.height - vh));
      fim.style.setProperty('--c', (14 + sai(p) * 130).toFixed(1) + '%');
      fim.style.setProperty('--o', lim((p - .22) / .25).toFixed(3));
    }
    flutua.classList.toggle('on', !heroCta && !fimNaTela);
  }
  if (fim && !reduz) { fim.style.setProperty('--c', '14%'); fim.style.setProperty('--o', '0'); }
  addEventListener('scroll', pede, { passive: true });

  /* ---------- números que contam ---------- */
  const conta = el => {
    const fimN = +el.dataset.num, ini = performance.now();
    if (reduz) return;
    const q = agora => { const k = sai(lim((agora - ini) / 1300)); el.textContent = Math.round(fimN * k); if (k < 1) requestAnimationFrame(q); };
    requestAnimationFrame(q);
  };

  /* ---------- bolha amarela que segue o mouse na equipe ---------- */
  const time = $('#time'), bolha = $('#bolha');
  if (time && bolha && !reduz) {
    time.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; bolha.style.left = e.clientX + 'px'; bolha.style.top = e.clientY + 'px'; });
    time.addEventListener('pointerover', e => { if (e.target.closest('.pessoa')) bolha.classList.add('on'); });
    time.addEventListener('pointerleave', () => bolha.classList.remove('on'));
  }

  /* ---------- observadores ---------- */
  if ('IntersectionObserver' in window) {
    const revela = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in'); revela.unobserve(e.target);
      e.target.querySelectorAll('[data-num]').forEach(conta);
    }), { rootMargin: '0px 0px -8% 0px', threshold: .12 });
    $$('.rv').forEach(el => revela.observe(el));
    root.classList.add('rv-pronto');
    if (hero) new IntersectionObserver(([e]) => { heroNaTela = e.isIntersecting; }).observe(hero);
    const cta = $('#acoes-hero');
    if (cta) new IntersectionObserver(([e]) => { heroCta = e.isIntersecting; pede(); }).observe(cta);
    if (fim) new IntersectionObserver(([e]) => { fimNaTela = e.isIntersecting; pede(); }).observe(fim);
    const anda = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('roda', e.isIntersecting && !reduz)));
    $$('.faixa').forEach(f => anda.observe(f));
  }

  /* ---------- faixas infinitas: copia até a metade passar da largura da tela ---------- */
  const faixas = $$('.faixa'), originais = new Map(faixas.map(f => [f, f.querySelector('.trilho').innerHTML]));
  const montaFaixa = f => {
    const tr = f.querySelector('.trilho');
    tr.innerHTML = originais.get(f);
    const k = Math.max(1, Math.ceil(f.clientWidth / tr.scrollWidth));
    tr.innerHTML = originais.get(f).repeat(k * 2);
    tr.style.setProperty('--dur', parseFloat(getComputedStyle(f).getPropertyValue('--dur')) * k + 's');
  };
  const ocioso = window.requestIdleCallback || (fn => setTimeout(fn, 60));

  /* ---------- pixel da Meta e tag do Google Ads entram só depois do primeiro sinal de gente ---------- */
  let rastreioOk = false;
  function rastreio() {
    if (rastreioOk) return; rastreioOk = true;
    /* eslint-disable */
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments) }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s) }(window, d, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    fbq('init', '519533885953931'); fbq('track', 'PageView');
    const g = d.createElement('script'); g.async = true; g.src = 'https://www.googletagmanager.com/gtag/js?id=AW-11189677758'; d.head.appendChild(g);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag('js', new Date()); gtag('config', 'AW-11189677758');
  }
  ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(ev => addEventListener(ev, rastreio, { once: true, passive: true }));

  /* ---------- partida ---------- */
  const comeca = () => { medeGaleria(); pede(); };
  comeca();
  d.fonts && d.fonts.ready.then(comeca);
  const depoisDoLoad = () => { comeca(); faixas.forEach(f => ocioso(() => montaFaixa(f))); setTimeout(rastreio, 4000); };
  d.readyState === 'complete' ? depoisDoLoad() : addEventListener('load', depoisDoLoad);
  let tr; addEventListener('resize', () => { clearTimeout(tr); tr = setTimeout(() => { medeGaleria(); faixas.forEach(montaFaixa); pede(); }, 200); });
})();
