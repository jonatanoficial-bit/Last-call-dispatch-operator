// ===================================================
// Last Call: Dispatch Operator
// Regra 1: arquivo completo (sem partes)
// Ajustado para: Imagen/*.jpg (pasta com I maiúsculo)
// ===================================================

const ASSETS = {
  cover: "Imagen/capa911.jpg",
  logo: "Imagen/logo_central_dispatch.jpg",
  menuBg: "Imagen/menu_background.jpg",
  policeRoom: "Imagen/dispatch_police_room.jpg",
  fireRoom: "Imagen/dispatch_fire_room.jpg",
  mapOverlay: "Imagen/city_map_overlay.jpg",
  iconIncident: "Imagen/icon_incident.jpg",
  iconUnit: "Imagen/icon_unit.jpg",
  overlayCalm: "Imagen/novocrisis_overlay.jpg",
  overlayCrisis: "Imagen/crisis_overlay.jpg",
  hudPanel: "Imagen/hud_panel.jpg"
};

const SAVE_KEY = "lc_dispatch_save_v1";
const RANKING_KEY = "lc_dispatch_ranking_v1";

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function fmt(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function loadSave() {
  try {
    const s = localStorage.getItem(SAVE_KEY);
    if (!s) return null;
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function saveState(state) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function pushRanking(rankName, score) {
  const list = JSON.parse(localStorage.getItem(RANKING_KEY) || "[]");
  list.push({ rank: rankName, score, at: new Date().toISOString() });
  list.sort((a, b) => b.score - a.score);
  localStorage.setItem(RANKING_KEY, JSON.stringify(list.slice(0, 10)));
}

// ===================================================
// 1) SPLASH: tocar em qualquer lugar inicia o jogo
// ===================================================
if (document.body.classList.contains("splash-screen")) {
  const careerSelect = document.getElementById("careerSelect");
  const citySelect = document.getElementById("citySelect");

  // estado default
  const existing = loadSave();
  if (existing) {
    if (careerSelect) careerSelect.value = existing.career || "police";
    if (citySelect) citySelect.value = existing.city || "saopaulo";
  }

  const startFromSplash = () => {
    const st = {
      career: careerSelect ? careerSelect.value : "police",
      city: citySelect ? citySelect.value : "saopaulo",
      rank: "Operador",
      score: existing?.score || 0
    };
    saveState(st);
    window.location.href = "game.html";
  };

  // clique/toque em qualquer lugar, exceto quando estiver mexendo no select
  const shouldIgnore = (target) => {
    if (!target) return false;
    const tag = (target.tagName || "").toLowerCase();
    return tag === "select" || tag === "option" || tag === "label";
  };

  document.addEventListener("click", (e) => {
    if (shouldIgnore(e.target)) return;
    startFromSplash();
  }, { passive: true });

  document.addEventListener("touchstart", (e) => {
    const t = e.targetTouches?.[0]?.target || e.target;
    if (shouldIgnore(t)) return;
    startFromSplash();
  }, { passive: true });
}

// ===================================================
// 2) RANKING PAGE
// ===================================================
if (document.getElementById("rankingList")) {
  const container = document.getElementById("rankingList");
  const clearBtn = document.getElementById("clearRankingBtn");
  const list = JSON.parse(localStorage.getItem(RANKING_KEY) || "[]");

  container.innerHTML = "";

  if (!list.length) {
    const div = document.createElement("div");
    div.className = "ranking-item";
    div.textContent = "Sem registros ainda. Jogue uma partida para aparecer aqui.";
    container.appendChild(div);
  } else {
    list.forEach((r, i) => {
      const div = document.createElement("div");
      div.className = "ranking-item";
      const pts = String(r.score || 0);
      const role = r.rank || "Operador";
      div.textContent = `${i + 1}º — ${role} — ${pts} pts`;
      container.appendChild(div);
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      localStorage.removeItem(RANKING_KEY);
      window.location.reload();
    });
  }
}

// ===================================================
// 3) GAME PAGE INIT (stress + eventos extremos)
// ===================================================
const careerLabel = document.getElementById("careerLabel");
if (careerLabel) {
  const st = loadSave() || { career: "police", city: "saopaulo", rank: "Operador", score: 0 };

  // Header
  careerLabel.textContent = st.career === "police" ? "Central: Polícia" : "Central: Bombeiros";
  const cityLabel = document.getElementById("cityLabel");
  const rankLabel = document.getElementById("rankLabel");
  if (cityLabel) cityLabel.textContent = `Cidade: ${st.city}`;
  if (rankLabel) rankLabel.textContent = `Cargo: ${st.rank}`;

  // Fundo por carreira
  const bg = document.querySelector(".game-bg");
  if (bg) {
    bg.style.backgroundImage = `url("${st.career === "police" ? ASSETS.policeRoom : ASSETS.fireRoom}")`;
  }

  // Botão ranking
  const goRankingBtn = document.getElementById("goRankingBtn");
  if (goRankingBtn) {
    goRankingBtn.addEventListener("click", () => window.location.href = "ranking.html");
  }

  startGameLoop(st);
}

function startGameLoop(st) {
  // -----------------------------
  // Estado humano (B5)
  // -----------------------------
  const human = {
    stress: 0,
    fatigue: 0,
    errors: 0,
    score: Number(st.score || 0)
  };

  // -----------------------------
  // Recursos (unidades) (B7)
  // -----------------------------
  let totalUnits = 4;
  let freeUnits = totalUnits;

  // -----------------------------
  // Turno / timer
  // -----------------------------
  let elapsed = 0;
  let remaining = 300;

  // -----------------------------
  // Ocorrências (B8)
  // -----------------------------
  let eventName = "—";
  let calls = [];
  let selectedId = null;

  // -----------------------------
  // DOM
  // -----------------------------
  const elTimer = document.getElementById("timer");
  const elRemaining = document.getElementById("remaining");
  const elStress = document.getElementById("stress");
  const elFatigue = document.getElementById("fatigue");
  const elErrors = document.getElementById("errors");
  const elScore = document.getElementById("score");
  const elFree = document.getElementById("freeUnits");
  const elPending = document.getElementById("pending");
  const elCalls = document.getElementById("callsList");
  const elEvent = document.getElementById("eventLabel");
  const dangerBox = document.getElementById("dangerBox");
  const dangerText = document.getElementById("dangerText");
  const btnDispatch = document.getElementById("dispatchBtn");

  // -----------------------------
  // Inicia evento extremo
  // -----------------------------
  spawnExtremeEvent();

  // -----------------------------
  // Render inicial
  // -----------------------------
  renderAll();
  updateStateClasses(human.stress);
  setDanger("Nenhum alerta no momento.");

  // -----------------------------
  // Timers
  // -----------------------------
  const tGlobal = setInterval(() => {
    elapsed++;
    if (elTimer) elTimer.textContent = fmt(elapsed);
  }, 1000);

  const tTurn = setInterval(() => {
    remaining--;
    if (elRemaining) elRemaining.textContent = fmt(remaining);
    if (remaining <= 0) {
      clearAllTimers();
      endTurn(false, "Tempo esgotado.");
    }
  }, 1000);

  const tStress = setInterval(() => {
    // fadiga constante
    human.fatigue = clamp(human.fatigue + 0.22, 0, 100);

    // stress sobe com fadiga
    human.stress = clamp(human.stress + (human.fatigue > 60 ? 0.55 : 0.25), 0, 100);

    // stress sobe com pendências altas
    const pending = calls.filter(c => !c.resolved).length;
    if (pending >= 6) human.stress = clamp(human.stress + 0.70, 0, 100);
    else if (pending >= 4) human.stress = clamp(human.stress + 0.35, 0, 100);

    updateStateClasses(human.stress);
    renderHUD();

    if (human.stress >= 100) {
      clearAllTimers();
      endTurn(true, "Burnout operacional.");
    }
  }, 1000);

  function clearAllTimers() {
    clearInterval(tGlobal);
    clearInterval(tTurn);
    clearInterval(tStress);
  }

  // -----------------------------
  // Despacho
  // -----------------------------
  btnDispatch.addEventListener("click", () => {
    const selected = calls.find(c => c.id === selectedId && !c.resolved);

    // chance de falha cognitiva (B5)
    const failChance = human.stress / 120;

    if (!selected) {
      registerError("Selecione uma ocorrência antes de despachar.");
      return;
    }

    if (freeUnits <= 0) {
      registerError("Sem unidades livres no momento.");
      return;
    }

    if (Math.random() < failChance) {
      registerError("Falha cognitiva: despacho incorreto sob stress.");
      return;
    }

    // Despacho bem-sucedido
    freeUnits--;
    selected.resolved = true;

    // pontuação por prioridade
    human.score += selected.priority === "CRÍTICA" ? 240 : selected.priority === "ALTA" ? 180 : 120;

    // unidade retorna após tempo
    const returnMs = selected.priority === "CRÍTICA" ? 5200 : selected.priority === "ALTA" ? 4200 : 3200;
    setTimeout(() => {
      freeUnits = Math.min(totalUnits, freeUnits + 1);
      renderHUD();
    }, returnMs);

    setDanger("Despacho realizado com sucesso.");

    // Se zerou pendências, novo evento extremo
    if (calls.filter(c => !c.resolved).length === 0) {
      spawnExtremeEvent();
    }

    selectedId = null;
    renderAll();
    saveProgress();
  });

  function registerError(msg) {
    human.errors++;
    human.stress = clamp(human.stress + 9, 0, 100);
    setDanger(msg);

    // penalidade de score leve
    human.score = Math.max(0, human.score - 40);

    updateStateClasses(human.stress);
    renderHUD();
    saveProgress();

    if (human.errors >= 5) {
      clearAllTimers();
      endTurn(false, "Colapso operacional: muitos erros.");
    }
  }

  function setDanger(msg) {
    if (dangerText) dangerText.textContent = msg;
    if (dangerBox) {
      // realce visual leve no alerta
      dangerBox.style.borderColor = human.stress >= 70 ? "rgba(255,0,0,.35)" : "rgba(255,255,255,.10)";
      dangerBox.style.background = human.stress >= 70 ? "rgba(255,0,0,.10)" : "rgba(0,0,0,.18)";
    }
  }

  function saveProgress() {
    st.score = human.score;
    saveState(st);
  }

  // -----------------------------
  // Eventos extremos (B8)
  // -----------------------------
  function spawnExtremeEvent() {
    const event = pick([
      { name: "Enchente", count: 6 },
      { name: "Incêndio em Massa", count: 5 },
      { name: "Ataque Coordenado", count: 7 },
      { name: "Apagão Urbano", count: 6 },
      { name: "Deslizamento", count: 5 }
    ]);

    eventName = event.name;
    calls = [];

    for (let i = 0; i < event.count; i++) {
      const pr = weightedPriority();
      calls.push({
        id: `${Date.now()}-${i}`,
        title: `${event.name} — ocorrência ${i + 1}`,
        priority: pr,
        resolved: false,
        x: Math.random() * 80 + 10,
        y: Math.random() * 80 + 10
      });
    }

    selectedId = null;
    renderAll();
    drawMapPoints();
  }

  function weightedPriority() {
    const r = Math.random();
    if (r < 0.20) return "CRÍTICA";
    if (r < 0.55) return "ALTA";
    return "MÉDIA";
  }

  // -----------------------------
  // Render
  // -----------------------------
  function renderAll() {
    renderCalls();
    renderHUD();
    if (elEvent) elEvent.textContent = `Evento: ${eventName}`;
  }

  function renderCalls() {
    elCalls.innerHTML = "";

    const pending = calls.filter(c => !c.resolved);
    if (pending.length === 0) {
      const div = document.createElement("div");
      div.className = "call-item";
      div.textContent = "Sem ocorrências no momento.";
      elCalls.appendChild(div);
      return;
    }

    pending.forEach(c => {
      const row = document.createElement("div");
      row.className = "call-item" + (c.id === selectedId ? " selected" : "");
      row.addEventListener("click", () => {
        selectedId = c.id;
        renderCalls();
        setDanger(`Selecionado: ${c.priority} — pronto para despachar.`);
      });

      const left = document.createElement("div");
      left.className = "call-left";

      const icon = document.createElement("img");
      icon.className = "call-icon";
      icon.src = ASSETS.iconIncident;
      icon.alt = "Ocorrência";

      const meta = document.createElement("div");
      meta.className = "call-meta";

      const title = document.createElement("div");
      title.className = "call-title";
      title.textContent = c.title;

      const sub = document.createElement("div");
      sub.className = "call-sub";
      sub.textContent = "Toque para selecionar • depois DESPACHAR";

      meta.appendChild(title);
      meta.appendChild(sub);

      left.appendChild(icon);
      left.appendChild(meta);

      const badge = document.createElement("div");
      badge.className = "badge";
      badge.textContent = c.priority;

      row.appendChild(left);
      row.appendChild(badge);
      elCalls.appendChild(row);
    });
  }

  function renderHUD() {
    if (elStress) elStress.textContent = `${Math.floor(human.stress)}%`;
    if (elFatigue) elFatigue.textContent = `${Math.floor(human.fatigue)}%`;
    if (elErrors) elErrors.textContent = String(human.errors);
    if (elScore) elScore.textContent = String(human.score);
    if (elFree) elFree.textContent = String(freeUnits);

    const pending = calls.filter(c => !c.resolved).length;
    if (elPending) elPending.textContent = String(pending);

    // Ajusta texto do alerta conforme estado
    if (human.stress >= 70) setDanger("CRISE: respire, selecione com cuidado e priorize ocorrências críticas.");
    else if (human.stress >= 40) setDanger("ALERTA: seu stress está aumentando. Evite erros e mantenha o foco.");
  }

  // -----------------------------
  // Mapa (pontos de ocorrência)
  // -----------------------------
  function drawMapPoints() {
    const svg = document.getElementById("mapSvg");
    if (!svg) return;

    // remove pontos antigos
    const old = svg.querySelectorAll(".incident-dot");
    old.forEach(n => n.remove());

    // cria pontos
    calls.forEach(c => {
      if (c.resolved) return;
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("class", "incident-dot");
      dot.setAttribute("cx", String(c.x));
      dot.setAttribute("cy", String(c.y));
      dot.setAttribute("r", c.priority === "CRÍTICA" ? "2.6" : c.priority === "ALTA" ? "2.2" : "1.8");
      dot.setAttribute("fill", c.priority === "CRÍTICA" ? "#ff3b3b" : c.priority === "ALTA" ? "#ffb300" : "#00e676");
      dot.setAttribute("opacity", "0.95");
      svg.appendChild(dot);
    });
  }

  // redesenha pontos quando muda seleção/resolve
  const obs = new MutationObserver(() => drawMapPoints());
  obs.observe(elCalls, { childList: true, subtree: true });

  // -----------------------------
  // Fim de turno
  // -----------------------------
  function endTurn(burnout, reason) {
    saveProgress();

    // salva no ranking
    pushRanking(st.rank || "Operador", human.score);

    if (burnout) {
      alert(`BURNOUT OPERACIONAL\n\nMotivo: ${reason}\nPontuação: ${human.score}`);
      window.location.href = "ranking.html";
      return;
    }

    alert(`TURNO ENCERRADO\n\nMotivo: ${reason}\nPontuação: ${human.score}`);
    window.location.href = "ranking.html";
  }
}

// ===================================================
// Estado visual (calm/alert/crisis)
// ===================================================
function updateStateClasses(stress) {
  const body = document.body;
  if (!body.classList.contains("game-screen")) return;

  body.classList.remove("state-calm", "state-alert", "state-crisis");

  if (stress >= 70) body.classList.add("state-crisis");
  else if (stress >= 40) body.classList.add("state-alert");
  else body.classList.add("state-calm");
        }
