/* ============================================
   SUDOKU SOLVER - BACKTRACKING ALGORITHM
   With animated visualization
   ============================================ */

const Sudoku = (() => {
  // ============ STATE ============
  let grid = Array(81).fill(0);
  let givenCells = new Set();
  let solving = false;
  let solveDelay = 100; // ms between steps for animation
  let stepCount = 0;
  let backtracks = 0;

  // ============ SAMPLE PUZZLES ============
  const PUZZLES = [
    // Easy
    [5,3,0,0,7,0,0,0,0,
     6,0,0,1,9,5,0,0,0,
     0,9,8,0,0,0,0,6,0,
     8,0,0,0,6,0,0,0,3,
     4,0,0,8,0,3,0,0,1,
     7,0,0,0,2,0,0,0,6,
     0,6,0,0,0,0,2,8,0,
     0,0,0,4,1,9,0,0,5,
     0,0,0,0,8,0,0,7,9],
    // Medium
    [0,0,0,2,6,0,7,0,1,
     6,8,0,0,7,0,0,9,0,
     1,9,0,0,0,4,5,0,0,
     8,2,0,1,0,0,0,4,0,
     0,0,4,6,0,2,9,0,0,
     0,5,0,0,0,3,0,2,8,
     0,0,9,3,0,0,0,7,4,
     0,4,0,0,5,0,0,3,6,
     7,0,3,0,1,8,0,0,0],
    // Hard
    [0,0,0,0,0,0,0,0,0,
     0,0,0,0,0,3,0,8,5,
     0,0,1,0,2,0,0,0,0,
     0,0,0,5,0,7,0,0,0,
     0,0,4,0,0,0,1,0,0,
     0,9,0,0,0,0,0,0,0,
     5,0,0,0,0,0,0,7,3,
     0,0,2,0,1,0,0,0,0,
     0,0,0,0,4,0,0,0,9]
  ];

  // ============ BACKTRACKING SOLVER ============
  /**
   * Sudoku Backtracking:
   * 1. Find next empty cell
   * 2. Try digits 1–9
   * 3. Check if digit is valid (row, col, box)
   * 4. If valid, place and recurse
   * 5. If recursion fails → backtrack (reset cell)
   * 6. If no digit works → unsolvable from here
   */

  function isValid(b, idx, num) {
    const row = Math.floor(idx / 9);
    const col = idx % 9;
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;

    // Check row
    for (let c = 0; c < 9; c++) {
      if (b[row * 9 + c] === num) return false;
    }
    // Check column
    for (let r = 0; r < 9; r++) {
      if (b[r * 9 + col] === num) return false;
    }
    // Check 3×3 box
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (b[(boxRow + r) * 9 + (boxCol + c)] === num) return false;
      }
    }
    return true;
  }

  function solve(b) {
    const empty = b.indexOf(0);
    if (empty === -1) return true; // Solved!

    for (let num = 1; num <= 9; num++) {
      if (isValid(b, empty, num)) {
        b[empty] = num;
        if (solve(b)) return true;
        b[empty] = 0; // Backtrack
      }
    }
    return false;
  }

  // ============ ANIMATED SOLVING ============
  async function solveAnimated() {
    const steps = [];

    function solveWithSteps(b) {
      // MRV (Minimum Remaining Values) Heuristic to solve sparse grids instantly
      let empty = -1;
      let minChoices = 10;
      for (let i = 0; i < 81; i++) {
        if (b[i] === 0) {
          let choices = 0;
          for (let n = 1; n <= 9; n++) { if (isValid(b, i, n)) choices++; }
          if (choices < minChoices) {
            minChoices = choices;
            empty = i;
          }
        }
      }
      if (empty === -1) return true;

      for (let num = 1; num <= 9; num++) {
        if (isValid(b, empty, num)) {
          b[empty] = num;
          steps.push({ idx: empty, val: num, type: 'place' });
          if (solveWithSteps(b)) return true;
          b[empty] = 0;
          steps.push({ idx: empty, val: 0, type: 'backtrack' });
        }
      }
      return false;
    }

    const bCopy = [...grid];
    const solvable = solveWithSteps(bCopy);

    if (!solvable) {
      window.AIPlayground?.Toast.show('No solution exists!', 'error');
      solving = false;
      return;
    }

    // Animate steps
    stepCount = 0;
    backtracks = 0;
    let i = 0;

    const animate = () => {
      if (!solving || i >= steps.length) {
        solving = false;
        updateControlsState(false);
        if (i >= steps.length) {
          window.AIPlayground?.Toast.show('Puzzle solved! ✓', 'success');
          updateStatus('Solved!', 'success');
        }
        return;
      }

      const step = steps[i++];
      stepCount++;

      const r = Math.floor(step.idx / 9) + 1;
      const c = (step.idx % 9) + 1;
      if (step.type === 'place') {
        updateStatus(`Tried ${step.val} at (${r},${c})`, 'active');
      } else {
        updateStatus(`Backtracked (${r},${c})`, 'warning');
      }

      const cell = document.querySelector(`[data-sudoku-idx="${step.idx}"]`);
      if (cell) {
        if (step.type === 'place') {
          cell.value = step.val;
          cell.className = cell.className.replace(/\bcell-solving\b|\bcell-backtrack\b/g, '').trim();
          cell.classList.add('cell-solving');
        } else {
          cell.value = '';
          cell.classList.remove('cell-solving');
          cell.classList.add('cell-backtrack');
          backtracks++;
        }
      }

      // Update grid state
      grid[step.idx] = step.val;
      updateStats();

      // Throttle based on speed slider
      if (stepCount % Math.max(1, Math.floor(1000 / solveDelay)) === 0) {
        setTimeout(animate, solveDelay);
      } else {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  // ============ UI RENDERING ============
  function renderGrid() {
    const container = document.getElementById('sudoku-grid');
    if (!container) return;
    container.innerHTML = '';

    for (let i = 0; i < 81; i++) {
      const cell = document.createElement('input');
      cell.type = 'text';
      cell.maxLength = 1;
      cell.dataset.sudokuIdx = i;

      const row = Math.floor(i / 9);
      const col = i % 9;

      cell.className = 'sudoku-cell';

      // Box borders
      if (col % 3 === 0 && col > 0) cell.classList.add('box-border-left');
      if (row % 3 === 0 && row > 0) cell.classList.add('box-border-top');

      if (grid[i] !== 0) {
        cell.value = grid[i];
        if (givenCells.has(i)) {
          cell.readOnly = true;
          cell.classList.add('cell-given');
        }
      }

      cell.addEventListener('input', function() {
        const val = parseInt(this.value);
        if (!val || val < 1 || val > 9) {
          this.value = '';
          grid[i] = 0;
        } else {
          this.value = val;
          grid[i] = val;
          highlightRelated(i);
        }
      });

      cell.addEventListener('focus', () => highlightRelated(i));
      cell.addEventListener('blur', () => clearHighlights());

      container.appendChild(cell);
    }
  }

  function highlightRelated(idx) {
    clearHighlights();
    const row = Math.floor(idx / 9);
    const col = idx % 9;
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;

    document.querySelectorAll('.sudoku-cell').forEach((cell, i) => {
      const r = Math.floor(i / 9);
      const c = i % 9;
      const br = Math.floor(r / 3) * 3;
      const bc = Math.floor(c / 3) * 3;

      if (i === idx) {
        cell.classList.add('cell-focus');
      } else if (r === row || c === col || (br === boxRow && bc === boxCol)) {
        cell.classList.add('cell-related');
      }
    });
  }

  function clearHighlights() {
    document.querySelectorAll('.sudoku-cell').forEach(cell => {
      cell.classList.remove('cell-focus', 'cell-related');
    });
  }

  function updateStatus(text, type = 'active') {
    const el = document.getElementById('sudoku-status');
    if (el) { el.textContent = text; el.className = `status-value ${type}`; }

    const logEl = document.getElementById('sudoku-log');
    if (logEl) {
      if (logEl.children[0] && logEl.children[0].textContent.includes('Status:')) logEl.innerHTML = '';
      
      // Limit log size for performance
      if (logEl.children.length > 30) logEl.removeChild(logEl.firstChild);

      const item = document.createElement('div');
      item.style.marginBottom = '2px';
      item.style.color = type === 'error' ? 'var(--accent-red)' : type === 'warning' ? 'var(--accent-orange)' : type === 'success' ? 'var(--accent-green)' : 'var(--text-secondary)';
      item.innerHTML = `<span style="color:var(--text-muted); font-size:0.65rem;">[${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}]</span> ${text}`;
      logEl.appendChild(item);
      logEl.scrollTop = logEl.scrollHeight;
    }
  }

  function updateStats() {
    const stepsEl = document.getElementById('sudoku-steps');
    const backEl  = document.getElementById('sudoku-backtracks');
    const filledEl = document.getElementById('sudoku-filled');
    if (stepsEl) stepsEl.textContent = stepCount.toLocaleString();
    if (backEl)  backEl.textContent  = backtracks.toLocaleString();
    if (filledEl) {
      const filled = grid.filter(v => v !== 0).length;
      filledEl.textContent = `${filled}/81`;
      const pct = Math.round((filled / 81) * 100);
      const bar = document.getElementById('fill-progress');
      if (bar) bar.style.width = `${pct}%`;
    }
  }

  function updateControlsState(isSolving) {
    const btns = ['btn-solve', 'btn-clear', 'btn-sample'];
    btns.forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.disabled = isSolving;
        btn.style.opacity = isSolving ? '0.5' : '1';
      }
    });
    const stopBtn = document.getElementById('btn-stop');
    if (stopBtn) stopBtn.style.display = isSolving ? 'inline-flex' : 'none';
  }

  // ============ CONTROLS ============
  function loadPuzzle(idx = 0) {
    grid = [...PUZZLES[idx % PUZZLES.length]];
    givenCells = new Set(grid.map((v, i) => v !== 0 ? i : -1).filter(i => i !== -1));
    stepCount = 0;
    backtracks = 0;
    renderGrid();
    updateStats();
    updateStatus('Ready to solve', 'active');

    const logEl = document.getElementById('sudoku-log');
    if (logEl) logEl.innerHTML = '<div style="color: var(--text-muted);">Status: Ready designed.</div>';
  }

  function clearGrid() {
    grid = Array(81).fill(0);
    givenCells = new Set();
    stepCount = 0;
    backtracks = 0;
    renderGrid();
    updateStats();
    updateStatus('Grid cleared', 'active');

    const logEl = document.getElementById('sudoku-log');
    if (logEl) logEl.innerHTML = '<div style="color: var(--text-muted);">Status: Grid cleared.</div>';
  }

  function startSolve() {
    // Validate current grid first
    const hasInput = grid.some(v => v !== 0);
    if (!hasInput) {
      window.AIPlayground?.Toast.show('Load a puzzle first!', 'warning');
      return;
    }

    solving = true;
    stepCount = 0;
    backtracks = 0;
    updateControlsState(true);
    updateStatus('Solving...', 'thinking');
    solveAnimated();
  }

  function stopSolve() {
    solving = false;
    updateControlsState(false);
    updateStatus('Stopped', 'warning');
  }

  // ============ INIT ============
  function init() {
    loadPuzzle(0);

    document.getElementById('btn-solve')?.addEventListener('click', startSolve);
    document.getElementById('btn-stop')?.addEventListener('click', stopSolve);
    document.getElementById('btn-clear')?.addEventListener('click', clearGrid);

    document.getElementById('btn-sample')?.addEventListener('click', function() {
      const puzzles = [0, 1, 2];
      const next = (parseInt(this.dataset.current || 0) + 1) % puzzles.length;
      this.dataset.current = next;
      loadPuzzle(next);
      const names = ['Easy', 'Medium', 'Hard'];
      window.AIPlayground?.Toast.show(`Loaded: ${names[next]} puzzle`, 'info');
    });

    document.getElementById('speed-slider')?.addEventListener('input', function() {
      solveDelay = 1001 - parseInt(this.value);
      const label = document.getElementById('speed-label');
      if (label) {
        const speeds = ['Slowest', 'Slow', 'Normal', 'Fast', 'Fastest'];
        const idx = Math.floor((parseInt(this.value) / 200) - 0.01);
        label.textContent = speeds[Math.min(idx, 4)] || 'Normal';
      }
    });
  }

  return { init, reset: clearGrid };
})();

// ============ STYLES ============
const sudokuStyle = document.createElement('style');
sudokuStyle.textContent = `
  .sudoku-grid {
    display: grid;
    grid-template-columns: repeat(9, 1fr);
    gap: 2px;
    border: 2px solid var(--border-bright);
    border-radius: var(--radius-sm);
    padding: 3px;
    max-width: 450px;
    margin: 0 auto;
    background: var(--border-color);
  }

  .sudoku-cell {
    aspect-ratio: 1;
    background: var(--bg-glass);
    border: 1px solid var(--border-color);
    border-radius: 3px;
    text-align: center;
    font-family: var(--font-display);
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-primary);
    outline: none;
    cursor: text;
    transition: all 0.15s ease;
    width: 100%;
    padding: 0;
    caret-color: var(--accent-cyan);
  }

  .sudoku-cell:focus {
    border-color: var(--accent-cyan);
    background: rgba(6,182,212,0.08);
    box-shadow: inset 0 0 0 1px var(--accent-cyan);
    z-index: 1;
  }

  .sudoku-cell.cell-given {
    background: rgba(139,92,246,0.08) !important;
    color: var(--accent-purple) !important;
    cursor: default;
    font-weight: 800;
  }

  .sudoku-cell.cell-focus {
    border-color: var(--accent-cyan) !important;
    background: rgba(6,182,212,0.1) !important;
  }

  .sudoku-cell.cell-related {
    background: rgba(6,182,212,0.04) !important;
  }

  .sudoku-cell.cell-solving {
    background: rgba(6,182,212,0.15) !important;
    border-color: rgba(6,182,212,0.4) !important;
    color: var(--accent-cyan) !important;
  }

  .sudoku-cell.cell-backtrack {
    background: rgba(239,68,68,0.1) !important;
    color: var(--accent-red) !important;
    border-color: rgba(239,68,68,0.3) !important;
    transition: all 0.05s ease;
  }

  .sudoku-cell.box-border-left { border-left: 2px solid var(--border-bright); }
  .sudoku-cell.box-border-top  { border-top: 2px solid var(--border-bright); }

  .sudoku-stats {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .stat-box {
    background: var(--bg-glass);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    padding: 0.6rem;
    text-align: center;
  }

  .stat-box .val {
    font-family: var(--font-display);
    font-size: 1.2rem;
    font-weight: 800;
    color: var(--accent-cyan);
  }

  .stat-box .lbl {
    font-family: var(--font-code);
    font-size: 0.6rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  @media (max-width: 480px) {
    .sudoku-cell { font-size: 0.85rem; }
    .sudoku-grid { max-width: 310px; }
  }

  .btn:disabled { cursor: not-allowed; }
  #btn-stop { display: none; }
`;
document.head.appendChild(sudokuStyle);

document.addEventListener('DOMContentLoaded', () => Sudoku.init());
