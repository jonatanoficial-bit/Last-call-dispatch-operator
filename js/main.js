(()=>{"use strict";

/* =========================
   CONFIG FIXA (GitHub Pages)
   ========================= */
const REPO_BASE = "/Last-call-dispatch-operator";
const APP_VERSION = "lc_dispatch_v1_1_gameplay";
const LS_STATE = APP_VERSION + "_state";
const LS_RANK  = APP_VERSION + "_rank";

/* =========================
   HELPERS
   ========================= */
const $ = (s,r=document)=>r.querySelector(s);
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const now = ()=>Date.now();
const pad2 = (n)=>String(n).padStart(2,"0");
const fmtTime = (sec)=>{sec=Math.max(0,Math.floor(sec));const m=Math.floor(sec/60),s=sec%60;return `${pad2(m)}:${pad2(s)}`;};
const safeJson = (s,f)=>{try{return JSON.parse(s);}catch{return f;}};

/* =========================
   DATA (DEMO REALISTA)
   ========================= */
const INCIDENT_TYPES_POLICE=[
  "Agressão / Briga",
  "Roubo / Assalto em andamento",
  "Furto",
  "Violência doméstica",
  "Pessoa desaparecida",
  "Pessoa armada / ameaça",
  "Perturbação do sossego",
  "Acidente de trânsito (apoio)"
];
const INCIDENT_TYPES_FIRE=[
  "Incêndio residencial",
  "Incêndio veicular",
  "Resgate (altura / difícil acesso)",
  "Atendimento pré-hospitalar (APH)",
  "Vazamento de gás / risco químico",
  "Alagamento / enchente",
  "Acidente de trânsito (resgate)"
];
const UNITS_POLICE=[
  "Viatura Rádio Patrulha",
  "Força Tática",
  "ROTA (apoio tático)",
  "Policiamento comunitário",
  "Trânsito (apoio)"
];
const UNITS_FIRE=[
  "Auto Bomba (AB)",
  "Auto Tanque (AT)",
  "Unidade de Resgate (UR)",
  "Ambulância (APH)",
  "Defesa Civil (apoio)"
];

const CITY_SEEDS={
  "São Paulo":["SP","Zona Norte","Zona Sul","Centro"],
  "Rio de Janeiro":["RJ","Zona Norte","Zona Sul","Centro"],
  "Belo Horizonte":["MG","Centro","Pampulha","Barreiro"],
  "New York":["NY","Manhattan","Brooklyn","Queens"],
  "Washington":["DC","Downtown","Georgetown","Capitol Hill"],
  "London":["UK","Camden","Westminster","Southwark"],
  "Paris":["FR","15e","18e","3e"],
  "Berlin":["DE","Mitte","Kreuzberg","Prenzlauer Berg"],
  "Seoul":["KR","Gangnam","Jongno","Mapo"],
  "Beijing":["CN","Chaoyang","Haidian","Dongcheng"],
  "Buenos Aires":["AR","Palermo","Recoleta","Caballito"]
};
const pick = (a)=>a[Math.floor(Math.random()*a.length)];
function genAddress(city){
  const seed=CITY_SEEDS[city]||["Centro"];
  const area=pick(seed);
  const n=10+Math.floor(Math.random()*890);
  const streets=[
    "Rua das Flores","Avenida Central","Rua São Jorge","Rua do Comércio",
    "Avenida da Liberdade","Rua Nova","Rua do Porto","Avenida Brasil",
    "Rua Vitória","Avenida Norte"
  ];
  return `${pick(streets)}, ${n} - ${area}`;
}

/* =========================
   BACKGROUND DINÂMICO (JOGO)
   ========================= */
function setRoomBackgroundAbsolute(imageFile){
  let st = document.getElementById("dynamicRoomStyle");
  if(!st){st=document.createElement("style");st.id="dynamicRoomStyle";document.head.appendChild(st);}
  const url = `${REPO_BASE}/Imagen/${imageFile}`;
  st.textContent = `.page-game::before{background-image:url("${url}") !important;}`;
}

/* =========================
   CENÁRIOS
   ========================= */
function buildScenarioPack(service, city){
  const a1=genAddress(city), a2=genAddress(city), a3=genAddress(city), a4=genAddress(city);

  const base=[
    {
      service:"police",
      opening:"(voz tremendo) Ele tá gritando e quebrando tudo aqui em casa... eu tô com medo.",
      facts:{ location:a1, risk:"Possível agressão em andamento", weapon:"Não confirmado", injuries:"Não confirmado" },
      ask:{
        "Perguntar endereço":`O endereço é ${a1}. Por favor, vem rápido.`,
        "Perguntar se há arma":"Eu não vi arma, mas ele tá muito alterado.",
        "Perguntar se há feridos":"Eu tô com dor no braço... ele me empurrou.",
        "Orientar segurança":"Eu vou me trancar no quarto. Tô com a criança comigo.",
        "Perguntar descrição":"É meu marido… tá sem camisa, muito nervoso.",
        "Orientar não confrontar":"Tá bom, eu não vou discutir com ele."
      },
      correct:{ type:"Violência doméstica", priority:"P1", unit:"Viatura Rádio Patrulha", required:["Perguntar endereço","Perguntar se há feridos"] }
    },
    {
      service:"police",
      opening:"Tem um cara tentando arrombar a loja aqui do lado! Eu ouvi vidro quebrando!",
      facts:{ location:a2, risk:"Crime em andamento", weapon:"Não confirmado", injuries:"Nenhum" },
      ask:{
        "Perguntar endereço":`É na ${a2}. Loja de esquina.`,
        "Perguntar descrição":"Ele tá de moletom escuro e boné. Tá sozinho.",
        "Perguntar se há arma":"Não vi arma, mas ele tá mexendo na cintura.",
        "Orientar não confrontar":"Tá, vou ficar aqui dentro e não vou sair.",
        "Orientar segurança":"Vou trancar a porta e apagar as luzes."
      },
      correct:{ type:"Roubo / Assalto em andamento", priority:"P1", unit:"Força Tática", required:["Perguntar endereço","Perguntar descrição"] }
    },
    {
      service:"fire",
      opening:"Tá saindo fumaça do apartamento do vizinho! O corredor já tá com cheiro forte!",
      facts:{ location:a3, risk:"Incêndio potencial", injuries:"Desconhecido" },
      ask:{
        "Perguntar endereço":`É na ${a3}. Prédio de 8 andares.`,
        "Perguntar se há chamas":"Eu ainda não vi chama, só muita fumaça pela porta.",
        "Orientar evacuar":"Ok, vou avisar o síndico e descer pelas escadas.",
        "Perguntar pessoas presas":"Tem um idoso lá... não atende a porta.",
        "Perguntar se há feridos":"Não sei… ninguém saiu ainda."
      },
      correct:{ type:"Incêndio residencial", priority:"P1", unit:"Auto Bomba (AB)", required:["Perguntar endereço","Perguntar pessoas presas"] }
    },
    {
      service:"fire",
      opening:"Tá com cheiro de gás aqui na rua toda, eu tô passando mal.",
      facts:{ location:a4, risk:"Explosão/ intoxicação", injuries:"Tontura relatada" },
      ask:{
        "Perguntar endereço":`Aqui é ${a4}.`,
        "Orientar afastar e ventilar":"Ok, vou abrir tudo e sair de perto.",
        "Perguntar se há faísca/fogo":"Não, ninguém acendeu nada por enquanto.",
        "Perguntar feridos":"Minha mãe tá tonta e com dor de cabeça.",
        "Perguntar pessoas presas":"Tem gente dentro da casa ainda."
      },
      correct:{ type:"Vazamento de gás / risco químico", priority:"P1", unit:"Unidade de Resgate (UR)", required:["Perguntar endereço","Orientar afastar e ventilar"] }
    }
  ];

  const filtered = base.filter(s=>s.service===service);
  const expanded = [];
  for(let i=0;i<6;i++){
    const b = JSON.parse(JSON.stringify(pick(filtered)));
    b.facts.location = genAddress(city);
    b.ask["Perguntar endereço"] = `O endereço é ${b.facts.location}.`;
    expanded.push(b);
  }
  return expanded.slice(0,6);
}

/* =========================
   STATE
   ========================= */
function defaultState(){
  return {
    service:"police",
    city:"São Paulo",
    difficulty:"normal",
    shiftMinutes:10,
    shiftEndsAt: now() + 10*60*1000,
    score:0,
    errors:0,
    stress:0,

    callIndex:0,
    callEndsAt:0,
    callSecondsLimit:90,

    scenarios:[],
    current:null,

    revealed:{},
    asked:{},
    summary:null,
    lastDispatch:null,
    _timePenaltyApplied:false
  };
}
function loadState(){
  const s = safeJson(localStorage.getItem(LS_STATE), null);
  if(!s || !s.service || !s.city) return defaultState();
  return s;
}
function saveState(st){ localStorage.setItem(LS_STATE, JSON.stringify(st)); }
function clearState(){ localStorage.removeItem(LS_STATE); }

/* =========================
   RANKING
   ========================= */
function loadRank(){ return safeJson(localStorage.getItem(LS_RANK), []); }
function saveRank(r){ localStorage.setItem(LS_RANK, JSON.stringify(r)); }
function pushRank(entry){
  const r = loadRank();
  r.push(entry);
  r.sort((a,b)=>b.score-a.score);
  saveRank(r.slice(0,10));
}

/* =========================
   SCORING
   ========================= */
function applyPenalty(st, reason, points){
  st.errors += 1;
  st.score = Math.max(0, st.score - points);
  st.stress = clamp(st.stress + Math.round(points/2), 0, 100);
  st.summary = `Penalidade: -${points} (${reason})`;
}
function applyReward(st, reason, points){
  st.score += points;
  st.stress = clamp(st.stress - Math.round(points/3), 0, 100);
  st.summary = `Bônus: +${points} (${reason})`;
}

/* =========================
   RENDER
   ========================= */
function renderHUD(st){
  $("#hudService").textContent = st.service==="police" ? "POLÍCIA" : "BOMBEIROS";
  $("#hudCity").textContent = st.city;
  $("#hudShift").textContent = `Turno: ${st.shiftMinutes} min • Dif.: ${st.difficulty}`;
  $("#hudScore").textContent = String(st.score);
  $("#hudErrors").textContent = String(st.errors);
  $("#hudStress").textContent = String(Math.round(st.stress));
  const left = Math.max(0, Math.floor((st.shiftEndsAt - now())/1000));
  $("#hudTime").textContent = fmtTime(left);
}
function renderFacts(st){
  const el = $("#facts");
  el.innerHTML = "";

  const pills = [];
  pills.push(st.revealed.location ? {t:"📍 Endereço coletado", c:"good"} : {t:"📍 Endereço pendente", c:"warn"});
  pills.push(st.revealed.injuries ? {t:"🩹 Feridos: "+st.revealed.injuries, c:"good"} : {t:"🩹 Feridos: não confirmado", c:"warn"});

  if(st.service==="police"){
    pills.push(st.revealed.weapon ? {t:"🔪 Arma: "+st.revealed.weapon, c:"warn"} : {t:"🔪 Arma: não confirmado", c:"warn"});
  }
  if(st.revealed.risk){
    pills.push({t:"⚠️ Risco: "+st.revealed.risk, c:"warn"});
  }

  for(const p of pills){
    const d = document.createElement("div");
    d.className = "pill " + (p.c||"");
    d.textContent = p.t;
    el.appendChild(d);
  }
}
function renderChecklist(st){
  const el = $("#checklist");
  el.innerHTML = "";

  const req = st.current?.correct?.required || [];
  const items = [
    {key:"address", label:"Coletar endereço com confirmação"},
    {key:"type", label:"Classificar tipo corretamente"},
    {key:"priority", label:"Definir prioridade adequada"},
    {key:"unit", label:"Selecionar unidade coerente"},
    ...req.map(k=>({key:k, label:`Pergunta essencial: ${k}`}))
  ];

  for(const it of items){
    const on =
      (it.key==="address" && !!st.revealed.location) ||
      (it.key==="type" && !!st.lastDispatch?.type) ||
      (it.key==="priority" && !!st.lastDispatch?.priority) ||
      (it.key==="unit" && !!st.lastDispatch?.unit) ||
      !!st.asked[it.key];

    const row = document.createElement("div");
    row.className = "check-item";
    row.innerHTML = `<div class="check-dot ${on?"on":""}"></div><div class="check-text">${it.label}</div>`;
    el.appendChild(row);
  }
}
function renderSummary(st){
  const el = $("#summary");
  const parts = [];
  if(st.summary) parts.push(st.summary);
  if(st.lastDispatch){
    parts.push(`Despacho: ${st.lastDispatch.type} • ${st.lastDispatch.priority} • ${st.lastDispatch.unit}`);
    parts.push(`Endereço: ${st.lastDispatch.address || "—"}`);
  }else{
    parts.push("Nenhum despacho confirmado ainda.");
  }
  el.textContent = parts.join("\n");
}
function setCallTimer(st){
  const left = Math.max(0, Math.floor((st.callEndsAt - now())/1000));
  $("#callTime").textContent = fmtTime(left);
}

/* =========================
   TYPEWRITER
   ========================= */
function addLine(transcriptEl, role, msg, opt={}){
  const line = document.createElement("div");
  line.className = "line";
  line.innerHTML = `<div class="role">${role}</div><div class="msg"></div>`;
  transcriptEl.appendChild(line);
  transcriptEl.scrollTop = transcriptEl.scrollHeight;

  const msgEl = line.querySelector(".msg");
  const cursor = document.createElement("span");
  cursor.className = "cursor";
  msgEl.appendChild(cursor);

  const speed = opt.speed ?? 18;
  const text = String(msg);
  let i = 0;

  return new Promise((res)=>{
    const tick = ()=>{
      if(i < text.length){
        cursor.insertAdjacentText("beforebegin", text[i]);
        i++;
        transcriptEl.scrollTop = transcriptEl.scrollHeight;
        setTimeout(tick, speed);
        return;
      }
      cursor.remove();
      res();
    };
    setTimeout(tick, opt.delay ?? 60);
  });
}

/* =========================
   ACTIONS
   ========================= */
function renderActions(st){
  const el = $("#actions");
  el.innerHTML = "";

  const btn = (label, cls, fn)=>{
    const b = document.createElement("button");
    b.className = "action-btn " + (cls||"");
    b.textContent = label;
    b.addEventListener("click", fn);
    el.appendChild(b);
    return b;
  };

  btn("Perguntar endereço","",()=>onAsk(st,"Perguntar endereço"));
  btn("Perguntar feridos","",()=>onAsk(st,"Perguntar se há feridos"));

  if(st.service==="police"){
    btn("Perguntar arma","",()=>onAsk(st,"Perguntar se há arma"));
    btn("Perguntar descrição","",()=>onAsk(st,"Perguntar descrição"));
    btn("Orientar segurança","",()=>onAsk(st,"Orientar segurança"));
    btn("Orientar não confrontar","",()=>onAsk(st,"Orientar não confrontar"));
  }else{
    btn("Perguntar chamas","",()=>onAsk(st,"Perguntar se há chamas"));
    btn("Perguntar pessoas presas","",()=>onAsk(st,"Perguntar pessoas presas"));
    btn("Orientar evacuar","",()=>onAsk(st,"Orientar evacuar"));
    btn("Orientar afastar/ventilar","",()=>onAsk(st,"Orientar afastar e ventilar"));
  }

  btn("Despachar recursos","primary",()=>openDispatchModal(st));
  btn("Encerrar ligação","danger",()=>finishCall(st));
}

async function onAsk(st, key){
  const tr = $("#transcript");

  if(st.asked[key]){
    await addLine(tr, "Sistema", "Você já fez essa pergunta.", {speed:14});
    return;
  }

  const cost = 6 + Math.floor(Math.random()*5);
  st.callEndsAt -= cost*1000;
  st.shiftEndsAt -= Math.floor(cost/2)*1000;
  st.asked[key] = true;

  await addLine(tr, "Operador", key + "…", {speed:14});
  const ans = st.current.ask[key] || "…";
  await addLine(tr, "Chamador", ans, {speed:18});

  if(key==="Perguntar endereço") st.revealed.location = st.current.facts.location;
  if(key==="Perguntar se há feridos") st.revealed.injuries = st.current.facts.injuries || "Desconhecido";
  if(key==="Perguntar se há arma") st.revealed.weapon = st.current.facts.weapon || "Não confirmado";
  if(key==="Perguntar descrição") st.revealed.description = "Descrição coletada";
  if(key==="Perguntar pessoas presas") st.revealed.trapped = "Possível vítima presa";

  if(key.includes("Orientar")){
    st.revealed.guidance = "Orientação repassada";
    applyReward(st, "Orientação adequada", 5);
  }

  st.stress = clamp(st.stress + 1, 0, 100);

  renderFacts(st);
  renderChecklist(st);
  renderSummary(st);
  renderHUD(st);
  saveState(st);
}

/* =========================
   DISPATCH MODAL
   ========================= */
function openDispatchModal(st){
  const back = $("#modalBackdrop");
  const typeSel = $("#dispatchType");
  const unitSel = $("#dispatchUnit");
  const addr = $("#dispatchAddress");
  const notes = $("#dispatchNotes");
  const pri = $("#dispatchPriority");

  typeSel.innerHTML = "";
  unitSel.innerHTML = "";

  const types = st.service==="police" ? INCIDENT_TYPES_POLICE : INCIDENT_TYPES_FIRE;
  const units = st.service==="police" ? UNITS_POLICE : UNITS_FIRE;

  for(const t of types){
    const o = document.createElement("option");
    o.value = t; o.textContent = t;
    typeSel.appendChild(o);
  }
  for(const u of units){
    const o = document.createElement("option");
    o.value = u; o.textContent = u;
    unitSel.appendChild(o);
  }

  addr.value = st.revealed.location || "";
  notes.value = "";
  pri.value = "P2";

  back.classList.remove("hidden");

  $("#btnDispatchCancel").onclick = ()=> back.classList.add("hidden");
  $("#btnDispatchConfirm").onclick = ()=>{
    const d = {
      type: typeSel.value,
      priority: pri.value,
      unit: unitSel.value,
      address: addr.value.trim(),
      notes: notes.value.trim(),
      at: now()
    };
    confirmDispatch(st, d);
    back.classList.add("hidden");
  };
}

async function confirmDispatch(st, d){
  const tr = $("#transcript");
  st.lastDispatch = d;

  await addLine(tr, "Sistema", "Despacho registrado.", {speed:14});
  await addLine(tr, "Sistema", `${d.type} • ${d.priority} • ${d.unit}`, {speed:14});

  const corr = st.current.correct;

  if(!d.address){
    applyPenalty(st, "Despacho sem endereço", 30);
    await addLine(tr, "Sistema", "Endereço ausente. Confirme antes de despachar.", {speed:14});
  }else{
    if(st.revealed.location && d.address !== st.revealed.location){
      applyPenalty(st, "Endereço divergente do confirmado", 10);
    }else{
      applyReward(st, "Endereço validado", 10);
    }
  }

  if(d.type !== corr.type) applyPenalty(st, "Classificação incorreta", 25);
  else applyReward(st, "Classificação correta", 20);

  if(d.priority !== corr.priority) applyPenalty(st, "Prioridade inadequada", 20);
  else applyReward(st, "Prioridade correta", 15);

  if(!d.unit || d.unit.split(" ")[0] !== corr.unit.split(" ")[0]) applyPenalty(st, "Unidade pouco coerente", 10);
  else applyReward(st, "Unidade coerente", 10);

  for(const q of (corr.required || [])){
    if(!st.asked[q]) applyPenalty(st, "Pergunta essencial não realizada", 12);
  }

  renderFacts(st);
  renderChecklist(st);
  renderSummary(st);
  renderHUD(st);
  saveState(st);
}

/* =========================
   CALL FLOW
   ========================= */
async function finishCall(st){
  const tr = $("#transcript");
  const callLeft = Math.floor((st.callEndsAt - now())/1000);

  if(!st.lastDispatch){
    applyPenalty(st, "Ligação encerrada sem despacho", 35);
    await addLine(tr, "Sistema", "Você encerrou sem registrar despacho. Penalidade aplicada.", {speed:14});
    renderSummary(st); renderHUD(st); saveState(st);
    return;
  }

  if(callLeft > 20) applyReward(st, "Agilidade no atendimento", 10);
  else if(callLeft < 0) applyPenalty(st, "Tempo de ligação excedido", 15);

  await addLine(tr, "Central", "Entendido. As equipes estão a caminho. Mantenha-se em segurança.", {speed:16});
  await addLine(tr, "Chamador", "Tá… obrigado.", {speed:18});

  st.callIndex += 1;
  st.stress = clamp(st.stress + 2, 0, 100);
  saveState(st);

  if(st.callIndex >= st.scenarios.length){
    endShift(st, true);
    return;
  }

  setTimeout(()=>{
    beginCall(st);
    renderHUD(st);
    saveState(st);
  }, 700);
}

function endShift(st, natural){
  pushRank({
    score: st.score,
    errors: st.errors,
    stress: Math.round(st.stress),
    service: st.service,
    city: st.city,
    difficulty: st.difficulty,
    endedAt: new Date().toISOString(),
    reason: natural ? "completed" : "manual"
  });
  clearState();
  location.href = "ranking.html";
}

function beginCall(st){
  st.current = st.scenarios[st.callIndex];
  st.revealed = {};
  st.asked = {};
  st.summary = null;
  st.lastDispatch = null;
  st._timePenaltyApplied = false;

  st.callEndsAt = now() + st.callSecondsLimit*1000;

  $("#callIndex").textContent = String(st.callIndex + 1);
  $("#callTotal").textContent = String(st.scenarios.length);

  setRoomBackgroundAbsolute(st.service==="fire" ? "dispatch_fire_room.jpg" : "dispatch_police_room.jpg");

  const tr = $("#transcript");
  tr.innerHTML = "";

  (async()=>{
    await addLine(tr, "Central", st.service==="police" ? "190. Qual a sua emergência?" : "193. Qual a sua emergência?", {speed:16});
    await addLine(tr, "Chamador", st.current.opening, {speed:18});

    if(st.current.facts?.risk) st.revealed.risk = st.current.facts.risk;

    renderFacts(st);
    renderChecklist(st);
    renderSummary(st);
    renderActions(st);
    saveState(st);
  })();
}

function gameLoop(st){
  renderHUD(st);
  setCallTimer(st);

  if(now() >= st.shiftEndsAt){
    endShift(st, true);
    return;
  }

  if(now() >= st.callEndsAt && !st._timePenaltyApplied){
    st._timePenaltyApplied = true;
    applyPenalty(st, "Tempo de ligação estourado", 12);
    st.callEndsAt = now() + 25*1000;
    saveState(st);
    renderSummary(st);
    renderHUD(st);
  }

  requestAnimationFrame(()=>gameLoop(st));
}

/* =========================
   MENU FLOW
   ========================= */
function startTurnFromMenu(){
  const service = $("#career").value;
  const city = $("#city").value;
  const diff = $("#difficulty").value;
  const shiftMinutes = parseInt($("#shift").value, 10);

  const st = defaultState();
  st.service = service;
  st.city = city;
  st.difficulty = diff;
  st.shiftMinutes = shiftMinutes;
  st.shiftEndsAt = now() + shiftMinutes*60*1000;

  st.callSecondsLimit = diff==="hard" ? 80 : (diff==="extreme" ? 70 : 90);
  st.scenarios = buildScenarioPack(service, city);
  st.callIndex = 0;
  st.score = 0;
  st.errors = 0;
  st.stress = 0;

  saveState(st);
  location.href = "game.html";
}

/* =========================
   INIT PAGES
   ========================= */
function initCover(){
  const c = $("#cover");
  c.addEventListener("pointerdown", ()=>location.href="menu.html", {passive:true});
  c.addEventListener("click", ()=>location.href="menu.html");
}

function initMenu(){
  const st = loadState();
  if(st){
    $("#career").value = st.service || "police";
    $("#city").value = st.city || "São Paulo";
    $("#difficulty").value = st.difficulty || "normal";
    $("#shift").value = String(st.shiftMinutes || 10);
  }

  $("#btnStart").addEventListener("click", startTurnFromMenu);
  $("#btnRanking").addEventListener("click", ()=>location.href="ranking.html");
  $("#btnContinue").addEventListener("click", ()=>{
    const cur = loadState();
    if(cur && cur.scenarios && cur.scenarios.length) location.href="game.html";
    else startTurnFromMenu();
  });
  $("#btnReset").addEventListener("click", ()=>{
    clearState();
    location.reload();
  });
}

function initRanking(){
  const list = $("#rankingList");
  const r = loadRank();
  if(!r.length){
    list.innerHTML = `<div class="hint">Sem registros ainda. Faça um turno para aparecer aqui.</div>`;
  }else{
    list.innerHTML = r.map((e,i)=>{
      const dt = new Date(e.endedAt);
      const when = `${pad2(dt.getDate())}/${pad2(dt.getMonth()+1)} ${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
      const srv = e.service==="police" ? "Polícia" : "Bombeiros";
      return `<div class="row"><strong>#${i+1} • ${e.score} pts</strong><div style="color:rgba(255,255,255,.70);font-size:12px">${srv} • ${e.city} • ${e.difficulty} • ${when}</div></div>`;
    }).join("");
  }

  $("#btnClearRanking").addEventListener("click", ()=>{
    localStorage.removeItem(LS_RANK);
    location.reload();
  });
}

function initGame(){
  const st = loadState();
  if(!st || !st.scenarios || !st.scenarios.length){
    location.href = "menu.html";
    return;
  }

  $("#btnEndShift").addEventListener("click", ()=> endShift(st, false));

  beginCall(st);
  renderHUD(st);
  saveState(st);
  gameLoop(st);
}

/* =========================
   ROUTER
   ========================= */
const page = document.body?.dataset?.page || "";
if(page==="cover") initCover();
if(page==="menu") initMenu();
if(page==="ranking") initRanking();
if(page==="game") initGame();

})(); 
