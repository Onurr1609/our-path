(() => {
  // ---------- DOM ----------
  const tabMinesweeper = document.getElementById("tabMinesweeper");
  const tabOurPath = document.getElementById("tabOurPath");
  const ourPathLockLabel = document.getElementById("ourPathLockLabel");

  const viewMinesweeper = document.getElementById("viewMinesweeper");
  const viewOurPath = document.getElementById("viewOurPath");

  const btnReset = document.getElementById("btnReset");
  const btnSound = document.getElementById("btnSound");
  const bgMusic = document.getElementById("bgMusic");

  const statHearts = document.getElementById("statHearts");
  const statHints = document.getElementById("statHints");
  const statMines = document.getElementById("statMines");

  const btnEasy = document.getElementById("btnEasy");
  const btnMedium = document.getElementById("btnMedium");
  const btnUltra = document.getElementById("btnUltra");

  const btnHint = document.getElementById("btnHint");
  const msGrid = document.getElementById("msGrid");
  const msStatus = document.getElementById("msStatus");

  const codeInput = document.getElementById("codeInput");
  const btnUnlock = document.getElementById("btnUnlock");
  const codeError = document.getElementById("codeError");

  // Valentine modal (hint gate)
  const valModal = document.getElementById("valModal");
  const valModalBadge = document.getElementById("valModalBadge");
  const valModalTitle = document.getElementById("valModalTitle");
  const valModalText = document.getElementById("valModalText");
  const valYes = document.getElementById("valYes");
  const valNo = document.getElementById("valNo");
  const valClose = document.getElementById("valClose");

  // Win modal
  const winModal = document.getElementById("winModal");
  const winText = document.getElementById("winText");
  const winYes = document.getElementById("winYes");
  const winNo = document.getElementById("winNo");
  const winClose = document.getElementById("winClose");

  // ---------- STATE ----------
  const STORAGE_KEY = "ourpath_state_v3";

  const defaultState = {
    activeView: "minesweeper",
    soundOn: false,

    // Our Path lock
    ourPathUnlocked: false,

    // Minesweeper meta
    hearts: 0,

    // difficulty: easy/medium/ultra
    difficulty: "easy",

    // per difficulty hint usage
    hintUsedUltra: 0,

    // current board snapshot for refresh
    board: null
  };

  let state = loadState();

  // ---------- CONFIG ----------
  // Minesweeper presets tuned to fit in UI without scroll (JS scales cells anyway)
  const PRESETS = {
    easy:   { rows: 10, cols: 12, mines: 14, hintLimit: Infinity },
    medium: { rows: 14, cols: 16, mines: 35, hintLimit: Infinity },
    ultra:  { rows: 18, cols: 22, mines: 70, hintLimit: 5 } // 5 hints max
  };

  // Our Path unlock code (YOU change this)
  // IMPORTANT: set it to something ONLY you know.
  const OUR_PATH_SECRET_CODE = "07032022"; // example (change it)

  // Hint reveal duration
  const HINT_REVEAL_MS = 900
  ;

  // ---------- INIT ----------
  renderTabs();
  renderView();
  bindEvents();

  // Ensure minesweeper board exists
  ensureBoard();

  // ---------- FUNCTIONS ----------
  function bindEvents() {
    tabMinesweeper.addEventListener("click", () => switchView("minesweeper"));
    tabOurPath.addEventListener("click", () => {
      if (!state.ourPathUnlocked) {
        switchView("ourpath");
        return;
      }
      switchView("ourpath");
    });

    btnReset.addEventListener("click", hardReset);
    btnSound.addEventListener("click", toggleSound);

    btnEasy.addEventListener("click", () => setDifficulty("easy"));
    btnMedium.addEventListener("click", () => setDifficulty("medium"));
    btnUltra.addEventListener("click", () => setDifficulty("ultra"));

    btnHint.addEventListener("click", () => requestHint());

    btnUnlock.addEventListener("click", () => tryUnlock());
    codeInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") tryUnlock();
    });

    // Close modals
    valClose.addEventListener("click", () => hide(valModal));
    valNo.addEventListener("click", () => hide(valModal));
    winClose.addEventListener("click", () => hide(winModal));
    winNo.addEventListener("click", () => hide(winModal));

    // Resize -> rescale grid
    window.addEventListener("resize", () => {
      if (state.activeView === "minesweeper") scaleGridToFit();
    });
  }

  function switchView(view) {
    state.activeView = view;
    saveState();
    renderTabs();
    renderView();
    if (view === "minesweeper") {
      scaleGridToFit();
    }
  }

  function renderTabs() {
    // Active tab styling
    tabMinesweeper.classList.toggle("is-active", state.activeView === "minesweeper");
    tabOurPath.classList.toggle("is-active", state.activeView === "ourpath");

    // Locked label
    ourPathLockLabel.textContent = state.ourPathUnlocked ? "" : "(locked)";
    ourPathLockLabel.style.display = state.ourPathUnlocked ? "none" : "inline";
  }

  function renderView() {
    viewMinesweeper.classList.toggle("view--active", state.activeView === "minesweeper");
    viewOurPath.classList.toggle("view--active", state.activeView === "ourpath");

    // Sound button label
    btnSound.textContent = state.soundOn ? "Sound: On" : "Sound";

    // Difficulty buttons
    btnEasy.classList.toggle("is-active", state.difficulty === "easy");
    btnMedium.classList.toggle("is-active", state.difficulty === "medium");
    btnUltra.classList.toggle("is-active", state.difficulty === "ultra");

    // Update stats
    statHearts.textContent = String(state.hearts);

    const preset = PRESETS[state.difficulty];
    statMines.textContent = String(preset.mines);

    if (state.difficulty === "ultra") {
      statHints.textContent = String(Math.max(0, preset.hintLimit - state.hintUsedUltra));
    } else {
      statHints.textContent = "∞";
    }

    // Clear error
    hide(codeError);

    if (state.activeView === "minesweeper") {
      renderBoard();
    }
  }

  function setDifficulty(diff) {
    if (state.difficulty === diff) return;
    state.difficulty = diff;
    state.board = null; // new board
    saveState();
    renderView();
    ensureBoard();
  }

  function ensureBoard() {
    if (!state.board) {
      const preset = PRESETS[state.difficulty];
      state.board = createBoard(preset.rows, preset.cols, preset.mines);
      saveState();
    }
    renderBoard();
    scaleGridToFit();
  }

  function hardReset() {
    // Keep nothing: reset all
    state = structuredClone(defaultState);
    saveState();
    renderTabs();
    renderView();
    ensureBoard();
    stopMusic();
  }

  function toggleSound() {
    state.soundOn = !state.soundOn;
    saveState();
    renderView();
    if (state.soundOn) startMusic();
    else stopMusic();
  }

  function startMusic() {
    try {
      bgMusic.volume = 0.25;
      bgMusic.play().catch(() => {});
    } catch {}
  }

  function stopMusic() {
    try {
      bgMusic.pause();
      bgMusic.currentTime = 0;
    } catch {}
  }

  function tryUnlock() {
    const raw = (codeInput.value || "").trim();
    const cleaned = raw.replace(/\s+/g, "");
    if (cleaned === OUR_PATH_SECRET_CODE) {
      state.ourPathUnlocked = true;
      saveState();
      hide(codeError);
      // Go to Our Path view
      switchView("ourpath");
      // You can replace this later with your actual map/game content
      showOurPathUnlockedMessage();
    } else {
      show(codeError);
      shake(codeError);
    }
  }

  function showOurPathUnlockedMessage() {
    // Minimal placeholder (you will replace with your actual Our Path map)
    const body = viewOurPath.querySelector(".card__body");
    body.innerHTML = `
      <p class="letter">
        Welcome in, love… 💗<br/>
        Our Path is unlocked.
      </p>
      <div class="subhint">
        Next step: we plug in your map + 20 memories.
      </div>
      <div class="tiny">
        (This is a placeholder screen — the real “Our Path” map goes here.)
      </div>
    `;
    ourPathLockLabel.style.display = "none";
    tabOurPath.textContent = "Our Path";
  }

  // ---------- MINESWEEPER ----------
  function createBoard(rows, cols, mines) {
    // Each cell:
    // { r, c, mine, open, flag, n }
    const cells = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) {
        row.push({ r, c, mine: false, open: false, flag: false, n: 0, hintBombFlash: false });
      }
      cells.push(row);
    }

    // Place mines
    const positions = [];
    for (let i = 0; i < rows * cols; i++) positions.push(i);
    shuffle(positions);

    for (let i = 0; i < mines; i++) {
      const idx = positions[i];
      const r = Math.floor(idx / cols);
      const c = idx % cols;
      cells[r][c].mine = true;
    }

    // Compute numbers
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (cells[r][c].mine) continue;
        let count = 0;
        forEachNeighbor(rows, cols, r, c, (nr, nc) => {
          if (cells[nr][nc].mine) count++;
        });
        cells[r][c].n = count;
      }
    }

    return {
      rows, cols, mines,
      gameOver: false,
      won: false,
      cells
    };
  }

  function renderBoard() {
    const board = state.board;
    if (!board) return;

    msGrid.style.gridTemplateColumns = `repeat(${board.cols}, var(--cell))`;
    msGrid.style.gridTemplateRows = `repeat(${board.rows}, var(--cell))`;
    msGrid.innerHTML = "";

    for (let r = 0; r < board.rows; r++) {
      for (let c = 0; c < board.cols; c++) {
        const cell = board.cells[r][c];
        const el = document.createElement("div");
        el.className = "cell";
        el.setAttribute("role", "gridcell");
        el.dataset.r = String(r);
        el.dataset.c = String(c);

        // Visual state
        if (cell.open) {
          el.classList.add("cell--open");
          if (cell.mine) {
            el.classList.add("cell--bomb");
            el.innerHTML = `<span class="cell__icon">💣</span>`;
          } else if (cell.n > 0) {
            el.classList.add(`n${Math.min(8, cell.n)}`);
            el.textContent = String(cell.n);
          } else {
            el.textContent = "";
          }
        } else {
          // closed
          if (cell.flag) {
            el.classList.add("cell--flag");
            el.innerHTML = `<span class="cell__icon">🚩</span>`;
          } else if (cell.hintBombFlash) {
            // hint flash: show bomb icon for 3 sec without opening
            el.innerHTML = `<span class="cell__icon">💣</span>`;
          } else {
            el.textContent = "";
          }
        }

        // Events
        el.addEventListener("click", () => onLeftClick(r, c));
        el.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          onRightClick(r, c);
        });

        // Long-press on mobile for flag
        addLongPressFlag(el, () => onRightClick(r, c));

        msGrid.appendChild(el);
      }
    }

    // Status line
    if (board.won) msStatus.textContent = "Status: Cleared ✨";
    else if (board.gameOver) msStatus.textContent = "Status: Boom 💣";
    else msStatus.textContent = "";
  }

  function onLeftClick(r, c) {
    const board = state.board;
    if (!board || board.gameOver || board.won) return;
    const cell = board.cells[r][c];
    if (cell.open || cell.flag) return;

    // Open
    cell.open = true;

    // Mine => game over
    if (cell.mine) {
      board.gameOver = true;
      revealAllMines();
      saveState();
      renderBoard();
      shake(msGrid);
      return;
    }

    // Flood fill for zeros
    if (cell.n === 0) {
      floodOpenZeros(r, c);
    }

    // Check win
    if (checkWin()) {
      board.won = true;
      board.gameOver = false;
      saveState();
      renderBoard();
      showWinModal();
      return;
    }

    saveState();
    renderBoard();
  }

  function onRightClick(r, c) {
    const board = state.board;
    if (!board || board.gameOver || board.won) return;
    const cell = board.cells[r][c];
    if (cell.open) return;
    cell.flag = !cell.flag;
    saveState();
    renderBoard();
  }

  function floodOpenZeros(sr, sc) {
    const board = state.board;
    const { rows, cols, cells } = board;
    const q = [[sr, sc]];
    const seen = new Set([`${sr},${sc}`]);

    while (q.length) {
      const [r, c] = q.shift();
      const cell = cells[r][c];

      forEachNeighbor(rows, cols, r, c, (nr, nc) => {
        const k = `${nr},${nc}`;
        if (seen.has(k)) return;
        const ncell = cells[nr][nc];
        if (ncell.open || ncell.flag) return;

        // open neighbor if safe
        if (!ncell.mine) {
          ncell.open = true;
          seen.add(k);
          // continue BFS only through zeros
          if (ncell.n === 0) q.push([nr, nc]);
        }
      });
    }
  }

  function revealAllMines() {
    const board = state.board;
    for (let r = 0; r < board.rows; r++) {
      for (let c = 0; c < board.cols; c++) {
        const cell = board.cells[r][c];
        if (cell.mine) cell.open = true;
      }
    }
  }

  function checkWin() {
    const board = state.board;
    const total = board.rows * board.cols;
    let opened = 0;
    let mines = 0;
    for (let r = 0; r < board.rows; r++) {
      for (let c = 0; c < board.cols; c++) {
        const cell = board.cells[r][c];
        if (cell.mine) mines++;
        if (cell.open) opened++;
      }
    }
    return opened === (total - mines);
  }

  function newBoardSameDifficulty() {
    const preset = PRESETS[state.difficulty];
    state.board = createBoard(preset.rows, preset.cols, preset.mines);
    saveState();
    renderView();
    scaleGridToFit();
  }

  // ---------- HINT (Valentine gate) ----------
  function requestHint() {
    const preset = PRESETS[state.difficulty];
    if (state.board?.gameOver || state.board?.won) return;

    // Ultra: limit to 5
    if (state.difficulty === "ultra") {
      if (state.hintUsedUltra >= preset.hintLimit) {
        msStatus.textContent = "Status: No hints left 💔";
        shake(msStatus);
        return;
      }
    }

    // Open cute modal gate
    valModalBadge.textContent = "A tiny question…";
    valModalTitle.textContent = "Do you wanna be my Valentine? 💞";
    valModalText.innerHTML = `Say <b>YES</b> and I’ll show the bombs for <b>less then a sec. :D </b>… just a little help 💗`;

    show(valModal);

    // Bind one-shot
    valYes.onclick = () => {
      hide(valModal);
      doHintRevealBombs();
    };
    valNo.onclick = () => {
      hide(valModal);
    };
  }

  function doHintRevealBombs() {
    const board = state.board;
    if (!board) return;

    // consume hint in ultra
    if (state.difficulty === "ultra") {
      state.hintUsedUltra += 1;
    }

    // Mark mines as "flash"
    for (let r = 0; r < board.rows; r++) {
      for (let c = 0; c < board.cols; c++) {
        const cell = board.cells[r][c];
        if (!cell.open && cell.mine) cell.hintBombFlash = true;
      }
    }

    saveState();
    renderView();

    // Remove after 3s
    setTimeout(() => {
      const b = state.board;
      if (!b) return;
      for (let r = 0; r < b.rows; r++) {
        for (let c = 0; c < b.cols; c++) {
          b.cells[r][c].hintBombFlash = false;
        }
      }
      saveState();
      renderView();
    }, HINT_REVEAL_MS);
  }

  // ---------- WIN FLOW ----------
  function showWinModal() {
    winText.textContent = "You cleared the board… one tiny question before we continue 💗";
    show(winModal);

    winYes.onclick = () => {
      hide(winModal);
      // award heart token
      state.hearts += 1;
      saveState();
      renderView();
      // cute follow-up: ask again but keep it fast
      quickLoveToast("Heart +1 💗");
      // start a new board automatically
      newBoardSameDifficulty();
    };

    winNo.onclick = () => {
      hide(winModal);
      // still new board (optional). If you want to keep board visible, remove this:
      newBoardSameDifficulty();
    };
  }

  function quickLoveToast(text) {
    msStatus.textContent = text;
    setTimeout(() => { msStatus.textContent = ""; }, 1800);
  }

  // ---------- GRID SCALING (no scroll, even Ultra) ----------
  function scaleGridToFit() {
    const board = state.board;
    if (!board) return;

    const wrap = msGrid.closest(".ms__gridWrap");
    if (!wrap) return;

    const wrapRect = wrap.getBoundingClientRect();

    // inner available area (leave some padding)
    const pad = 28;
    const availW = Math.max(200, wrapRect.width - pad);
    const availH = Math.max(200, wrapRect.height - pad);

    // desired gap in css is 6px; effective footprint:
    const gap = 6;

    // compute max cell size to fit both dimensions
    const cellW = Math.floor((availW - gap * (board.cols - 1)) / board.cols);
    const cellH = Math.floor((availH - gap * (board.rows - 1)) / board.rows);

    // clamp to keep it pretty
    const cell = clamp(Math.min(cellW, cellH), 18, 34);

    msGrid.style.setProperty("--cell", `${cell}px`);
  }

  // ---------- UTIL ----------
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(defaultState);
      const parsed = JSON.parse(raw);
      return { ...structuredClone(defaultState), ...parsed };
    } catch {
      return structuredClone(defaultState);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }

  function show(el) {
  el.classList.remove("hidden");

  // Wenn das Element ein Modal ist, den Body blurren
  if (el.classList.contains("modal")) {
    document.body.classList.add("is-blurred");
  }
}
  function hide(el) {
  el.classList.add("hidden");

  // Wenn das Element ein Modal ist, den Body-Blur entfernen
  if (el.classList.contains("modal")) {
    document.body.classList.remove("is-blurred");
  }
}

  function shake(el) {
    el.classList.remove("shake");
    void el.offsetWidth;
    el.classList.add("shake");
    setTimeout(() => el.classList.remove("shake"), 450);
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  function forEachNeighbor(rows, cols, r, c, fn) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
        fn(nr, nc);
      }
    }
  }

  function addLongPressFlag(el, onLongPress) {
    let timer = null;
    let moved = false;

    const start = (e) => {
      moved = false;
      timer = setTimeout(() => {
        if (!moved) onLongPress();
      }, 420);
    };
    const cancel = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };
    const move = () => { moved = true; cancel(); };

    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchend", cancel);
    el.addEventListener("touchcancel", cancel);
    el.addEventListener("touchmove", move, { passive: true });
  }

})();
(function bgFloat(){
  const root = document.querySelector('.bg-float');
  if(!root) return;

  const EMOJIS = ["💗","✨","💖","💞"];
  const COUNT = 14; // nicht zu viel

  for(let i=0;i<COUNT;i++){
    const el = document.createElement('div');
    el.className = 'floaty';
    el.dataset.emoji = EMOJIS[Math.floor(Math.random()*EMOJIS.length)];

    const x = Math.random()*100;
    const size = 10 + Math.random()*18;      // klein
    const op = 0.10 + Math.random()*0.18;    // sehr dezent
    const blur = Math.random()*1.2;          // leicht
    const dur = 10 + Math.random()*14;       // langsam
    const rot = Math.floor(Math.random()*40) - 20;

    el.style.setProperty('--x', x + 'vw');
    el.style.setProperty('--s', size + 'px');
    el.style.setProperty('--o', op);
    el.style.setProperty('--b', blur + 'px');
    el.style.setProperty('--d', dur + 's');
    el.style.setProperty('--r', rot + 'deg');
    el.style.animationDelay = (-Math.random()*dur) + 's';

    root.appendChild(el);
  }
})();
/* script.js */

// Startet Musik beim ersten Klick auf die Seite (Browser-Hack)
document.addEventListener('click', function startAudioContext() {
  const bgMusic = document.getElementById("bgMusic");
  if (bgMusic && bgMusic.paused) {
    bgMusic.volume = 0.2; // Leise Hintergrundlautstärke
    bgMusic.play().catch(e => console.log("Audio noch blockiert", e));
  }
  // Event Listener entfernen, damit es nicht bei jedem Klick neu feuert
  document.removeEventListener('click', startAudioContext);
}, { once: true });