(() => {
  const tabMinesweeper = document.getElementById("tabMinesweeper");
  const tabOurPath = document.getElementById("tabOurPath");
  const viewMinesweeper = document.getElementById("viewMinesweeper");
  const viewOurPath = document.getElementById("viewOurPath");
  const btnReset = document.getElementById("btnReset");
  const btnSound = document.getElementById("btnSound");
  const voiceTrack = document.getElementById("voiceTrack");
  const btnUnlock = document.getElementById("btnUnlock");
  const codeInput = document.getElementById("codeInput");
  const codeError = document.getElementById("codeError");
  const ourPathLockLabel = document.getElementById("ourPathLockLabel");

  const STORAGE_KEY = "ourpath_state_v17";
  const OUR_PATH_SECRET_CODE = "07032022";
  const OUR_SONG_SRC = "assets/beauty_and_a_beat_onur.mp3";

  const chapters = [
    { title:"Checkpoint 1 — The first meet", question:"Where did we first meet in real life?", choices:["Düsseldorf Airport","Köln Hbf","Berlin Airport"], answer:"Düsseldorf Airport", memory:"Do u remember when we first hugged and my glasses got stuck in ur hair HAHAHAHA" },
    { title:"Checkpoint 2 — The first game", question:"Our first game together was…", choices:["Valorant","Fortnite","Minecraft"], answer:"Valorant", memory:"This is where everything began. One game and suddenly you were my favorite person." },
    { title:"Checkpoint 3 — The first voice", question:"In which game did you speak in voice chat first?", choices:["Phasmophobia","Valorant","GTA V"], answer:"Phasmophobia", memory:"This was the best bc i heard ur beautiful voice for the first time and my heart almost skipped a beat" },
    { title:"Checkpoint 4 — Turkey core memory", question:"What did you do for the first time with me in Turkey?", choices:["Jetski","Skydiving","Skiing"], answer:"Jetski", memory:"That day was so fun. I can’t wait to do it again with you." },
    { title:"Checkpoint 5 — Our little chaos", question:"What made us SUPER dirty in Turkey?", choices:["Buggy ride in mud","Cooking","Shopping"], answer:"Buggy ride in mud", memory:"We were dirty but happy. That’s literally us." },
    { title:"Checkpoint 6 — Turkey cats", question:"What did we always do when we saw cats in Turkey?", choices:["Feed them","Run away","Ignore them"], answer:"Feed them", memory:"We always had snacks for them and you were so sweet with them." },
    { title:"Checkpoint 7 — Best snack", question:"Best snack in Turkey was…", choices:["Chips","Ice cream","Salad"], answer:"Chips", memory:"Those chips were crazy. We were addicted" },
    { title:"Checkpoint 8 — Our anniversary", question:"When is our anniversary?", choices:["July 3, 2022","June 3, 2022","July 13, 2022"], answer:"July 3, 2022", memory:"Good. You remember. Now come here." },
    { title:"Final Checkpoint — Math boss fight", question:"Math boss fight (You can use 1 Joker)", isMath:true, memory:"I know you hate math. But you did it. Good girl." }
  ];

  // timing
  const TOTAL_RUN_SECONDS = 214; // ~3:34
  const CHECKPOINT_SECONDS = [22,44,66,90,112,134,154,176,198];
  const ANNOUNCE_SECONDS = 4.0;

  const defaultState = {
    activeView: "ourpath",
    soundOn: true,
    ourPathUnlocked: false,
    ourPathProgress: 0,
    ourPathJokerUsed: false
  };

  let state = loadState();
  let ourMuted = false;
  let songStarted = false;
  let songStarting = false;

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(defaultState);
      return { ...structuredClone(defaultState), ...JSON.parse(raw) };
    } catch {
      return structuredClone(defaultState);
    }
  }
  function saveState(){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch{} }

  function show(el){ el && el.classList.remove("hidden"); }
  function hide(el){ el && el.classList.add("hidden"); }
  function clamp(v,min,max){ return Math.max(min, Math.min(max,v)); }

  function prepareSong() {
    if (!voiceTrack) return;
    try{
      voiceTrack.loop = false;
      voiceTrack.preload = "auto";
      voiceTrack.volume = 0.95;
      if (!voiceTrack.src || !voiceTrack.src.includes("beauty_and_a_beat_onur")) voiceTrack.src = OUR_SONG_SRC;
      voiceTrack.load();
    }catch{}
  }
  function stopSong(){
    try{ if (voiceTrack){ voiceTrack.pause(); voiceTrack.currentTime = 0; voiceTrack.loop=false; } }catch{}
    songStarted=false; songStarting=false;
  }
  function ensureSongStarted(){
    if (!voiceTrack) return;
    if (!state.soundOn || ourMuted) return;
    if (songStarted || songStarting) return;
    songStarting=true;
    try{
      prepareSong();
      voiceTrack.currentTime = 0;
      const p = voiceTrack.play();
      if (p && p.then){
        p.then(()=>{ songStarted=true; songStarting=false; })
         .catch(()=>{ songStarted=false; songStarting=false; });
      } else {
        songStarted=true; songStarting=false;
      }
    }catch{ songStarted=false; songStarting=false; }
  }
  function pauseSong(){ try{ if (voiceTrack && !voiceTrack.paused) voiceTrack.pause(); }catch{} }
  function resumeSong(){ if (!voiceTrack) return; if (!state.soundOn || ourMuted) return; try{ const p=voiceTrack.play(); p?.catch?.(()=>{});}catch{} }

  function fadeOutAudio(el, secs){
    if (!el) return;
    try{
      const startV = el.volume;
      const t0 = performance.now();
      const step = () => {
        const k = Math.min(1, (performance.now()-t0)/(secs*1000));
        el.volume = startV*(1-k);
        if (k<1) requestAnimationFrame(step);
        else { el.pause(); el.currentTime=0; el.volume=startV; }
      };
      step();
    }catch{}
  }

  function applySoundUI(){
    if (btnSound) btnSound.textContent = state.soundOn ? "Sound: On" : "Sound: Off";
    try{ if (voiceTrack) voiceTrack.muted = !state.soundOn || ourMuted; }catch{}
    if (!state.soundOn) stopSong();
  }

  btnSound?.addEventListener("click", () => {
    state.soundOn = !state.soundOn;
    saveState();
    applySoundUI();
  });

  function tryUnlock(){
    const raw = (codeInput?.value || "").trim().replace(/\s+/g,"");
    if (raw === OUR_PATH_SECRET_CODE){
      state.ourPathUnlocked = true;
      saveState();
      hide(codeError);
      if (ourPathLockLabel) ourPathLockLabel.style.display = "none";
      startOurPath();
    } else {
      show(codeError);
    }
  }
  btnUnlock?.addEventListener("click", tryUnlock);
  codeInput?.addEventListener("keydown", (e)=>{ if (e.key==="Enter") tryUnlock(); });

  btnReset?.addEventListener("click", () => {
    stopSong();
    state.ourPathProgress = 0;
    saveState();
    startOurPath();
  });

  if (tabMinesweeper && tabOurPath && viewMinesweeper && viewOurPath){
    tabMinesweeper.addEventListener("click", () => {
      state.activeView="minesweeper"; saveState();
      viewMinesweeper.classList.add("view--active");
      viewOurPath.classList.remove("view--active");
      tabMinesweeper.classList.add("is-active");
      tabOurPath.classList.remove("is-active");
      stopSong();
    });
    tabOurPath.addEventListener("click", () => {
      state.activeView="ourpath"; saveState();
      viewOurPath.classList.add("view--active");
      viewMinesweeper.classList.remove("view--active");
      tabOurPath.classList.add("is-active");
      tabMinesweeper.classList.remove("is-active");
      if (state.ourPathUnlocked) startOurPath();
    });
  }

  // ---------- OUR PATH ----------
  const ourPathBody =
    document.getElementById("ourPathBody") ||
    document.querySelector("#viewOurPath .card .card__body") ||
    document.querySelector("#viewOurPath .card__body") ||
    viewOurPath;

  let op = null;
  let keyDown = null;
  let keyUp = null;

  injectStyles();
  applySoundUI();

  function startOurPath(){
    if (!ourPathBody) return;

    ourPathBody.innerHTML = `
      <div class="opRun">
        <div class="opRun__top">
          <div class="opRun__title">Our Path — Run it to remember 💗</div>

          <div class="opRun__progressWrap">
            <div class="opRun__progressText">
              Progress <span id="opProgPct" class="opBlack">0%</span> • Checkpoint <span id="opRunProgress" class="opBlack">0</span>/${chapters.length}
              • Time <span id="opRunTime" class="opBlack">0:00</span>
              • Lives <span id="opLives" class="opBlack">3</span>
              • Letters <span id="opRunLetters" class="opBlack">0</span>
              • <span id="opRunJoker" class="opBlack">${state.ourPathJokerUsed ? "used" : "1"}</span> Joker
              • <button class="btn btn--ghost" type="button" id="opMuteBtn">Mute</button>
              • <button class="btn btn--ghost" type="button" id="opPracticeBtn">Practice: Off</button>
            </div>
            <div class="opRun__progressBar"><div class="opRun__progressFill" id="opProgFill"></div></div>
            <div class="opRun__tiny">Dev keys: T=Finale • Y=Next checkpoint • R=Reset run</div>
          </div>
        </div>

        <div class="opRun__stage" id="opStage" style="position:relative">
          <div class="opVignette" id="opVignette"></div>

          <canvas id="opCanvas" width="800" height="320"></canvas>
          <canvas id="opFX" width="800" height="320" class="opFxCanvas"></canvas>

          <div class="opRun__hint">Click/Space = Jump • Hold ArrowDown/S = Duck • M = Mute</div>

          <div class="opRun__modal hidden" id="opModal" role="dialog" aria-modal="true">
            <div class="opRun__card">
              <div class="opRun__cardTitle" id="opMTitle"></div>
              <div class="opRun__cardQ" id="opMQ"></div>
              <div class="opRun__choices" id="opMChoices"></div>
              <div class="opRun__fb hidden" id="opMFb"></div>
              <div class="opRun__memory hidden" id="opMMemory"></div>
              <div class="opRun__actions" id="opMActions"></div>
            </div>
          </div>

          <div class="opRun__modal hidden" id="opCompleted" role="dialog" aria-modal="true">
            <div class="opRun__card opRun__card--completed">
              <div class="opCompleted__badge">OUR PATH COMPLETED</div>
              <div class="opCompleted__title">You did it 💗</div>
              <div class="opCompleted__sub">Now… open what I made for you.</div>
              <div class="opRun__actions">
                <button class="btn btn--primary" type="button" id="opOpenLetter">Open letter</button>
                <button class="btn btn--ghost" type="button" id="opReplayRun">Replay</button>
              </div>
            </div>
          </div>

          <div class="opRun__modal hidden" id="opLetterModal" role="dialog" aria-modal="true">
            <div class="opRun__card">
              <div class="opRun__cardTitle">A letter for you 💗</div>
              <div class="opRun__choices">
                <div class="opRun__letter" id="opLetter"></div>
              </div>
              <div class="opRun__actions">
                <button class="btn btn--primary" type="button" id="opThankYou">Thank you</button>
                <button class="btn btn--ghost" type="button" id="opReplay2">Replay</button>
              </div>
            </div>
          </div>

        </div>
      </div>
    `;

    const canvas = document.getElementById("opCanvas");
    const ctx = canvas.getContext("2d", { alpha:true });

    const fx = document.getElementById("opFX");
    const fctx = fx.getContext("2d", { alpha:true });

    const stage = document.getElementById("opStage");
    const vignette = document.getElementById("opVignette");
    const muteBtn = document.getElementById("opMuteBtn");
    const practiceBtn = document.getElementById("opPracticeBtn");

    const modal = document.getElementById("opModal");
    const mTitle = document.getElementById("opMTitle");
    const mQ = document.getElementById("opMQ");
    const mChoices = document.getElementById("opMChoices");
    const mFb = document.getElementById("opMFb");
    const mMemory = document.getElementById("opMMemory");
    const mActions = document.getElementById("opMActions");

    const completedModal = document.getElementById("opCompleted");
    const letterModal = document.getElementById("opLetterModal");

    const openLetterBtn = document.getElementById("opOpenLetter");
    const replayBtn = document.getElementById("opReplayRun");
    const thankYouBtn = document.getElementById("opThankYou");
    const replay2Btn = document.getElementById("opReplay2");

    const progressEl = document.getElementById("opRunProgress");
    const timeEl = document.getElementById("opRunTime");
    const livesEl = document.getElementById("opLives");
    const lettersEl = document.getElementById("opRunLetters");
    const jokerEl = document.getElementById("opRunJoker");
    const progPctEl = document.getElementById("opProgPct");
    const progFillEl = document.getElementById("opProgFill");

    const W = canvas.width, H = canvas.height;

    const kittyImg = new Image();
    kittyImg.src = "assets/hello-kitty.png";

    op = {
      stage, canvas, ctx, fx, fctx, W, H,
      running:true,
      pausedForQuiz:false,

      runTimer:0,
      lastFrame:performance.now(),

      checkpointIndex: clamp(state.ourPathProgress || 0, 0, chapters.length),
      completedAll:false,

      speed:2.0,
      maxSpeed:4.4,
      speedRampPerSec:0.05,

      groundY:H-58,
      gravity:0.70,
      jumpV:-13.2,
      crouching:false,

      avatar:{ x:110, y:0, vy:0, w:34, h:34, onGround:true },
      obstacles:[],
      nextObstacleIn:1.8,
      pendingSecondObstacle:null,
      hardMode:false,

      lives:3,
      practice:false,

      letters:0,

      particles:[],
      toastT:0,
      toastMsg:"",

      fireworks:[],
      fireworksOn:false,
      fireworksIntensity:1.0,

      vignette,
      modal,mTitle,mQ,mChoices,mFb,mMemory,mActions,
      completedModal,letterModal,
      progressEl,timeEl,livesEl,lettersEl,jokerEl,progPctEl,progFillEl,

      kittyImg,
      endSequenceStarted:false
    };

    op.avatar.y = op.groundY - op.avatar.h;

    // mute button
    const setMuteLabel = () => muteBtn.textContent = ourMuted ? "Unmute" : "Mute";
    setMuteLabel();
    muteBtn.addEventListener("click", () => { ourMuted = !ourMuted; applySoundUI(); setMuteLabel(); });

    // practice button
    practiceBtn.addEventListener("click", () => {
      op.practice = !op.practice;
      practiceBtn.textContent = op.practice ? "Practice: On" : "Practice: Off";
      spawnToast(op.practice ? "Practice on 😳" : "Practice off", 0.7);
    });

    // end buttons (IMPORTANT: no “YES” bug anymore)
    openLetterBtn.addEventListener("click", () => {
      hide(op.completedModal);
      openLetter();
    });

    replayBtn.addEventListener("click", () => {
      hide(op.completedModal);
      resetRun(true);
    });

    thankYouBtn.addEventListener("click", () => {
      hide(op.letterModal);
      spawnToast("💗💗💗", 1.0);
      // keep fireworks for a moment
      op.fireworksIntensity = 1.0;
      setTimeout(()=>{ op.fireworksIntensity = 0.6; }, 1500);
    });

    replay2Btn.addEventListener("click", () => {
      hide(op.letterModal);
      resetRun(true);
    });

    // keys
    if (keyDown) window.removeEventListener("keydown", keyDown);
    if (keyUp) window.removeEventListener("keyup", keyUp);

    function setCrouch(on){
      if (!op.running || op.pausedForQuiz) return;
      op.crouching = on;
      if (on){ op.avatar.h = 22; op.avatar.w = 38; }
      else { op.avatar.h = 34; op.avatar.w = 34; }
      if (op.avatar.y > op.groundY - op.avatar.h) op.avatar.y = op.groundY - op.avatar.h;
    }

    function jump(){
      ensureSongStarted();
      if (!op.running || op.pausedForQuiz) return;
      if (!op.avatar.onGround) return;
      setCrouch(false);
      op.avatar.vy = op.jumpV;
      op.avatar.onGround = false;
      spark(op.avatar.x+18, op.avatar.y+op.avatar.h-2, 7, Math.PI, 14,34, 0.16,0.34, ["✨","✦","⋆","💗"]);
    }

    keyDown = (e) => {
      if (state.activeView !== "ourpath") return;

      if (e.code==="Space"){ e.preventDefault(); jump(); }
      if (e.code==="ArrowDown" || e.code==="KeyS"){ e.preventDefault(); setCrouch(true); }
      if (e.code==="KeyM"){ e.preventDefault(); ourMuted=!ourMuted; applySoundUI(); setMuteLabel(); }

      if (e.code==="KeyT"){ e.preventDefault(); devToFinale(); }
      if (e.code==="KeyY"){ e.preventDefault(); devNextCheckpoint(); }
      if (e.code==="KeyR"){ e.preventDefault(); resetRun(true); }
    };
    keyUp = (e) => {
      if (state.activeView !== "ourpath") return;
      if (e.code==="ArrowDown" || e.code==="KeyS"){ e.preventDefault(); setCrouch(false); }
    };
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    canvas.addEventListener("pointerdown", () => jump());

    stopSong();
    prepareSong();

    function fmtTime(sec){
      const s = Math.max(0, Math.floor(sec));
      const m = Math.floor(s/60);
      const r = s%60;
      return `${m}:${String(r).padStart(2,"0")}`;
    }

    function setUI(){
      op.progressEl.textContent = String(op.checkpointIndex);
      op.lettersEl.textContent = String(op.letters);
      op.jokerEl.textContent = state.ourPathJokerUsed ? "used" : "1";
      op.livesEl.textContent = String(op.lives);

      const pct = Math.max(0, Math.min(100, Math.round((op.runTimer / TOTAL_RUN_SECONDS) * 100)));
      op.progPctEl.textContent = pct + "%";
      op.progFillEl.style.width = pct + "%";
    }

    function spawnToast(text, secs){
      op.toastMsg = text;
      op.toastT = secs;
    }

    function spark(x,y,n,spread,sMin,sMax,lMin,lMax,chars){
      for (let i=0;i<n;i++){
        const a = -spread/2 + Math.random()*spread;
        const sp = sMin + Math.random()*(sMax-sMin);
        op.particles.push({
          x,y,
          vx:Math.cos(a)*sp,
          vy:Math.sin(a)*sp,
          life:lMin+Math.random()*(lMax-lMin),
          t:0,
          s:10+Math.random()*10,
          ch:chars[(Math.random()*chars.length)|0]
        });
      }
    }

    function shuffledChoices(ch){
      const arr = [...ch.choices];
      for (let i=arr.length-1;i>0;i--){
        const j = (Math.random()*(i+1))|0;
        [arr[i],arr[j]] = [arr[j],arr[i]];
      }
      if (arr[0] === ch.answer && arr.length>1){
        const swap = 1 + ((Math.random()*(arr.length-1))|0);
        [arr[0],arr[swap]] = [arr[swap],arr[0]];
      }
      return arr;
    }

    function openQuiz(i){
      op.pausedForQuiz = true;
      op.running = false;
      pauseSong();

      show(op.modal);
      op.mFb.classList.add("hidden");
      op.mMemory.classList.add("hidden");
      op.mActions.innerHTML = "";
      op.mChoices.innerHTML = "";

      const ch = chapters[i];
      op.mTitle.textContent = ch.title;
      op.mQ.textContent = ch.isMath ? "" : ch.question;

      if (ch.isMath){
        const a = 7 + Math.floor(Math.random()*6);
        const b = 9 + Math.floor(Math.random()*8);
        const c = 4 + Math.floor(Math.random()*6);
        const correct = a*b + c;

        op.mQ.textContent = `Math boss. Solve ${a} × ${b} + ${c}`;

        const input = document.createElement("input");
        input.className="opRun__input";
        input.placeholder="Answer";
        input.inputMode="numeric";

        const btnSubmit = document.createElement("button");
        btnSubmit.className="btn btn--primary";
        btnSubmit.type="button";
        btnSubmit.textContent="Submit";

        const btnJoker = document.createElement("button");
        btnJoker.className="btn btn--ghost";
        btnJoker.type="button";
        btnJoker.textContent = state.ourPathJokerUsed ? "Joker used" : "Use Joker";
        btnJoker.disabled = state.ourPathJokerUsed;

        op.mChoices.appendChild(input);
        op.mActions.appendChild(btnJoker);
        op.mActions.appendChild(btnSubmit);

        btnJoker.addEventListener("click", () => {
          if (state.ourPathJokerUsed) return;
          state.ourPathJokerUsed = true;
          saveState();
          setUI();
          op.mFb.classList.remove("hidden");
          op.mFb.classList.remove("is-bad");
          op.mFb.classList.add("is-good");
          op.mFb.textContent = `Hint: between ${correct-5} and ${correct+5}`;
          btnJoker.textContent="Joker used";
          btnJoker.disabled=true;
        });

        btnSubmit.addEventListener("click", () => {
          const v = Number(String(input.value||"").trim());
          if (v === correct) correctAnswer(i, ch.memory);
          else wrongAnswer();
        });

        input.addEventListener("keydown", (e)=>{ if (e.key==="Enter") btnSubmit.click(); });
        return;
      }

      shuffledChoices(ch).forEach(choice => {
        const b = document.createElement("button");
        b.type="button";
        b.className="btn opRun__choice";
        b.textContent=choice;
        b.addEventListener("click", () => {
          if (choice === ch.answer) correctAnswer(i, ch.memory);
          else wrongAnswer();
        });
        op.mChoices.appendChild(b);
      });
    }

    function correctAnswer(i, memoryText){
      op.mFb.classList.remove("hidden");
      op.mFb.classList.remove("is-bad");
      op.mFb.classList.add("is-good");
      op.mFb.textContent="Correct";

      op.mMemory.classList.remove("hidden");
      op.mMemory.textContent=memoryText;

      op.mActions.innerHTML="";
      const btn = document.createElement("button");
      btn.className="btn btn--primary";
      btn.type="button";
      btn.textContent="Continue";
      btn.addEventListener("click", () => {
        hide(op.modal);
        op.checkpointIndex = i+1;
        state.ourPathProgress = op.checkpointIndex;
        saveState();
        setUI();
        if (op.checkpointIndex >= chapters.length) op.completedAll = true;
        op.running = true;
        op.pausedForQuiz = false;
        op.vignette.classList.remove("is-on");
        resumeSong();
      });
      op.mActions.appendChild(btn);
    }

    function wrongAnswer(){
      op.mFb.classList.remove("hidden");
      op.mFb.classList.remove("is-good");
      op.mFb.classList.add("is-bad");
      op.mFb.textContent="Wrong. Reset";
      setTimeout(()=>{ hide(op.modal); resetRun(true); }, 650);
    }

    function resetRun(full){
      hide(op.modal);
      hide(op.completedModal);
      hide(op.letterModal);

      op.endSequenceStarted = false;
      op.fireworksOn = false;
      op.fireworks.length = 0;
      op.fireworksIntensity = 1.0;

      stopSong();
      prepareSong();
      songStarted=false; songStarting=false;

      op.speed = 2.0;
      op.obstacles.length = 0;
      op.pendingSecondObstacle = null;

      op.runTimer = 0;
      op.completedAll = false;

      if (full){
        op.checkpointIndex = 0;
        op.letters = 0;
        state.ourPathProgress = 0;
        saveState();
      }

      op.lives = 3;

      op.crouching=false;
      op.avatar.h=34; op.avatar.w=34;
      op.avatar.y = op.groundY - op.avatar.h;
      op.avatar.vy=0;
      op.avatar.onGround=true;

      op.vignette.classList.remove("is-on");

      setUI();
      op.running=true;
      op.pausedForQuiz=false;
    }

    function onDeath(){
      if (op.practice){
        spawnToast("Hit. Practice saved you 😳", 0.7);
        op.obstacles = op.obstacles.filter(o => o.x > op.avatar.x + 160);
        op.avatar.y = op.groundY - op.avatar.h;
        op.avatar.vy = 0;
        op.avatar.onGround = true;
        return;
      }

      op.lives -= 1;
      setUI();
      if (op.lives > 0){
        spawnToast(`Ouch. Lives left: ${op.lives}`, 0.8);
        op.obstacles = op.obstacles.filter(o => o.x > op.avatar.x + 180);
        op.avatar.y = op.groundY - op.avatar.h;
        op.avatar.vy=0;
        op.avatar.onGround=true;
        return;
      }
      resetRun(true);
    }

    // ---------- FAIR SPAWN ----------
    function buildObstacle(type, x){
      let h,w,y;
      if (type==="low"){
        h = 16 + Math.random()*16;
        w = 26 + Math.random()*26;
        y = op.groundY - h;
      } else {
        h = 24 + Math.random()*14;
        w = 26 + Math.random()*18;
        y = op.groundY - h - (30 + Math.random()*18);
      }
      return { x, y, w, h, type, nearMissed:false };
    }

    function spawnObstacle(typeForced){
      const type = typeForced || (Math.random()<0.62 ? "low":"high");
      op.obstacles.push(buildObstacle(type, op.W + 30));
    }

    function spawnPatternCombo(){
      const first = Math.random()<0.5 ? "low":"high";
      const second = first==="low" ? "high":"low";
      op.obstacles.push(buildObstacle(first, op.W + 30));
      const gapPx = 380 + Math.random()*200;
      op.pendingSecondObstacle = { type: second, x: op.W + 30 + gapPx };
    }

    function intersects(a,b){
      return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }

    function nearMissCheck(box,o){
      if (o.nearMissed) return false;
      const passed = o.x + o.w < box.x;
      if (!passed) return false;
      const dx = box.x - (o.x + o.w);
      if (dx > 14) return false;
      o.nearMissed = true;
      return true;
    }

    // ---------- DEV KEYS ----------
    function devToFinale(){
      op.runTimer = TOTAL_RUN_SECONDS - 1.0;
      op.checkpointIndex = chapters.length;
      op.completedAll = true;
      state.ourPathProgress = chapters.length;
      saveState();
      spawnToast("DEV: jumped to finale", 0.7);
      setUI();
    }

    function devNextCheckpoint(){
      const next = Math.min(chapters.length-1, op.checkpointIndex);
      op.runTimer = CHECKPOINT_SECONDS[next] + 0.01;
      spawnToast("DEV: next checkpoint", 0.6);
      setUI();
    }

    // ---------- END FLOW (FIXED) ----------
    function startEndSequence(){
      if (op.endSequenceStarted) return;
      op.endSequenceStarted = true;

      op.running = false;
      op.pausedForQuiz = true;

      if (voiceTrack && !voiceTrack.paused) fadeOutAudio(voiceTrack, 0.9);

      // fireworks on
      op.fireworksOn = true;
      op.fireworksIntensity = 1.0;

      // show completed popup FIRST
      show(op.completedModal);
      spawnToast("💗 OUR PATH COMPLETED 💗", 1.2);
    }

    function openLetter(){
      // keep fireworks running behind letter
      show(op.letterModal);

      const letterEl = document.getElementById("opLetter");
      if (!letterEl) return;

      const letterText = `Hey baby

Happy Valentine’s Day

I love you so much
I miss you and I am excited to see you next time
And next time I have a surprise for you when we see each other
Until then remember I choose you always

I love you`;

      typewriter(letterEl, letterText);
    }

    function typewriter(el, text){
      el.textContent="";
      let i=0;
      const tick = () => {
        el.textContent = text.slice(0,i);
        i++;
        if (i<=text.length) setTimeout(tick, 14);
      };
      tick();
    }

    // ---------- FIREWORKS (HEARTS FULL SCREEN) ----------
    function boomHearts(x,y){
      const bursts = 18 + Math.floor(Math.random()*12);
      for (let i=0;i<bursts;i++){
        const a = (Math.PI*2) * (i/bursts) + (Math.random()*0.35);
        const sp = 2.0 + Math.random()*3.6;
        op.fireworks.push({
          x,y,
          vx: Math.cos(a)*sp,
          vy: Math.sin(a)*sp - (0.5 + Math.random()*1.0),
          g: 0.03 + Math.random()*0.04,
          life: 1.2 + Math.random()*0.9,
          t: 0,
          ch: Math.random()<0.70 ? "💗" : (Math.random()<0.5 ? "💞" : "💖"),
          s: 16 + Math.random()*22,
          rot: Math.random()*6.28,
          vr: -0.08 + Math.random()*0.16
        });
      }
    }

    function updateFireworks(dt){
      if (!op.fireworksOn) return;

      // spawn new booms regularly
      const spawnRate = 2.2 * op.fireworksIntensity; // booms/sec
      op._fwAcc = (op._fwAcc || 0) + dt*spawnRate;
      while (op._fwAcc >= 1){
        op._fwAcc -= 1;
        const x = 60 + Math.random()*(op.W-120);
        const y = 40 + Math.random()*(op.H*0.55);
        boomHearts(x,y);
      }

      for (const p of op.fireworks){
        p.t += dt;
        p.vy += p.g*60*dt;
        p.x += p.vx*60*dt;
        p.y += p.vy*60*dt;
        p.rot += p.vr*60*dt;
      }
      op.fireworks = op.fireworks.filter(p => p.t < p.life);
    }

    function drawFireworks(){
      const c = op.fctx;
      c.clearRect(0,0,op.W,op.H);

      // little glow overlay
      if (op.fireworksOn){
        c.fillStyle = "rgba(255,92,168,0.06)";
        c.fillRect(0,0,op.W,op.H);
      }

      for (const p of op.fireworks){
        const k = 1 - (p.t/p.life);
        c.globalAlpha = Math.max(0, k);
        c.font = `${p.s}px system-ui`;
        c.fillText(p.ch, p.x, p.y);
      }
      c.globalAlpha = 1;
    }

    // ---------- LOOP ----------
    function update(dt){
      // FX always updates (so fireworks continue behind modals)
      if (op.toastT > 0) op.toastT -= dt;
      for (const prt of op.particles){
        prt.t += dt;
        prt.x += prt.vx*60*dt;
        prt.y += prt.vy*60*dt;
        prt.vy += 0.02*60*dt;
      }
      op.particles = op.particles.filter(p => p.t < p.life);

      updateFireworks(dt);

      if (!op.running) return;

      op.runTimer += dt;
      op.timeEl.textContent = fmtTime(op.runTimer);

      op.hardMode = op.runTimer >= TOTAL_RUN_SECONDS * 0.75;

      const nextIdx = op.checkpointIndex;
      if (nextIdx < chapters.length){
        const tCp = CHECKPOINT_SECONDS[nextIdx];
        const tAnn = tCp - ANNOUNCE_SECONDS;

        if (op.runTimer >= tAnn && op.runTimer < tCp){
          op.vignette.classList.add("is-on");
        }
        if (op.runTimer >= tCp){
          op.vignette.classList.remove("is-on");
          openQuiz(nextIdx);
          return;
        }
      }

      // physics
      op.avatar.vy += op.gravity;
      op.avatar.y += op.avatar.vy;
      if (op.avatar.y >= op.groundY - op.avatar.h){
        op.avatar.y = op.groundY - op.avatar.h;
        op.avatar.vy = 0;
        op.avatar.onGround = true;
      }

      // speed ramp
      op.speed = Math.min(op.maxSpeed, op.speed + op.speedRampPerSec*dt);

      // spawn rules
      const minGap = op.hardMode ? 1.10 : 1.25;
      const baseGap = op.hardMode ? 1.60 : 1.85;
      const speedFactor = 0.045;

      op.nextObstacleIn -= dt;
      if (op.nextObstacleIn <= 0){
        const doCombo = op.hardMode && Math.random()<0.07;
        if (doCombo) spawnPatternCombo();
        else spawnObstacle();

        let next = Math.max(minGap, baseGap - op.speed*speedFactor) + (Math.random()*0.25);
        if (op.avatar.onGround) next += 0.18;
        op.nextObstacleIn = next;
      }

      if (op.pendingSecondObstacle){
        const p = op.pendingSecondObstacle;
        op.obstacles.push(buildObstacle(p.type, p.x));
        op.pendingSecondObstacle = null;
      }

      const dx = op.speed * 1.50;
      for (const o of op.obstacles) o.x -= dx;
      op.obstacles = op.obstacles.filter(o => o.x + o.w > -90);

      // collisions
      const box = { x: op.avatar.x, y: op.avatar.y, w: op.avatar.w, h: op.avatar.h };
      for (const o of op.obstacles){
        if (intersects(box,o)){ onDeath(); return; }
      }
      for (const o of op.obstacles){
        if (nearMissCheck(box,o)) spawnToast("Close one 😳", 0.45);
      }

      // if all checkpoints done, end at end of song
      if (op.checkpointIndex >= chapters.length) op.completedAll = true;

      if (op.completedAll && op.runTimer >= TOTAL_RUN_SECONDS - 0.25){
        startEndSequence();
        return;
      }

      setUI();
    }

    function draw(){
      const c = op.ctx, W=op.W, H=op.H;
      c.clearRect(0,0,W,H);

      c.fillStyle = "rgba(255,255,255,0.06)";
      c.fillRect(0,0,W,H);

      c.fillStyle = "rgba(255,255,255,0.16)";
      c.fillRect(0, op.groundY, W, 2);

      // obstacles
      for (const o of op.obstacles){
        c.fillStyle = "rgba(40,15,30,0.62)";
        c.fillRect(o.x-2,o.y-2,o.w+4,o.h+4);
        c.fillStyle = "rgba(255,92,168,0.42)";
        c.fillRect(o.x,o.y,o.w,o.h);
        c.font = "22px system-ui";
        c.fillStyle = "rgba(255,255,255,0.95)";
        c.fillText(o.type==="high" ? "🌸" : "💔", o.x+3, o.y+o.h-3);
      }

      // avatar
      const av = op.avatar;
      c.globalAlpha = 0.25;
      c.fillStyle = "rgba(0,0,0,0.35)";
      c.fillRect(av.x+3,av.y+6,av.w,av.h);
      c.globalAlpha = 1;

      if (op.kittyImg.complete && op.kittyImg.naturalWidth>0){
        const scale = op.crouching ? 1.12 : 1.28;
        const dw = av.w*scale, dh = av.h*scale;
        const dx = av.x-(dw-av.w)/2, dy = av.y-(dh-av.h)/2;
        c.drawImage(op.kittyImg, dx, dy, dw, dh);
      } else {
        c.font="26px system-ui";
        c.fillText("🐱", av.x, av.y+26);
      }

      // particles
      for (const p of op.particles){
        const k = 1 - (p.t/p.life);
        c.globalAlpha = Math.max(0,k);
        c.font = `${p.s}px system-ui`;
        c.fillText(p.ch, p.x, p.y);
      }
      c.globalAlpha=1;

      // toast
      if (op.toastT > 0){
        c.globalAlpha = 1;
        c.fillStyle = "rgba(40,15,30,0.85)";
        const msg = op.toastMsg || "";
        c.font = "14px system-ui";
        const tw = c.measureText(msg).width;
        const px = (W - tw)/2 - 12;
        c.fillRect(px, 18, tw+24, 28);
        c.fillStyle = "rgba(255,255,255,0.95)";
        c.fillText(msg, (W-tw)/2, 38);
      }

      c.font="12px system-ui";
      c.fillStyle="rgba(40,15,30,0.9)";
      c.fillText(`Speed ${op.speed.toFixed(1)}${op.hardMode ? " • Hard" : ""}`, 14, 22);
    }

    function loop(now){
      if (!op || state.activeView !== "ourpath"){ requestAnimationFrame(loop); return; }
      const dt = Math.min(0.05, (now - op.lastFrame)/1000);
      op.lastFrame = now;
      update(dt);
      draw();
      drawFireworks();
      requestAnimationFrame(loop);
    }

    setUI();
    requestAnimationFrame(loop);

    function devToFinale(){ op.runTimer = TOTAL_RUN_SECONDS - 0.2; op.checkpointIndex = chapters.length; op.completedAll=true; state.ourPathProgress = chapters.length; saveState(); spawnToast("DEV: finale", 0.6); setUI(); }
    function devNextCheckpoint(){ const next = Math.min(chapters.length-1, op.checkpointIndex); op.runTimer = CHECKPOINT_SECONDS[next] + 0.01; spawnToast("DEV: next checkpoint", 0.55); setUI(); }
  }

  function injectStyles(){
    if (document.getElementById("opInlineStyle")) return;
    const st = document.createElement("style");
    st.id="opInlineStyle";
    st.textContent = `
      .opBlack{color:#14060d !important}
      .opFxCanvas{position:absolute;left:0;top:0;pointer-events:none;z-index:9;mix-blend-mode:screen}
      .opRun__progressText{display:flex;flex-wrap:wrap;gap:10px;align-items:center;color:#16070f;font-size:12px;font-weight:700;text-shadow:0 1px 0 rgba(255,255,255,.7),0 2px 12px rgba(255,255,255,.25)}
      .opRun__progressBar{height:10px;border-radius:999px;background:rgba(255,255,255,.10);overflow:hidden;border:1px solid rgba(255,92,168,.35)}
      .opRun__progressFill{height:100%;width:0%;background:rgba(255,92,168,.80);border-radius:999px;transition:width .12s linear}
      .opRun__tiny{margin-top:6px;font-size:11px;opacity:.7}
      .opVignette{position:absolute;inset:-20px;pointer-events:none;background:radial-gradient(circle at 50% 45%, rgba(0,0,0,0) 0%, rgba(0,0,0,.20) 55%, rgba(0,0,0,.40) 100%);opacity:0;transition:opacity .12s ease;z-index:12}
      .opVignette.is-on{opacity:1}

      .opRun__modal{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45);backdrop-filter:blur(4px);z-index:25}
      .opRun__modal.hidden{display:none}
      .opRun__card{width:min(560px,calc(100% - 28px));background:rgba(20,14,20,.92);border:1px solid rgba(255,92,168,.55);border-radius:20px;padding:14px 14px;box-shadow:0 18px 60px rgba(0,0,0,.55)}
      .opRun__card--completed{background:rgba(40,15,30,.92)}
      .opRun__cardTitle{color:#fff;font-size:16px;text-shadow:0 2px 14px rgba(255,92,168,.20)}
      .opRun__cardQ{margin-top:10px;color:#fff;opacity:.92;line-height:1.4}
      .opRun__choices{margin-top:12px;display:flex;flex-direction:column;gap:10px}
      .opRun__choice{justify-content:center}
      .opRun__fb{margin-top:10px;padding:10px 12px;border-radius:14px;color:#fff}
      .opRun__fb.is-good{background:rgba(40,160,90,.18);border:1px solid rgba(40,160,90,.35)}
      .opRun__fb.is-bad{background:rgba(220,60,80,.16);border:1px solid rgba(220,60,80,.35)}
      .opRun__memory{margin-top:10px;color:#fff;opacity:.90;line-height:1.45}
      .opRun__actions{margin-top:12px;display:flex;gap:10px;flex-wrap:wrap}
      .opRun__input{width:100%;border-radius:12px;border:1px solid rgba(255,92,168,.35);background:rgba(0,0,0,.18);padding:10px 12px;color:#fff;outline:none}
      .opRun__letter{white-space:pre-wrap;color:#fff;opacity:.95;line-height:1.5}

      .opCompleted__badge{display:inline-block;background:rgba(255,92,168,.18);border:1px solid rgba(255,92,168,.45);padding:6px 10px;border-radius:999px;color:#fff;font-weight:800;font-size:12px}
      .opCompleted__title{margin-top:10px;color:#fff;font-size:22px;font-weight:900}
      .opCompleted__sub{margin-top:6px;color:#fff;opacity:.90}
    `;
    document.head.appendChild(st);
  }

  if (state.ourPathUnlocked){
    if (ourPathLockLabel) ourPathLockLabel.style.display = "none";
    startOurPath();
  }
})();
