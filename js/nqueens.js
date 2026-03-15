/* ============================================
   N-QUEENS SOLVER - BACKTRACKING ALGORITHM
   With animated visualization
   ============================================ */

const NQueens = (() => {
  // ============ STATE ============
  let N = 8;
  let board = [];
  let solving = false;
  let stepDelay = 250;
  let stepCount = 0;
  let backtracks = 0;
  let solutions = [];
  let currentSolution = 0;

  // ============ BACKTRACKING ALGORITHM ============
  /**
   * N-Queens Backtracking:
   * 1. Try placing a queen in each column of the current row
   * 2. Check if placement is safe (no conflicts in row, col, diagonals)
   * 3. If safe: place queen and recurse to next row
   * 4. If recursion succeeds: found a solution
   * 5. If recursion fails: remove queen (backtrack) and try next column
   */

  function isSafe(board, row, col) {
    // Check column above
    for (let r = 0; r < row; r++) {
      if (board[r] === col) return false;
    }
    // Check upper-left diagonal
    for (let r = row - 1, c = col - 1; r >= 0 && c >= 0; r--, c--) {
      if (board[r] === c) return false;
    }
    // Check upper-right diagonal
    for (let r = row - 1, c = col + 1; r >= 0 && c < N; r--, c++) {
      if (board[r] === c) return false;
    }
    return true;
  }

  // Collect all solutions (non-animated)
  function findAllSolutions() {
    const allSolutions = [];
    const b = Array(N).fill(-1);

    function bt(row) {
      if (row === N) {
        allSolutions.push([...b]);
        return;
      }
      for (let col = 0; col < N; col++) {
        if (isSafe(b, row, col)) {
          b[row] = col;
          bt(row + 1);
          b[row] = -1;
        }
      }
    }

    bt(0);
    return allSolutions;
  }

  // Animated steps generator
  function collectSteps() {
    const steps = [];
    const b = Array(N).fill(-1);

    function bt(row) {
      if (row === N) {
        steps.push({ type: 'solution', board: [...b] });
        return true; // Stop at first solution
      }
      
      // Shuffle columns for random-looking solves
      const cols = Array.from({ length: N }, (_, i) => i).sort(() => Math.random() - 0.5);

      for (let i = 0; i < N; i++) {
        const col = cols[i];
        if (isSafe(b, row, col)) {
          b[row] = col;
          steps.push({ type: 'place', row, col, board: [...b] });

          if (bt(row + 1)) return true;

          b[row] = -1;
          steps.push({ type: 'remove', row, col, board: [...b] });
        } else {
          steps.push({ type: 'conflict', row, col, board: [...b] });
        }
      }
      return false;
    }

    bt(0);
    return steps;
  }

  // ============ UI ============
  function renderBoard(boardState, highlightRow = -1, conflictCell = null) {
    const container = document.getElementById('queens-board');
    if (!container) return;
    container.innerHTML = '';
    container.style.gridTemplateColumns = `repeat(${N}, 1fr)`;
    container.style.maxWidth = `${Math.min(N * 60, 500)}px`;

    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const cell = document.createElement('div');
        const isLight = (r + c) % 2 === 0;
        cell.className = `queens-cell ${isLight ? 'light' : 'dark'}`;

        const hasQueen = boardState[r] === c;
        const isConflict = conflictCell && conflictCell.r === r && conflictCell.c === c;
        const isHighlightRow = r === highlightRow;

        if (hasQueen) {
          cell.classList.add('has-queen');
          const queen = document.createElement('span');
          queen.className = 'queen-piece';
          queen.textContent = '♛';
          cell.appendChild(queen);

          // Check if this queen is threatened
          if (isConflict) cell.classList.add('queen-conflict');
        }

        if (isHighlightRow && !hasQueen) {
          cell.classList.add('row-highlight');
        }

        container.appendChild(cell);
      }
    }
  }

  async function animateSolve() {
    const steps = collectSteps();
    stepCount = 0;
    backtracks = 0;

    board = Array(N).fill(-1);
    renderBoard(board);

    for (let i = 0; i < steps.length && solving; i++) {
      const step = steps[i];
      stepCount++;

      if (step.type === 'place') {
        renderBoard(step.board, step.row);
        updateStatus(`Placing queen at row ${step.row + 1}, col ${step.col + 1}`, 'active');
      } else if (step.type === 'remove') {
        backtracks++;
        renderBoard(step.board, step.row);
        updateStatus(`Backtracking from row ${step.row + 1}...`, 'warning');
      } else if (step.type === 'conflict') {
        renderBoard(step.board, step.row, { r: step.row, c: step.col });
        updateStatus(`Conflict at row ${step.row + 1}, col ${step.col + 1}`, 'error');
      } else if (step.type === 'solution') {
        renderBoard(step.board);
        board = step.board;
        updateStatus(`✓ Solution found!`, 'success');
        window.AIPlayground?.Toast.show(`Solution found in ${stepCount} steps!`, 'success');
      }

      updateStats();

      await sleep(stepDelay);
    }

    solving = false;
    updateControlsState(false);
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function updateStatus(text, type = 'active') {
    const el = document.getElementById('queens-status');
    if (el) { el.textContent = text; el.className = `status-value ${type}`; }

    const logEl = document.getElementById('queens-log');
    if (logEl) {
      if (logEl.children[0] && logEl.children[0].textContent.includes('Status:')) logEl.innerHTML = '';
      const item = document.createElement('div');
      item.style.marginBottom = '2px';
      item.style.color = type === 'error' ? 'var(--accent-red)' : type === 'warning' ? 'var(--accent-orange)' : type === 'success' ? 'var(--accent-green)' : 'var(--text-secondary)';
      item.innerHTML = `<span style="color:var(--text-muted); font-size:0.65rem;">[${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}]</span> ${text}`;
      logEl.appendChild(item);
      logEl.scrollTop = logEl.scrollHeight;
    }
  }

  function updateStats() {
    const stepsEl = document.getElementById('queens-steps');
    const backEl  = document.getElementById('queens-backtracks');
    if (stepsEl) stepsEl.textContent = stepCount.toLocaleString();
    if (backEl)  backEl.textContent  = backtracks.toLocaleString();
  }

  function updateControlsState(active) {
    ['btn-solve-queens', 'btn-reset-queens'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.disabled = active; el.style.opacity = active ? '0.5' : '1'; }
    });
    const stop = document.getElementById('btn-stop-queens');
    if (stop) stop.style.display = active ? 'inline-flex' : 'none';
  }

  function showAllSolutions() {
    const all = findAllSolutions();
    solutions = all;
    currentSolution = 0;

    const countEl = document.getElementById('solutions-count');
    if (countEl) {
      countEl.textContent = all.length;
      countEl.classList.add('count-anim');
      setTimeout(() => countEl.classList.remove('count-anim'), 300);
    }

    if (all.length > 0) {
      renderBoard(all[0]);
      window.AIPlayground?.Toast.show(`Found ${all.length} solutions for ${N}-Queens!`, 'success');
    }

    const navEl = document.getElementById('solution-nav');
    if (navEl) navEl.style.display = all.length > 1 ? 'flex' : 'none';
    updateSolutionLabel();
  }

  function nextSolution() {
    if (solutions.length === 0) return;
    currentSolution = (currentSolution + 1) % solutions.length;
    renderBoard(solutions[currentSolution]);
    updateSolutionLabel();
  }

  function prevSolution() {
    if (solutions.length === 0) return;
    currentSolution = (currentSolution - 1 + solutions.length) % solutions.length;
    renderBoard(solutions[currentSolution]);
    updateSolutionLabel();
  }

  function updateSolutionLabel() {
    const el = document.getElementById('sol-index');
    if (el) el.textContent = `${currentSolution + 1} / ${solutions.length}`;
  }

  function reset() {
    solving = false;
    board = Array(N).fill(-1);
    solutions = [];
    stepCount = 0;
    backtracks = 0;
    renderBoard(board);
    updateStats();
    updateStatus('Ready', 'active');
    updateControlsState(false);

    const countEl = document.getElementById('solutions-count');
    if (countEl) countEl.textContent = '—';

    const navEl = document.getElementById('solution-nav');
    if (navEl) navEl.style.display = 'none';
  }

  // ============ INIT ============
  function init() {
    board = Array(N).fill(-1);
    renderBoard(board);

    document.getElementById('board-size')?.addEventListener('change', function() {
      N = parseInt(this.value);
      reset();
    });

    document.getElementById('btn-solve-queens')?.addEventListener('click', () => {
      solving = true;
      stepCount = 0;
      backtracks = 0;
      solutions = [];
      updateControlsState(true);
      updateStatus('Solving...', 'active');
      animateSolve();
    });

    document.getElementById('btn-all-solutions')?.addEventListener('click', () => {
      reset();
      setTimeout(showAllSolutions, 50);
    });

    document.getElementById('btn-stop-queens')?.addEventListener('click', () => {
      solving = false;
      updateControlsState(false);
      updateStatus('Stopped', 'warning');
    });

    document.getElementById('btn-reset-queens')?.addEventListener('click', () => {
      reset();
      const logEl = document.getElementById('queens-log');
      if (logEl) logEl.innerHTML = '<div style="color: var(--text-muted);">Status: Reset completed.</div>';
    });

    document.getElementById('queens-speed')?.addEventListener('input', function() {
      stepDelay = 501 - parseInt(this.value);
    });

    document.getElementById('btn-prev-sol')?.addEventListener('click', prevSolution);
    document.getElementById('btn-next-sol')?.addEventListener('click', nextSolution);
  }

  return { init, reset: reset };
})();

// ============ STYLES ============
const queensStyle = document.createElement('style');
queensStyle.textContent = `
  .queens-board {
    display: grid;
    gap: 2px;
    margin: 0 auto;
    border: 2px solid var(--border-bright);
    border-radius: var(--radius-sm);
    padding: 4px;
    background: var(--border-color);
  }

  .queens-cell {
    aspect-ratio: 1;
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.12s ease;
    position: relative;
  }

  .queens-cell.light { background: #1a3a5c; }
  .queens-cell.dark  { background: #0d1e2e; }

  .queens-cell.has-queen { background: rgba(6,182,212,0.15); }
  .queens-cell.queen-conflict { background: rgba(239,68,68,0.25) !important; }
  .queens-cell.row-highlight { background: rgba(6,182,212,0.05); }

  [data-theme="light"] .queens-cell.light { background: #d4e5f5; }
  [data-theme="light"] .queens-cell.dark  { background: #b8d0e8; }
  [data-theme="light"] .queens-cell.has-queen { background: rgba(6,182,212,0.2); }

  .queen-piece {
    font-size: 1.4rem;
    line-height: 1;
    animation: queenDrop 0.25s cubic-bezier(0.175,0.885,0.32,1.275) forwards;
    color: var(--accent-cyan);
    text-shadow: 0 0 10px rgba(6,182,212,0.5);
    user-select: none;
  }

  .queen-conflict .queen-piece {
    color: var(--accent-red);
    text-shadow: 0 0 10px rgba(239,68,68,0.5);
  }

  .solution-nav-wrap {
    display: flex;
    align-items: center;
    gap: 1rem;
    justify-content: center;
    margin-top: 1rem;
  }

  #solution-nav {
    display: none;
    align-items: center;
    gap: 0.5rem;
  }

  #btn-stop-queens { display: none; }

  @media (max-width: 480px) {
    .queen-piece { font-size: 1rem; }
  }
`;
document.head.appendChild(queensStyle);

document.addEventListener('DOMContentLoaded', () => NQueens.init());
