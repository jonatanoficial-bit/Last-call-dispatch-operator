// ===================================================
// Last Call: Dispatch Operator
// Atendimento real (sem áudio):
// - Typewriter transcript
// - Perguntas e ações
// - Tempo por chamada + tempo de turno
// - Pontuação e penalidades
// - Falha cognitiva aumenta com stress
// Ajustado: Imagen/*.jpg (pasta com I maiúsculo)
// ===================================================

const ASSETS = {
  cover: "Imagen/capa911.jpg",
  logo: "Imagen/logo_central_dispatch.jpg",
  menuBg: "Imagen/menu_background.jpg",
  policeRoom: "Imagen/dispatch_police_room.jpg",
  fireRoom: "Imagen/dispatch_fire_room.jpg",
  iconIncident: "Imagen/icon_incident.jpg",
  iconUnit: "Imagen/icon_unit.jpg",
  overlayCalm: "Imagen/novocrisis_overlay.jpg",
  overlayCrisis: "Imagen/crisis_overlay.jpg"
};

const SAVE_KEY = "lc_dispatch_save_v2";
const RANKING_KEY = "lc_dispatch_ranking_v2";

function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
function pick(arr){ return arr[Math.floor(Math.random() * arr.length)]; }
function fmt(sec){
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function loadSave(){
  try{
    const s = localStorage.getItem(SAVE_KEY);
    if(!s) return null;
    return JSON.parse(s);
  } catch { return null; }
}
function saveState(state){
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}
function pushRanking(role, score){
  const list = JSON.parse(localStorage.getItem(RANKING_KEY) || "[]");
  list.push({ role, score, at: new Date().toISOString() });
  list.sort((a,b)=> b.score - a.score);
  localStorage.setItem(RANKING_KEY, JSON.stringify(list.slice(0,10)));
}

// ===================================================
// SPLASH: toque em qualquer lugar (exceto selects)
// ===================================================
if(document.body.classList.contains("splash-screen")){
  const careerSelect = document.getElementById("careerSelect");
  const citySelect = document.getElementById("citySelect");
  const existing = loadSave();

  if(existing){
    if(careerSelect) careerSelect.value = existing.career || "police";
    if(citySelect) citySelect.value = existing.city || "saopaulo";
  }

  const shouldIgnore = (target)=>{
    if(!target) return false;
    const tag = (target.tagName || "").toLowerCase();
    return tag === "select" || tag === "option" || tag === "label";
  };

  const start = ()=>{
    const st = {
      career: careerSelect ? careerSelect.value : "police",
      city: citySelect ? citySelect.value : "saopaulo",
      rank: "Operador",
      score: existing?.score || 0
    };
    saveState(st);
    window.location.href = "game.html";
  };

  document.addEventListener("click",(e)=>{ if(!shouldIgnore(e.target)) start(); }, { passive:true });
  document.addEventListener("touchstart",(e)=>{
    const t = e.targetTouches?.[0]?.target || e.target;
    if(!shouldIgnore(t)) start();
  }, { passive:true });
}

// ===================================================
// RANKING PAGE
// ===================================================
if(document.getElementById("rankingList")){
  const container = document.getElementById("rankingList");
  const clearBtn = document.getElementById("clearRankingBtn");
  const list = JSON.parse(localStorage.getItem(RANKING_KEY) || "[]");

  container.innerHTML = "";
  if(!list.length){
    const div = document.createElement("div");
    div.className = "ranking-item";
    div.textContent = "Sem registros ainda. Jogue uma partida para aparecer aqui.";
    container.appendChild(div);
  } else {
    list.forEach((r,i)=>{
      const div = document.createElement("div");
      div.className = "ranking-item";
      div.textContent = `${i+1}º — ${r.role || "Operador"} — ${r.score || 0} pts`;
      container.appendChild(div);
    });
  }

  if(clearBtn){
    clearBtn.addEventListener("click", ()=>{
      localStorage.removeItem(RANKING_KEY);
      window.location.reload();
    });
  }
}

// ===================================================
// GAME INIT
// ===================================================
if(document.getElementById("careerLabel")){
  const st = loadSave() || { career:"police", city:"saopaulo", rank:"Operador", score:0 };

  document.getElementById("careerLabel").textContent = st.career === "police" ? "Central: Polícia" : "Central: Bombeiros";
  document.getElementById("cityLabel").textContent = `Cidade: ${st.city}`;
  document.getElementById("rankLabel").textContent = `Cargo: ${st.rank}`;

  const bg = document.querySelector(".game-bg");
  if(bg){
    bg.style.backgroundImage = `url("${st.career === "police" ? ASSETS.policeRoom : ASSETS.fireRoom}")`;
  }

  document.getElementById("goRankingBtn").addEventListener("click", ()=> window.location.href = "ranking.html");

  startShift(st);
}

function updateStateClasses(stress){
  const body = document.body;
  if(!body.classList.contains("game-screen")) return;
  body.classList.remove("state-calm","state-alert","state-crisis");
  if(stress >= 70) body.classList.add("state-crisis");
  else if(stress >= 40) body.classList.add("state-alert");
  else body.classList.add("state-calm");
}

// ===================================================
// SHIFT LOOP (turno) + CALL HANDLING
// ===================================================
function startShift(st){
  // Operador humano
  const human = {
    stress: 0,
    fatigue: 0,
    errors: 0,
    score: Number(st.score || 0)
  };

  // Recursos
  const totalUnits = 4;
  let freeUnits = totalUnits;

  // Tempo de turno (10 min)
  let shiftRemaining = 600;

  // Tempo de chamada padrão (90s) — muda conforme caso
  let callRemaining = 90;

  // Fila de chamadas
  let queue = [];
  let activeId = null;

  // Máquina de estado do atendimento
  // stage: "idle" | "intro" | "handling" | "final"
  let stage = "idle";

  // Typewriter
  let typing = false;
  let typeTimer = null;

  // DOM refs
  const callsList = document.getElementById("callsList");
  const transcript = document.getElementById("transcript");
  const typeCursor = document.getElementById("typeCursor");
  const activeCallTitle = document.getElementById("activeCallTitle");

  const callerMood = document.getElementById("callerMood");
  const callType = document.getElementById("callType");
  const callRisk = document.getElementById("callRisk");

  const ansAddress = document.getElementById("ansAddress");
  const ansVictims = document.getElementById("ansVictims");
  const ansWeaponFire = document.getElementById("ansWeaponFire");
  const ansSuspect = document.getElementById("ansSuspect");
  const ansClass = document.getElementById("ansClass");

  const elScore = document.getElementById("score");
  const elErrors = document.getElementById("errors");
  const elStress = document.getElementById("stress");
  const elFatigue = document.getElementById("fatigue");
  const elFreeUnits = document.getElementById("freeUnits");
  const elPendingCalls = document.getElementById("pendingCalls");

  const elShiftRemaining = document.getElementById("shiftRemaining");
  const elCallRemaining = document.getElementById("callRemaining");

  const dangerText = document.getElementById("dangerText");
  const dangerBox = document.getElementById("dangerBox");

  // Botões
  const btnListen = document.getElementById("btnListen");
  const btnCalm = document.getElementById("btnCalm");
  const btnFocus = document.getElementById("btnFocus");
  const btnRepeat = document.getElementById("btnRepeat");

  const btnAskAddress = document.getElementById("btnAskAddress");
  const btnAskVictims = document.getElementById("btnAskVictims");
  const btnAskWeaponFire = document.getElementById("btnAskWeaponFire");
  const btnAskSuspect = document.getElementById("btnAskSuspect");

  const btnClassLow = document.getElementById("btnClassLow");
  const btnClassHigh = document.getElementById("btnClassHigh");
  const btnClassCritical = document.getElementById("btnClassCritical");
  const btnMarkPrank = document.getElementById("btnMarkPrank");

  const btnDispatch = document.getElementById("btnDispatch");
  const btnTransfer = document.getElementById("btnTransfer");
  const btnClose = document.getElementById("btnClose");
  const btnNext = document.getElementById("btnNext");

  // Helpers UI
  function setOps(msg){
    dangerText.textContent = msg;
    const severe = human.stress >= 70;
    dangerBox.style.borderColor = severe ? "rgba(255,0,0,.30)" : "rgba(255,255,255,.10)";
    dangerBox.style.background = severe ? "rgba(255,0,0,.08)" : "rgba(0,0,0,.18)";
  }

  function renderHUD(){
    elScore.textContent = String(human.score);
    elErrors.textContent = String(human.errors);
    elStress.textContent = `${Math.floor(human.stress)}%`;
    elFatigue.textContent = `${Math.floor(human.fatigue)}%`;
    elFreeUnits.textContent = String(freeUnits);
    elPendingCalls.textContent = String(queue.filter(c=> !c.done).length);
    elShiftRemaining.textContent = fmt(shiftRemaining);
    elCallRemaining.textContent = fmt(callRemaining);
    updateStateClasses(human.stress);
  }

  function resetCollected(){
    ansAddress.textContent = "—";
    ansVictims.textContent = "—";
    ansWeaponFire.textContent = "—";
    ansSuspect.textContent = "—";
    ansClass.textContent = "—";
  }

  function setCallMeta(call){
    activeCallTitle.textContent = call ? call.title : "Nenhuma chamada selecionada";
    callerMood.textContent = `Humor: ${call ? call.mood : "—"}`;
    callType.textContent = `Tipo: ${call ? call.type : "—"}`;
    callRisk.textContent = `Risco: ${call ? call.hiddenSeverity : "—"}`; // no começo mostra “??” no texto do jogo? Vamos mostrar no painel como “—”
    callRisk.textContent = `Risco: ${call ? "—" : "—"}`;
  }

  // Fila inicial
  queue = buildInitialQueue(st.career);
  renderQueue();
  renderHUD();
  setCallMeta(null);
  resetCollected();
  transcript.textContent = "";
  setOps("Selecione uma chamada para iniciar.");

  // Timers
  const tShift = setInterval(()=>{
    shiftRemaining--;
    if(shiftRemaining <= 0){
      endShift("Fim do turno.");
      return;
    }

    // fadiga e stress base
    human.fatigue = clamp(human.fatigue + 0.18, 0, 100);
    human.stress = clamp(human.stress + (human.fatigue > 60 ? 0.35 : 0.18), 0, 100);

    // se fila grande, stress sobe
    const pending = queue.filter(c=> !c.done).length;
    if(pending >= 7) human.stress = clamp(human.stress + 0.55, 0, 100);
    else if(pending >= 5) human.stress = clamp(human.stress + 0.25, 0, 100);

    // se existe chamada ativa, tempo dela corre
    if(activeId){
      callRemaining--;
      if(callRemaining <= 0){
        // tempo estourou: penaliza e encerra chamada como falha
        applyPenalty("Tempo de chamada esgotado. Atendimento incompleto.", 1, 120, 10);
        markActiveAsFailed("Tempo esgotado");
        moveToNextCall();
      }
    }

    // burnout
    if(human.stress >= 100){
      endShift("Burnout operacional.");
      return;
    }

    renderHUD();
  }, 1000);

  // ===================================================
  // TYPEWRITER
  // ===================================================
  function typeWrite(text, speed=18){
    if(!transcript) return;
    stopTyping();
    typing = true;
    typeCursor.style.display = "block";
    let i = 0;
    const existing = transcript.textContent;
    transcript.textContent = existing ? existing + "\n" : "";

    typeTimer = setInterval(()=>{
      if(!typing){
        clearInterval(typeTimer);
        typeTimer = null;
        return;
      }
      transcript.textContent += text.charAt(i);
      i++;
      transcript.scrollTop = transcript.scrollHeight;
      if(i >= text.length){
        stopTyping();
      }
    }, speed);
  }

  function stopTyping(){
    typing = false;
    if(typeTimer){
      clearInterval(typeTimer);
      typeTimer = null;
    }
    if(typeCursor) typeCursor.style.display = "none";
  }

  // ===================================================
  // QUEUE / SELEÇÃO
  // ===================================================
  function renderQueue(){
    callsList.innerHTML = "";
    const pending = queue.filter(c=> !c.done);

    if(!pending.length){
      const div = document.createElement("div");
      div.className = "call-item";
      div.textContent = "Sem novas chamadas no momento.";
      callsList.appendChild(div);
      return;
    }

    pending.forEach(c=>{
      const row = document.createElement("div");
      row.className = "call-item" + (c.id === activeId ? " selected" : "");
      row.addEventListener("click", ()=> selectCall(c.id));

      const left = document.createElement("div");
      left.className = "call-left";

      const icon = document.createElement("img");
      icon.className = "call-icon";
      icon.src = ASSETS.iconIncident;
      icon.alt = "Chamada";

      const meta = document.createElement("div");
      meta.className = "call-meta";

      const title = document.createElement("div");
      title.className = "call-title";
      title.textContent = c.title;

      const sub = document.createElement("div");
      sub.className = "call-sub";
      sub.textContent = `Humor: ${c.mood} • ${c.type}`;

      meta.appendChild(title);
      meta.appendChild(sub);

      left.appendChild(icon);
      left.appendChild(meta);

      const badge = document.createElement("div");
      badge.className = "badge";
      badge.textContent = c.initialHint;

      row.appendChild(left);
      row.appendChild(badge);

      callsList.appendChild(row);
    });
  }

  function selectCall(id){
    const call = queue.find(x=> x.id === id && !x.done);
    if(!call) return;

    // se já existe chamada ativa diferente, não troca no meio (simula linha ocupada)
    if(activeId && activeId !== id){
      setOps("Você já está em uma chamada. Finalize ou vá para a próxima chamada.");
      applyPenalty("Tentativa de alternar chamadas durante atendimento.", 0, 30, 3);
      return;
    }

    activeId = id;
    stage = "intro";
    callRemaining = call.timeLimit;

    // reseta UI e mostra começo
    transcript.textContent = "";
    resetCollected();
    setCallMeta(call);
    renderQueue();
    renderHUD();

    setOps("Chamada conectada. Ouça o relato e faça perguntas técnicas.");

    typeWrite(`[SISTEMA] Linha conectada • ID ${call.id}\n[CHAMADOR] ${call.opening}`);
    stage = "handling";
  }

  function getActiveCall(){
    if(!activeId) return null;
    return queue.find(x=> x.id === activeId) || null;
  }

  // ===================================================
  // REGRAS / PONTOS / PENALIDADES
  // ===================================================
  function applyPenalty(reason, errAdd, scoreLoss, stressAdd){
    human.errors += errAdd;
    human.score = Math.max(0, human.score - scoreLoss);
    human.stress = clamp(human.stress + stressAdd, 0, 100);
    setOps(reason);
    renderHUD();
  }

  function applyReward(reason, scoreGain, stressReduce){
    human.score += scoreGain;
    human.stress = clamp(human.stress - stressReduce, 0, 100);
    setOps(reason);
    renderHUD();
  }

  // falha cognitiva (stress alto): pode trocar resposta/ação
  function cognitiveFailureChance(){
    return human.stress / 125; // ~0.8 no 100%
  }

  function maybeCognitiveFail(){
    return Math.random() < cognitiveFailureChance();
  }

  // ===================================================
  // AÇÕES: OUVIR / ACALMAR / FOCO / REPETIR
  // ===================================================
  btnListen.addEventListener("click", ()=>{
    const call = getActiveCall();
    if(!call) return setOps("Selecione uma chamada.");

    // ouvir consome tempo e reduz incerteza
    callRemaining = Math.max(0, callRemaining - 6);
    typeWrite(`[OPERADOR] Pode relatar o que está acontecendo?\n[CHAMADOR] ${call.story}`);

    // recompensa pequena se ainda não ouviu
    if(!call.flags.listened){
      call.flags.listened = true;
      applyReward("Relato coletado. Agora faça perguntas técnicas.", 35, 2);
    } else {
      applyPenalty("Você já ouviu o relato. Foque nas perguntas técnicas.", 0, 10, 1);
    }
    renderHUD();
  });

  btnCalm.addEventListener("click", ()=>{
    const call = getActiveCall();
    if(!call) return setOps("Selecione uma chamada.");

    callRemaining = Math.max(0, callRemaining - 5);

    if(call.mood === "pânico" || call.mood === "nervoso"){
      typeWrite(`[OPERADOR] Respire. Eu vou ajudar. Preciso que fale com calma.\n[CHAMADOR] Tá... tá bom... eu vou tentar.`);
      applyReward("Chamador mais estável. Menos risco de ruído na informação.", 25, 4);
      call.mood = "nervoso";
    } else {
      typeWrite(`[OPERADOR] Certo. Vamos manter a calma.\n[CHAMADOR] Eu já tô calmo! Só resolve logo.`);
      applyPenalty("Ação pouco útil nesse contexto. Perda de tempo.", 0, 15, 2);
    }

    renderQueue();
    renderHUD();
  });

  btnFocus.addEventListener("click", ()=>{
    const call = getActiveCall();
    if(!call) return setOps("Selecione uma chamada.");

    callRemaining = Math.max(0, callRemaining - 4);

    if(call.mood === "agressivo"){
      typeWrite(`[OPERADOR] Preciso do endereço. Sem isso não consigo enviar ajuda.\n[CHAMADOR] Tá! Pera...`);
      applyReward("Você retomou o controle do atendimento.", 20, 2);
    } else {
      typeWrite(`[OPERADOR] Vou fazer perguntas objetivas.\n[CHAMADOR] Tá bom.`);
      applyReward("Atendimento direcionado. Menos desperdício.", 10, 1);
    }
    renderHUD();
  });

  btnRepeat.addEventListener("click", ()=>{
    const call = getActiveCall();
    if(!call) return setOps("Selecione uma chamada.");

    callRemaining = Math.max(0, callRemaining - 6);
    typeWrite(`[OPERADOR] Pode repetir, por favor?\n[CHAMADOR] ${call.repeat}`);

    // pode ajudar se o call tem inconsistência
    if(call.truth === "confuso"){
      applyReward("Repetição trouxe clareza.", 20, 2);
      call.truth = "verdadeiro";
    } else {
      applyPenalty("Repetir sem necessidade custou tempo.", 0, 10, 1);
    }
    renderHUD();
  });

  // ===================================================
  // PERGUNTAS TÉCNICAS
  // ===================================================
  btnAskAddress.addEventListener("click", ()=>{
    const call = getActiveCall();
    if(!call) return setOps("Selecione uma chamada.");

    callRemaining = Math.max(0, callRemaining - 8);

    // falha cognitiva pode registrar errado
    if(maybeCognitiveFail()){
      typeWrite(`[OPERADOR] Endereço exato?\n[CHAMADOR] ${call.address}\n[SISTEMA] (Você digitou errado devido ao stress.)`);
      call.collected.address = "ENDEREÇO INCERTO";
      ansAddress.textContent = "ENDEREÇO INCERTO";
      applyPenalty("Endereço coletado com erro (stress). Alto risco.", 1, 90, 6);
      return;
    }

    typeWrite(`[OPERADOR] Qual o endereço exato?\n[CHAMADOR] ${call.address}`);
    call.collected.address = call.address;
    ansAddress.textContent = call.address;
    applyReward("Endereço confirmado. Agora é possível despachar.", 50, 2);
  });

  btnAskVictims.addEventListener("click", ()=>{
    const call = getActiveCall();
    if(!call) return setOps("Selecione uma chamada.");

    callRemaining = Math.max(0, callRemaining - 7);

    typeWrite(`[OPERADOR] Há feridos?\n[CHAMADOR] ${call.victims}`);
    call.collected.victims = call.victims;
    ansVictims.textContent = call.victims;

    // se for caso crítico e perguntar vítimas ajuda
    if(call.severity === "CRÍTICA"){
      applyReward("Informação crítica coletada. Melhor triagem.", 35, 1);
    } else {
      applyReward("Informação coletada.", 15, 1);
    }
  });

  btnAskWeaponFire.addEventListener("click", ()=>{
    const call = getActiveCall();
    if(!call) return setOps("Selecione uma chamada.");

    callRemaining = Math.max(0, callRemaining - 7);

    typeWrite(`[OPERADOR] Há arma ou fogo envolvido?\n[CHAMADOR] ${call.weaponFire}`);
    call.collected.weaponFire = call.weaponFire;
    ansWeaponFire.textContent = call.weaponFire;

    if(call.severity === "CRÍTICA"){
      applyReward("Risco elevado confirmado.", 35, 1);
    } else {
      applyReward("Informação coletada.", 15, 1);
    }
  });

  btnAskSuspect.addEventListener("click", ()=>{
    const call = getActiveCall();
    if(!call) return setOps("Selecione uma chamada.");

    callRemaining = Math.max(0, callRemaining - 7);

    typeWrite(`[OPERADOR] O suspeito ainda está no local?\n[CHAMADOR] ${call.suspect}`);
    call.collected.suspect = call.suspect;
    ansSuspect.textContent = call.suspect;

    if(call.severity === "ALTA" || call.severity === "CRÍTICA"){
      applyReward("Situação tática atualizada.", 25, 1);
    } else {
      applyReward("Informação coletada.", 10, 1);
    }
  });

  // ===================================================
  // CLASSIFICAÇÃO
  // ===================================================
  function setClassification(call, cls){
    if(!call) return;
    call.collected.classification = cls;
    ansClass.textContent = cls;

    typeWrite(`[OPERADOR] Entendido. Classificando ocorrência como: ${cls}.`);

    // conferir acerto
    if(cls === "TROTE"){
      if(call.truth === "trote"){
        applyReward("Trote corretamente identificado.", 120, 6);
        call.result = "OK";
      } else {
        applyPenalty("Você marcou trote em chamada real. Falha grave.", 2, 220, 12);
        call.result = "FALHA";
      }
      return;
    }

    const correct =
      (cls === "MÉDIA" && call.severity === "MÉDIA") ||
      (cls === "ALTA" && call.severity === "ALTA") ||
      (cls === "CRÍTICA" && call.severity === "CRÍTICA");

    if(correct){
      applyReward("Classificação correta.", 80, 3);
      call.result = "OK";
    } else {
      applyPenalty("Classificação incorreta. Penalidade operacional.", 1, 120, 8);
      call.result = "FALHA";
    }
  }

  btnClassLow.addEventListener("click", ()=>{
    const call = getActiveCall();
    if(!call) return setOps("Selecione uma chamada.");
    callRemaining = Math.max(0, callRemaining - 3);
    setClassification(call, "MÉDIA");
    renderHUD();
  });

  btnClassHigh.addEventListener("click", ()=>{
    const call = getActiveCall();
    if(!call) return setOps("Selecione uma chamada.");
    callRemaining = Math.max(0, callRemaining - 3);
    setClassification(call, "ALTA");
    renderHUD();
  });

  btnClassCritical.addEventListener("click", ()=>{
    const call = getActiveCall();
    if(!call) return setOps("Selecione uma chamada.");
    callRemaining = Math.max(0, callRemaining - 3);
    setClassification(call, "CRÍTICA");
    renderHUD();
  });

  btnMarkPrank.addEventListener("click", ()=>{
    const call = getActiveCall();
    if(!call) return setOps("Selecione uma chamada.");
    callRemaining = Math.max(0, callRemaining - 3);
    setClassification(call, "TROTE");
    renderHUD();
  });

  // ===================================================
  // AÇÃO FINAL: DESPACHAR / TRANSFERIR / ENCERRAR / PRÓXIMA
  // ===================================================
  btnDispatch.addEventListener("click", ()=>{
    const call = getActiveCall();
    if(!call) return setOps("Selecione uma chamada.");

    // regras: endereço obrigatório
    if(!call.collected.address || call.collected.address === "ENDEREÇO INCERTO"){
      applyPenalty("Despacho sem endereço válido. Unidade perdida.", 1, 160, 10);
      typeWrite(`[SISTEMA] Despacho falhou: endereço inválido.`);
      return;
    }

    if(freeUnits <= 0){
      applyPenalty("Sem unidades livres. Despacho impossível.", 0, 40, 4);
      typeWrite(`[SISTEMA] Sem unidades disponíveis. Aguarde.`);
      return;
    }

    // falha cognitiva pode despachar unidade errada (simulado como penalidade)
    if(maybeCognitiveFail()){
      freeUnits--;
      applyPenalty("Falha cognitiva: despacho incorreto. Recurso desperdiçado.", 1, 140, 8);
      typeWrite(`[SISTEMA] Você despachou recurso inadequado devido ao stress.`);
      setTimeout(()=>{ freeUnits = Math.min(totalUnits, freeUnits + 1); renderHUD(); }, 5200);
      return;
    }

    freeUnits--;
    typeWrite(`[SISTEMA] Unidade despachada para: ${call.collected.address}`);

    // recompensa baseada na severidade e classificação
    const cls = call.collected.classification || "NÃO CLASSIFICADA";
    let bonus = 0;

    if(cls === "NÃO CLASSIFICADA"){
      applyPenalty("Despacho sem classificação. Procedimento incompleto.", 1, 90, 6);
    } else {
      bonus = call.severity === "CRÍTICA" ? 160 : call.severity === "ALTA" ? 120 : 80;
      applyReward("Despacho realizado com procedimento aceitável.", bonus, 2);
    }

    // conclui chamada
    call.done = true;

    // retorno unidade
    setTimeout(()=>{
      freeUnits = Math.min(totalUnits, freeUnits + 1);
      renderHUD();
    }, call.severity === "CRÍTICA" ? 5200 : call.severity === "ALTA" ? 4200 : 3200);

    moveToNextCall();
  });

  btnTransfer.addEventListener("click", ()=>{
    const call = getActiveCall();
    if(!call) return setOps("Selecione uma chamada.");

    callRemaining = Math.max(0, callRemaining - 5);

    // transferência é correta em alguns casos (ex: trote ou baixa severidade)
    if(call.truth === "trote"){
      applyReward("Transferência/encaminhamento correto.", 60, 2);
      typeWrite(`[OPERADOR] Vou encaminhar. Linha encerrada.\n[SISTEMA] Encaminhamento registrado.`);
      call.done = true;
      moveToNextCall();
      return;
    }

    if(call.severity === "MÉDIA"){
      applyReward("Encaminhamento aceitável. Menor custo operacional.", 40, 1);
      typeWrite(`[OPERADOR] Vou encaminhar para o serviço adequado.\n[SISTEMA] Encaminhamento registrado.`);
      call.done = true;
      moveToNextCall();
      return;
    }

    applyPenalty("Transferiu uma ocorrência alta/crítica. Falha de procedimento.", 1, 140, 8);
    typeWrite(`[SISTEMA] Encaminhamento inadequado para severidade elevada.`);
    call.done = true;
    moveToNextCall();
  });

  btnClose.addEventListener("click", ()=>{
    const call = getActiveCall();
    if(!call) return setOps("Selecione uma chamada.");

    callRemaining = Math.max(0, callRemaining - 2);

    // encerrar chamada crítica sem despacho = falha grave
    if(call.severity === "CRÍTICA" && (!call.collected.address || !call.collected.classification)){
      applyPenalty("Encerramento precoce em caso crítico. Falha grave.", 2, 220, 12);
      typeWrite(`[SISTEMA] Encerramento registrado como falha grave.`);
      call.done = true;
      moveToNextCall();
      return;
    }

    // caso médio/baixo pode encerrar se coletou dados mínimos
    if(call.severity === "MÉDIA"){
      applyReward("Encerramento aceitável para severidade média.", 30, 1);
      typeWrite(`[OPERADOR] Entendido. Vou registrar.\n[CHAMADOR] Tá bom...\n[SISTEMA] Chamada encerrada.`);
      call.done = true;
      moveToNextCall();
      return;
    }

    // alta severidade: encerrar sem despacho é ruim
    if(call.severity === "ALTA" && (!call.collected.address || !call.collected.classification)){
      applyPenalty("Encerramento incompleto em severidade alta.", 1, 140, 8);
      typeWrite(`[SISTEMA] Encerramento incompleto. Penalidade aplicada.`);
      call.done = true;
      moveToNextCall();
      return;
    }

    applyReward("Encerramento registrado.", 15, 1);
    typeWrite(`[SISTEMA] Chamada encerrada.`);
    call.done = true;
    moveToNextCall();
  });

  btnNext.addEventListener("click", ()=>{
    if(!activeId){
      setOps("Selecione uma chamada.");
      return;
    }
    applyPenalty("Você abandonou a chamada ativa. Penalidade.", 1, 120, 8);
    markActiveAsFailed("Abandono");
    moveToNextCall();
  });

  function markActiveAsFailed(reason){
    const call = getActiveCall();
    if(!call) return;
    call.done = true;
    typeWrite(`[SISTEMA] Chamada encerrada como falha: ${reason}`);
  }

  function moveToNextCall(){
    activeId = null;
    stage = "idle";
    callRemaining = 90;

    setCallMeta(null);
    resetCollected();
    renderQueue();
    renderHUD();

    transcript.textContent = "";
    stopTyping();

    // se a fila acabar, cria novas chamadas (simula fluxo)
    if(queue.filter(c=> !c.done).length <= 1){
      queue = queue.concat(buildMoreCalls(st.career));
      setOps("Novas chamadas chegaram na fila.");
      renderQueue();
      renderHUD();
    } else {
      setOps("Selecione a próxima chamada.");
    }
  }

  // ===================================================
  // END SHIFT
  // ===================================================
  function endShift(reason){
    clearInterval(tShift);

    // salva pontuação
    st.score = human.score;
    saveState(st);

    // registra ranking
    pushRanking(st.rank || "Operador", human.score);

    const msg = `FIM DO TURNO\n\nMotivo: ${reason}\nPontuação: ${human.score}\nErros: ${human.errors}\nStress: ${Math.floor(human.stress)}%`;
    alert(msg);
    window.location.href = "ranking.html";
  }

  // ===================================================
  // Construção de casos
  // ===================================================
  function buildInitialQueue(career){
    const base = buildCasePool(career);
    // pega 5
    const q = [];
    for(let i=0;i<5;i++){
      q.push(makeCallFromPool(base, career));
    }
    return q;
  }

  function buildMoreCalls(career){
    const base = buildCasePool(career);
    const q = [];
    const n = 4;
    for(let i=0;i<n;i++){
      q.push(makeCallFromPool(base, career));
    }
    return q;
  }

  function makeCallFromPool(pool, career){
    const c = pick(pool);
    const id = `${Date.now()}-${Math.floor(Math.random()*9999)}`;

    // humor influencia tempo e dificuldade
    const mood = pick(["calmo","nervoso","pânico","agressivo"]);
    const truth = c.truth; // verdadeiro, trote, confuso
    const severity = c.severity; // MÉDIA, ALTA, CRÍTICA

    const baseTime = severity === "CRÍTICA" ? 85 : severity === "ALTA" ? 95 : 105;
    const moodPenalty = mood === "pânico" ? -10 : mood === "agressivo" ? -8 : mood === "nervoso" ? -4 : 0;
    const timeLimit = clamp(baseTime + moodPenalty, 65, 120);

    return {
      id,
      type: c.type,
      title: c.title,
      opening: c.opening,
      story: c.story,
      repeat: c.repeat,
      address: c.address,
      victims: c.victims,
      weaponFire: c.weaponFire,
      suspect: c.suspect,
      truth,
      severity,
      mood,
      timeLimit,
      initialHint: c.hint,
      hiddenSeverity: severity,
      collected: {
        address: "",
        victims: "",
        weaponFire: "",
        suspect: "",
        classification: ""
      },
      flags: { listened:false },
      done: false,
      result: ""
    };
  }

  function buildCasePool(career){
    // Observação: conteúdo genérico, sem instruções perigosas.
    // Variações por carreira (polícia/bombeiros)
    const policeCases = [
      {
        type: "polícia",
        title: "Briga na rua",
        hint: "Distúrbio",
        truth: "verdadeiro",
        severity: "ALTA",
        opening: "Alô?! Tá tendo uma briga aqui na esquina!",
        story: "Dois homens estão se agredindo, tem gente gritando, parece que um deles tá com algo na mão.",
        repeat: "Eles estão brigando feio, e eu vi um objeto brilhando, não sei se é faca.",
        address: "Rua das Flores, 120, próximo ao mercado",
        victims: "Não vi sangue ainda, mas um caiu no chão",
        weaponFire: "Talvez faca, não tenho certeza",
        suspect: "Sim, os envolvidos estão aqui"
      },
      {
        type: "polícia",
        title: "Trote infantil",
        hint: "Suspeito",
        truth: "trote",
        severity: "MÉDIA",
        opening: "Socorro! Tem um monstro na minha casa!",
        story: "É sério, ele tá na cozinha! Ele vai me pegar!",
        repeat: "Ele tá aqui, eu tô escondido…",
        address: "— (não informa)",
        victims: "Não",
        weaponFire: "Não",
        suspect: "—"
      },
      {
        type: "polícia",
        title: "Assalto em andamento",
        hint: "Urgente",
        truth: "verdadeiro",
        severity: "CRÍTICA",
        opening: "Tá acontecendo um assalto aqui! Ele tá armado!",
        story: "Um homem entrou na loja, apontou uma arma e mandou todo mundo deitar. Eu tô atrás do balcão.",
        repeat: "Ele tá nervoso, arma na mão, tem cliente chorando!",
        address: "Avenida Central, 455, loja de conveniência",
        victims: "Não vi feridos ainda",
        weaponFire: "Arma de fogo",
        suspect: "Sim, ele ainda está aqui"
      },
      {
        type: "polícia",
        title: "Pessoa suspeita no portão",
        hint: "Verificar",
        truth: "confuso",
        severity: "MÉDIA",
        opening: "Tem alguém estranho rondando minha casa.",
        story: "Ele fica indo e voltando na calçada, olhando pra dentro. Não sei se tá tentando invadir.",
        repeat: "Ele tá com capuz… eu não consigo ver o rosto.",
        address: "Rua São Miguel, 78",
        victims: "Não",
        weaponFire: "Não sei",
        suspect: "Sim, está na frente"
      }
    ];

    const fireCases = [
      {
        type: "bombeiros",
        title: "Incêndio em apartamento",
        hint: "Fumaça",
        truth: "verdadeiro",
        severity: "CRÍTICA",
        opening: "Tá saindo fumaça do apartamento do vizinho!",
        story: "Tem cheiro forte de queimado e muita fumaça no corredor. Ouvi alguém tossindo lá dentro.",
        repeat: "A fumaça tá piorando, eu acho que tem alguém preso!",
        address: "Rua do Sol, 300, Bloco B, ap. 42",
        victims: "Talvez 1 pessoa, ouvi tosse",
        weaponFire: "Fogo e fumaça",
        suspect: "—"
      },
      {
        type: "bombeiros",
        title: "Gás vazando",
        hint: "Risco",
        truth: "verdadeiro",
        severity: "ALTA",
        opening: "Tá com cheiro de gás muito forte aqui!",
        story: "A cozinha tá tomada, eu desliguei tudo mas o cheiro continua. Tô com medo de explosão.",
        repeat: "O cheiro tá forte demais, eu tô com dor de cabeça.",
        address: "Avenida Norte, 910, casa 2",
        victims: "Não por enquanto",
        weaponFire: "Gás (risco de explosão)",
        suspect: "—"
      },
      {
        type: "bombeiros",
        title: "Trote — incêndio falso",
        hint: "Suspeito",
        truth: "trote",
        severity: "MÉDIA",
        opening: "Tá pegando fogo na cidade toda!!!",
        story: "Tá tudo pegando fogo, manda avião, manda tudo!",
        repeat: "Tá tudo queimando!!!",
        address: "— (não informa)",
        victims: "—",
        weaponFire: "—",
        suspect: "—"
      },
      {
        type: "bombeiros",
        title: "Resgate simples",
        hint: "Baixa",
        truth: "verdadeiro",
        severity: "MÉDIA",
        opening: "Um gato tá preso no telhado.",
        story: "Ele tá miando faz horas, ninguém consegue pegar.",
        repeat: "Ele tá no cantinho e não sai.",
        address: "Rua da Paz, 12",
        victims: "Não",
        weaponFire: "Não",
        suspect: "—"
      }
    ];

    return career === "police" ? policeCases : fireCases;
  }
    }
