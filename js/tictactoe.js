/* ============================================
   TIC TAC TOE - MINIMAX + ALPHA-BETA PRUNING
   ============================================ */

const TicTacToe = (() => {
  // ============ STATE ============
  let board = Array(9).fill(null);
  let currentPlayer = 'X';
  let gameMode = 'pvai'; // pvp | pvai
  let aiSymbol = 'O';
  let humanSymbol = 'X';
  let gameOver = false;
  let nodesEvaluated = 0;
  let scores = { X: 0, O: 0, draws: 0 };
  let moveHistory = [];

  const WIN_COMBOS = [
    [0,1,2],[3,4,5],[6,7,8], // rows
    [0,3,6],[1,4,7],[2,5,8], // cols
    [0,4,8],[2,4,6]          // diags
  ];

  // ============ MINIMAX WITH ALPHA-BETA ============
  /**
   * Minimax algorithm with Alpha-Beta Pruning.
   * - Returns score: +10 (AI wins), -10 (human wins), 0 (draw)
   * - Alpha: best score for maximizer (AI)
   * - Beta:  best score for minimizer (human)
   * - Prunes branches where alpha >= beta
   */
  function minimax(board, depth, isMaximizing, alpha, beta) {
    nodesEvaluated++;

    const winner = checkWinner(board);
    if (winner === aiSymbol)   return 10 - depth;  // AI wins (sooner = better)
    if (winner === humanSymbol) return depth - 10; // Human wins
    if (board.every(cell => cell !== null)) return 0; // Draw

    if (isMaximizing) {
      let maxScore = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
          board[i] = aiSymbol;
          const score = minimax(board, depth + 1, false, alpha, beta);
          board[i] = null;
          maxScore = Math.max(maxScore, score);
          alpha = Math.max(alpha, score);
          if (beta <= alpha) break; // Beta cutoff - prune!
        }
      }
      return maxScore;
    } else {
      let minScore = Infinity;
      for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
          board[i] = humanSymbol;
          const score = minimax(board, depth + 1, true, alpha, beta);
          board[i] = null;
          minScore = Math.min(minScore, score);
          beta = Math.min(beta, score);
          if (beta <= alpha) break; // Alpha cutoff - prune!
        }
      }
      return minScore;
    }
  }

  function getBestMove(board) {
    nodesEvaluated = 0;
    let bestScore = -Infinity;
    let bestMove = null;

    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = aiSymbol;
        const score = minimax(board, 0, false, -Infinity, Infinity);
        board[i] = null;
        if (score > bestScore) {
          bestScore = score;
          bestMove = i;
        }
      }
    }
    return bestMove;
  }

  // ============ GAME LOGIC ============
  function checkWinner(b) {
    for (const [a, c, d] of WIN_COMBOS) {
      if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
    }
    return null;
  }

  function getWinCombo(b) {
    for (const combo of WIN_COMBOS) {
      const [a, c, d] = combo;
      if (b[a] && b[a] === b[c] && b[a] === b[d]) return combo;
    }
    return null;
  }

  function isDraw(b) { return b.every(c => c !== null) && !checkWinner(b); }

  // ============ UI ============
  function initBoard() {
    const container = document.getElementById('ttt-board');
    if (!container) return;
    container.innerHTML = '';

    board.forEach((cell, i) => {
      const cellEl = document.createElement('div');
      cellEl.className = 'ttt-cell';
      cellEl.dataset.index = i;

      if (cell) {
        cellEl.textContent = cell;
        cellEl.classList.add('taken', `cell-${cell}`);
      }

      cellEl.addEventListener('click', () => onCellClick(i));
      cellEl.addEventListener('mouseenter', () => onCellHover(i, true));
      cellEl.addEventListener('mouseleave', () => onCellHover(i, false));
      container.appendChild(cellEl);
    });
  }

  function onCellHover(index, entering) {
    if (gameOver || board[index] !== null) return;
    if (gameMode === 'pvai' && currentPlayer === aiSymbol) return;

    const cell = document.querySelector(`[data-index="${index}"]`);
    if (!cell) return;
    cell.classList.toggle('hover-preview', entering);
    cell.dataset.preview = entering ? currentPlayer : '';
  }

  function onCellClick(index) {
    if (gameOver || board[index] !== null) return;
    if (gameMode === 'pvai' && currentPlayer === aiSymbol) return;

    makeMove(index, currentPlayer);
  }

  function makeMove(index, player) {
    board[index] = player;
    moveHistory.push(index);
    updateCell(index, player);
    checkGameState();

    if (!gameOver && gameMode === 'pvai' && currentPlayer === aiSymbol) {
      scheduleAIMove();
    }
  }

  function updateCell(index, player) {
    const cell = document.querySelector(`[data-index="${index}"]`);
    if (!cell) return;
    cell.textContent = player;
    cell.classList.add('taken', `cell-${player}`);
    cell.classList.remove('hover-preview');
  }

  function checkGameState() {
    const winner = checkWinner(board);

    if (winner) {
      const combo = getWinCombo(board);
      highlightWinner(combo);
      gameOver = true;
      scores[winner]++;
      updateScores();
      setTimeout(() => {
        window.AIPlayground?.Toast.show(
          winner === humanSymbol ? '🎉 You win!' : '🤖 AI wins!',
          winner === humanSymbol ? 'success' : 'error'
        );
      }, 300);
      updateStatus(`${winner === 'X' ? '✕' : '○'} ${winner} wins!`, winner === humanSymbol ? 'success' : 'error');
      updateStatsDisplay();
      return;
    }

    if (isDraw(board)) {
      gameOver = true;
      scores.draws++;
      updateScores();
      document.getElementById('ttt-board')?.classList.add('board-shake');
      setTimeout(() => {
        document.getElementById('ttt-board')?.classList.remove('board-shake');
        window.AIPlayground?.Toast.show("It's a draw!", 'warning');
      }, 400);
      updateStatus("Draw! 🤝", 'warning');
      updateStatsDisplay();
      return;
    }

    // Switch player
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    updateStatus(`${currentPlayer === 'X' ? '✕' : '○'} ${currentPlayer}'s turn`, 'active');
  }

  function highlightWinner(combo) {
    combo?.forEach(i => {
      const cell = document.querySelector(`[data-index="${i}"]`);
      cell?.classList.add('win-cell');
    });
  }

  function scheduleAIMove() {
    showThinking(true);
    updateStatus('🤖 AI thinking...', 'thinking');

    setTimeout(() => {
      const move = getBestMove([...board]);
      showThinking(false);
      if (move !== null) makeMove(move, aiSymbol);
      updateStatsDisplay();
    }, 400 + Math.random() * 200);
  }

  function showThinking(show) {
    const overlay = document.getElementById('thinking-overlay');
    overlay?.classList.toggle('show', show);
  }

  function updateStatus(text, type = 'active') {
    const el = document.getElementById('ttt-status');
    if (!el) return;
    el.textContent = text;
    el.className = `status-value ${type}`;
  }

  function updateScores() {
    const xEl = document.getElementById('score-x');
    const oEl = document.getElementById('score-o');
    const dEl = document.getElementById('score-draw');
    if (xEl) { xEl.textContent = scores.X; xEl.classList.add('count-anim'); setTimeout(() => xEl.classList.remove('count-anim'), 300); }
    if (oEl) { oEl.textContent = scores.O; oEl.classList.add('count-anim'); setTimeout(() => oEl.classList.remove('count-anim'), 300); }
    if (dEl) { dEl.textContent = scores.draws; }
  }

  function updateStatsDisplay() {
    const nodesEl = document.getElementById('nodes-eval');
    const depthEl = document.getElementById('tree-depth');
    if (nodesEl) nodesEl.textContent = nodesEvaluated.toLocaleString();
    const movesLeft = board.filter(c => c === null).length;
    if (depthEl) depthEl.textContent = 9 - movesLeft;
  }

  // ============ CONTROLS ============
  function resetGame() {
    board = Array(9).fill(null);
    currentPlayer = 'X';
    gameOver = false;
    nodesEvaluated = 0;
    moveHistory = [];
    initBoard();
    updateStatus("✕ X's turn", 'active');
    updateStatsDisplay();
    showThinking(false);
    const statsEl = document.getElementById('nodes-eval');
    if (statsEl) statsEl.textContent = '—';
  }

  function undoMove() {
    if (moveHistory.length === 0) return;

    // Undo AI move too if PvAI
    if (gameMode === 'pvai' && moveHistory.length >= 2) {
      const last2 = [moveHistory.pop(), moveHistory.pop()];
      last2.forEach(i => { board[i] = null; });
      currentPlayer = humanSymbol;
    } else if (gameMode === 'pvp') {
      const last = moveHistory.pop();
      board[last] = null;
      currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    }

    gameOver = false;
    initBoard();
    updateStatus(`${currentPlayer === 'X' ? '✕' : '○'} ${currentPlayer}'s turn`, 'active');
  }

  // ============ INIT ============
  function init() {
    resetGame();

    // Mode buttons
    document.getElementById('mode-pvp')?.addEventListener('click', () => {
      gameMode = 'pvp';
      resetGame();
      document.getElementById('ai-settings')?.classList.add('hidden');
      window.AIPlayground?.Toast.show('Player vs Player mode', 'info');
    });

    document.getElementById('mode-pvai')?.addEventListener('click', () => {
      gameMode = 'pvai';
      resetGame();
      document.getElementById('ai-settings')?.classList.remove('hidden');
      window.AIPlayground?.Toast.show('Player vs AI mode', 'info');
    });

    document.getElementById('btn-reset')?.addEventListener('click', resetGame);
    document.getElementById('btn-undo')?.addEventListener('click', undoMove);

    // Side selector
    document.getElementById('play-as')?.addEventListener('change', function() {
      humanSymbol = this.value;
      aiSymbol = humanSymbol === 'X' ? 'O' : 'X';
      resetGame();
      if (gameMode === 'pvai' && currentPlayer === aiSymbol) {
        setTimeout(() => scheduleAIMove(), 500);
      }
    });
  }

  return { init, reset: resetGame };
})();

// ============ GAME-SPECIFIC STYLES (injected) ============
const style = document.createElement('style');
style.textContent = `
  .ttt-board {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    max-width: 360px;
    margin: 0 auto;
    position: relative;
  }

  .ttt-cell {
    aspect-ratio: 1;
    background: var(--bg-glass);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-size: 2.5rem;
    font-weight: 800;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    overflow: hidden;
    user-select: none;
  }

  .ttt-cell:hover:not(.taken) {
    border-color: var(--border-bright);
    background: rgba(6, 182, 212, 0.06);
    transform: scale(1.02);
  }

  .ttt-cell.taken { cursor: default; }

  .ttt-cell.cell-X { color: var(--accent-cyan); }
  .ttt-cell.cell-O { color: var(--accent-purple); }

  .ttt-cell.hover-preview::after {
    content: attr(data-preview);
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-size: 2.5rem;
    font-weight: 800;
    opacity: 0.25;
    color: var(--accent-cyan);
  }

  .ttt-cell.win-cell {
    background: rgba(16, 185, 129, 0.1) !important;
    border-color: var(--accent-green) !important;
  }

  .board-wrap { position: relative; }

  #thinking-overlay {
    border-radius: var(--radius-md);
  }

  .ai-stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    margin-top: 1rem;
  }

  .ai-stat-box {
    background: var(--bg-glass);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    padding: 0.75rem;
    text-align: center;
  }

  .ai-stat-val {
    font-family: var(--font-display);
    font-size: 1.4rem;
    font-weight: 800;
    color: var(--accent-cyan);
    line-height: 1;
  }

  .ai-stat-label {
    font-family: var(--font-code);
    font-size: 0.65rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-top: 4px;
  }

  .hidden { display: none !important; }

  @media (max-width: 480px) {
    .ttt-cell { font-size: 1.8rem; }
    .ttt-board { max-width: 280px; }
  }
`;
document.head.appendChild(style);

// Auto-init
document.addEventListener('DOMContentLoaded', () => TicTacToe.init());
