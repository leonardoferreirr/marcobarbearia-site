// Marco Barbearia: movimento da página, sem bibliotecas (rAF + IntersectionObserver).
// Regra: nada nasce invisível dependendo daqui; se o script falhar, a página aparece inteira.
(() => {
  const d = document, root = d.documentElement;
  const $ = s => d.querySelector(s), $$ = s => [...d.querySelectorAll(s)];
  const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const desktop = () => innerWidth >= 900;
  const lim = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const sai = t => 1 - Math.pow(1 - t, 3);

  /* ---------- espelho do topo (só no computador): a cor aparece dentro do aro ---------- */
  const hero = $('#hero'), foto = $('.hero-foto');
  let alvo = null, pos = null, raio = 0, ultimoMouse = 0, heroNaTela = true, t0 = performance.now();
  const raioAlvo = () => Math.max(120, Math.min(230, innerWidth * .15));
  const centro = () => {
    const r = foto.getBoundingClientRect();
    return { x: r.width * .76, y: r.height * .42 };
  };
  if (hero && foto && !reduz) {
    pos = centro(); alvo = { ...pos };
    hero.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      const r = foto.getBoundingClientRect();
      alvo = { x: e.clientX - r.left, y: e.clientY - r.top }; ultimoMouse = performance.now();
    });
    const quadro = agora => {
      if (heroNaTela && desktop()) {
        const r = foto.getBoundingClientRect();
        if (agora - ultimoMouse > 2500) {           // sem mouse: o espelho passeia devagar
          const c = centro(), t = (agora - t0) / 1000;
          alvo = { x: c.x + Math.sin(t * .32) * r.width * .12, y: c.y + Math.sin(t * .47) * r.height * .1 };
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
  // Contorno feito de pontos de controle anatômicos (topo, têmpora, testa, maçã, mandíbula, queixo)
  // ligados por spline; cada formato muda só as proporções, como num rosto de verdade.
  const FORMATOS = [
    ['oval', 'Oval', 'Proporções equilibradas, que aceitam quase tudo. O cuidado é não colocar volume demais num ponto só e quebrar esse equilíbrio.', [.70, .80, .62, .30, 1]],
    ['redondo', 'Redondo', 'A ideia é alongar: mais volume no topo, laterais mais baixas e uma barba que desenha o queixo.', [.76, .86, .74, .40, .9]],
    ['quadrado', 'Quadrado', 'Mandíbula marcada é presença. Dá para suavizar com textura no topo ou reforçar com linhas retas, conforme o jeito como você quer ser visto.', [.78, .82, .80, .52, .95]],
    ['alongado', 'Alongado', 'Pede menos altura no topo e um pouco mais de volume nas laterais, e uma franja ou textura ajuda a encurtar a linha do rosto.', [.64, .72, .62, .32, 1.1]],
    ['triangular', 'Triangular', 'Quando a mandíbula é mais larga que a testa, volume na parte de cima equilibra a base, com a barba mais curta nas laterais.', [.62, .76, .84, .46, .98]],
    ['coracao', 'Coração', 'Testa larga e queixo fino pedem menos volume no topo e uma barba que dê corpo ao queixo.', [.84, .82, .58, .18, 1]],
    ['losango', 'Losango', 'As maçãs do rosto aparecem mais. Volume na testa e no queixo equilibram, sem exagero nas laterais.', [.58, .86, .60, .22, 1.02]],
  ];
  const S = 175, H = 208, POR = 9;           // escala, meia altura, amostras por trecho
  const catmull = (p0, p1, p2, p3, t) => {
    const t2 = t * t, t3 = t2 * t;
    return [0, 1].map(k => .5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3));
  };
  const pontos = forma => {
    const [fh, ck, jw, ch, L] = forma[3];
    const c = [[0, -1], [.56 * fh, -.95], [fh, -.62], [ck, -.12], [jw, .42], [ch + (jw - ch) * .38, .8], [ch * .55, .97], [0, 1]]
      .map(([x, y]) => [x * S, y * H * L]);
    const ext = [[-c[1][0], c[1][1]], ...c, [-c[6][0], c[6][1]]];
    const dir = [];
    for (let i = 1; i < ext.length - 2; i++)
      for (let k = 0; k < POR; k++) dir.push(catmull(ext[i - 1], ext[i], ext[i + 1], ext[i + 2], k / POR));
    dir.push(c[c.length - 1]);
    const esq = dir.slice(1, -1).reverse().map(([x, y]) => [-x, y]);
    return { pts: [...dir, ...esq], L, nivel: [[fh, -.62], [ck, -.12], [jw, .42]].map(([x, y]) => ({ x: x * S, y: y * H * L })) };
  };
  const face = $('#face');
  if (face) {
    const caminho = pts => 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z';
    const lista = $('#formatos'), dica = $('#dica-rosto');
    lista.innerHTML = FORMATOS.map(([id, nome], i) => (i === 4 ? '<span class="quebra" aria-hidden="true"></span>' : '') + `<button type="button" data-i="${i}" aria-pressed="${i === 0}">${nome}</button>`).join('');
    let atual = pontos(FORMATOS[0]);
    const pinta = f => {
      face.setAttribute('d', caminho(f.pts));
      f.nivel.forEach((n, k) => {
        const g = $('#g' + (k + 1)); g.setAttribute('y1', n.y); g.setAttribute('y2', n.y);
        const m = $('#m' + (k + 1)); m.setAttribute('x1', -n.x); m.setAttribute('x2', n.x); m.setAttribute('y1', n.y); m.setAttribute('y2', n.y);
        const t = $('#t' + (k + 1)); t.setAttribute('x', n.x + 14); t.setAttribute('y', n.y + 4);
      });
      // traços discretos: sobrancelhas, olhos, nariz e boca acompanham a altura do rosto
      const y = v => (v * H * f.L).toFixed(1);
      $('#tracos').setAttribute('d',
        `M-74 ${y(-.33)}Q-48 ${y(-.4)} -22 ${y(-.34)}M74 ${y(-.33)}Q48 ${y(-.4)} 22 ${y(-.34)}` +
        `M-66 ${y(-.2)}Q-48 ${y(-.25)} -30 ${y(-.2)}Q-48 ${y(-.16)} -66 ${y(-.2)}M66 ${y(-.2)}Q48 ${y(-.25)} 30 ${y(-.2)}Q48 ${y(-.16)} 66 ${y(-.2)}` +
        `M-4 ${y(-.12)}L-10 ${y(.17)}Q0 ${y(.22)} 12 ${y(.17)}` +
        `M-30 ${y(.46)}Q0 ${y(.52)} 30 ${y(.46)}`);
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
          L: de.L + (para.L - de.L) * k,
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
      itensPasso.forEach((li, i) => li.classList.toggle('on', p >= i / (itensPasso.length - 1) - .05));
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
