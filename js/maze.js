/* ============================================
   MAZE PATHFINDER - A* SEARCH ALGORITHM
   Heuristic: Manhattan Distance
   ============================================ */

const Maze = (() => {
  // ============ STATE ============
  let ROWS = 20, COLS = 30;
  let grid = [];
  let startCell = null, endCell = null;
  let drawMode = 'wall';   // wall | erase | start | end
  let isMouseDown = false;
  let solving = false;
  let animSpeed = 100; // ms
  let stats = { visited: 0, pathLen: 0, time: 0 };

  // Cell types
  const CELL = { EMPTY: 0, WALL: 1, START: 2, END: 3, VISITED: 4, OPEN: 5, PATH: 6 };
  const COLORS = {
    [CELL.EMPTY]:   '#0a1628',
    [CELL.WALL]:    '#1e3a5f',
    [CELL.START]:   '#10b981',
    [CELL.END]:     '#f59e0b',
    [CELL.VISITED]: '#1e4a6a',
    [CELL.OPEN]:    '#0e3a55',
    [CELL.PATH]:    '#06b6d4',
  };

  // ============ A* ALGORITHM ============
  /**
   * A* Search:
   * f(n) = g(n) + h(n)
   * g(n) = actual cost from start to n
   * h(n) = heuristic estimate from n to goal (Manhattan distance)
   *
   * Uses a min-heap (priority queue) for efficiency.
   * Explores lowest f(n) node first.
   */

  class MinHeap {
    constructor() { this.data = []; }

    push(item) {
      this.data.push(item);
      this._bubbleUp(this.data.length - 1);
    }

    pop() {
      const top = this.data[0];
      const last = this.data.pop();
      if (this.data.length > 0) {
        this.data[0] = last;
        this._sinkDown(0);
      }
      return top;
    }

    _bubbleUp(i) {
      while (i > 0) {
        const parent = Math.floor((i - 1) / 2);
        if (this.data[parent].f <= this.data[i].f) break;
        [this.data[parent], this.data[i]] = [this.data[i], this.data[parent]];
        i = parent;
      }
    }

    _sinkDown(i) {
      const n = this.data.length;
      while (true) {
        let min = i;
        const left = 2 * i + 1, right = 2 * i + 2;
        if (left < n && this.data[left].f < this.data[min].f) min = left;
        if (right < n && this.data[right].f < this.data[min].f) min = right;
        if (min === i) break;
        [this.data[min], this.data[i]] = [this.data[i], this.data[min]];
        i = min;
      }
    }

    get size() { return this.data.length; }
  }

  function heuristic(a, b) {
    // Manhattan distance
    return Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
  }

  function getNeighbors(r, c) {
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]]; // 4-directional
    return dirs
      .map(([dr, dc]) => ({ r: r + dr, c: c + dc }))
      .filter(n => n.r >= 0 && n.r < ROWS && n.c >= 0 && n.c < COLS
                && grid[n.r][n.c] !== CELL.WALL);
  }

  async function aStar() {
    if (!startCell || !endCell) {
      window.AIPlayground?.Toast.show('Set start and end points first!', 'warning');
      return;
    }

    const start = { r: startCell.r, c: startCell.c };
    const end   = { r: endCell.r, c: endCell.c };

    const gScore = {};
    const fScore = {};
    const cameFrom = {};
    const openSet  = new MinHeap();
    const closedSet = new Set();

    const key = (r, c) => `${r},${c}`;

    gScore[key(start.r, start.c)] = 0;
    fScore[key(start.r, start.c)] = heuristic(start, end);
    openSet.push({ r: start.r, c: start.c, f: fScore[key(start.r, start.c)] });

    const visitQueue = [];
    const pathQueue  = [];
    stats.visited = 0;
    const t0 = performance.now();

    while (openSet.size > 0 && solving) {
      const current = openSet.pop();
      const ck = key(current.r, current.c);

      if (closedSet.has(ck)) continue;
      closedSet.add(ck);

      // Mark visited (not start/end)
      if (grid[current.r][current.c] !== CELL.START && grid[current.r][current.c] !== CELL.END) {
        visitQueue.push({ r: current.r, c: current.c, type: CELL.VISITED });
        stats.visited++;
      }

      // Goal reached!
      if (current.r === end.r && current.c === end.c) {
        stats.time = Math.round(performance.now() - t0);

        // Reconstruct path
        let cur = ck;
        const path = [];
        while (cur && cur !== key(start.r, start.c)) {
          const [pr, pc] = cur.split(',').map(Number);
          path.unshift({ r: pr, c: pc });
          cur = cameFrom[cur];
        }
        stats.pathLen = path.length;

        // Animate
        await animateVisits(visitQueue);
        updateStatus(`Path found! Visualizing route...`, 'success');
        await animatePath(path);
        updateStats();
        updateStatus(`Solution path length: ${path.length}`, 'success');
        solving = false;
        updateControlsState(false);
        return;
      }

      // Explore neighbors
      for (const neighbor of getNeighbors(current.r, current.c)) {
        const nk = key(neighbor.r, neighbor.c);
        if (closedSet.has(nk)) continue;

        const tentativeG = (gScore[ck] || 0) + 1;

        if (tentativeG < (gScore[nk] ?? Infinity)) {
          cameFrom[nk] = ck;
          gScore[nk] = tentativeG;
          fScore[nk] = tentativeG + heuristic(neighbor, end);
          openSet.push({ r: neighbor.r, c: neighbor.c, f: fScore[nk] });

          // Mark open set
          if (grid[neighbor.r][neighbor.c] !== CELL.START && grid[neighbor.r][neighbor.c] !== CELL.END) {
            visitQueue.push({ r: neighbor.r, c: neighbor.c, type: CELL.OPEN });
          }
        }
      }
    }

    if (solving) {
      window.AIPlayground?.Toast.show('No path found!', 'error');
      await animateVisits(visitQueue);
    }
    solving = false;
    updateControlsState(false);
    updateStats();
  }

  // ============ CANVAS RENDERING ============
  let canvas, ctx;
  let CELL_W, CELL_H;

  function initCanvas() {
    canvas = document.getElementById('maze-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resizeCanvas();
  }

  function resizeCanvas() {
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container || container.clientWidth < 50) return; // Ignore if hidden or collapsing
    const maxW = Math.min(container.clientWidth - 4, 900);
    CELL_W = Math.floor(maxW / COLS);
    CELL_H = CELL_W;
    canvas.width  = CELL_W * COLS;
    canvas.height = CELL_H * ROWS;
    drawGrid();
  }

  function drawGrid() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        drawCell(r, c, grid[r][c]);
      }
    }
  }

  function drawCell(r, c, type) {
    if (!ctx) return;
    const x = c * CELL_W, y = r * CELL_H;
    const pad = 1;

    // Background
    ctx.fillStyle = COLORS[type] || COLORS[CELL.EMPTY];
    ctx.fillRect(x + pad, y + pad, CELL_W - pad * 2, CELL_H - pad * 2);

    // Special markers
    if (type === CELL.START) {
      ctx.fillStyle = '#10b981';
      drawHexagon(ctx, x + CELL_W/2, y + CELL_H/2, CELL_W/2 - 3);
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${CELL_W * 0.45}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('S', x + CELL_W/2, y + CELL_H/2);
    } else if (type === CELL.END) {
      ctx.fillStyle = '#f59e0b';
      drawHexagon(ctx, x + CELL_W/2, y + CELL_H/2, CELL_W/2 - 3);
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${CELL_W * 0.45}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('E', x + CELL_W/2, y + CELL_H/2);
    } else if (type === CELL.PATH) {
      ctx.fillStyle = '#06b6d4';
      const r2 = CELL_W * 0.3;
      ctx.beginPath();
      ctx.arc(x + CELL_W/2, y + CELL_H/2, r2, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === CELL.VISITED) {
      ctx.fillStyle = 'rgba(6, 52, 110, 0.9)';
      ctx.fillRect(x + pad, y + pad, CELL_W - pad * 2, CELL_H - pad * 2);
    } else if (type === CELL.OPEN) {
      ctx.fillStyle = 'rgba(8, 70, 120, 0.7)';
      ctx.fillRect(x + pad, y + pad, CELL_W - pad * 2, CELL_H - pad * 2);
    } else if (type === CELL.WALL) {
      ctx.fillStyle = '#1e3a5f';
      ctx.fillRect(x, y, CELL_W, CELL_H);
      // Subtle highlight
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ctx.fillRect(x, y, CELL_W, 1);
    }
  }

  function drawHexagon(ctx, cx, cy, r) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  // ============ ANIMATION ============
  async function animateVisits(queue) {
    let i = 0;
    const batchSize = Math.max(1, Math.floor(500 / animSpeed));

    return new Promise(resolve => {
      const step = () => {
        if (!solving && i < queue.length) {
          resolve();
          return;
        }

        for (let b = 0; b < batchSize && i < queue.length; b++, i++) {
          const { r, c, type } = queue[i];
          if (b === 0) {
            updateStatus(`Exploring node (${r}, ${c})`);
          }
          if (grid[r][c] !== CELL.START && grid[r][c] !== CELL.END) {
            grid[r][c] = type;
            drawCell(r, c, type);
          }
        }

        updateStats();

        if (i < queue.length) {
          setTimeout(step, animSpeed);
        } else {
          resolve();
        }
      };
      step();
    });
  }

  async function animatePath(path) {
    return new Promise(resolve => {
      let i = 0;
      const step = () => {
        if (!solving) { resolve(); return; } // Stop drawing if solving-stop was clicked
        if (i >= path.length) { resolve(); return; }
        const { r, c } = path[i++];
        if (i % 2 === 0) { updateStatus(`Tracing route node (${r}, ${c})`); }
        if (grid[r][c] !== CELL.START && grid[r][c] !== CELL.END) {
          grid[r][c] = CELL.PATH;
          drawCell(r, c, CELL.PATH);
        }
        setTimeout(step, animSpeed * 1.5);
      };
      step();
    });
  }

  // ============ GRID INTERACTION ============
  function getCellFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top)  * scaleY;
    const c = Math.floor(x / CELL_W);
    const r = Math.floor(y / CELL_H);
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) return { r, c };
    return null;
  }

  function paintCell(r, c) {
    if (drawMode === 'start') {
      // Remove old start
      if (startCell) { grid[startCell.r][startCell.c] = CELL.EMPTY; drawCell(startCell.r, startCell.c, CELL.EMPTY); }
      startCell = { r, c };
      grid[r][c] = CELL.START;
    } else if (drawMode === 'end') {
      if (endCell) { grid[endCell.r][endCell.c] = CELL.EMPTY; drawCell(endCell.r, endCell.c, CELL.EMPTY); }
      endCell = { r, c };
      grid[r][c] = CELL.END;
    } else if (drawMode === 'wall') {
      if (grid[r][c] === CELL.START || grid[r][c] === CELL.END) return;
      grid[r][c] = CELL.WALL;
    } else if (drawMode === 'erase') {
      if (grid[r][c] === CELL.START) startCell = null;
      if (grid[r][c] === CELL.END)   endCell = null;
      grid[r][c] = CELL.EMPTY;
    }
    drawCell(r, c, grid[r][c]);
  }

  function initCanvasEvents() {
    canvas.addEventListener('mousedown', e => {
      isMouseDown = true;
      const cell = getCellFromEvent(e);
      if (cell) paintCell(cell.r, cell.c);
    });

    canvas.addEventListener('mousemove', e => {
      if (!isMouseDown) return;
      if (drawMode === 'start' || drawMode === 'end') return;
      const cell = getCellFromEvent(e);
      if (cell) paintCell(cell.r, cell.c);
    });

    canvas.addEventListener('mouseup',   () => isMouseDown = false);
    canvas.addEventListener('mouseleave',() => isMouseDown = false);

    // Touch support
    canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      isMouseDown = true;
      const cell = getCellFromEvent(e.touches[0]);
      if (cell) paintCell(cell.r, cell.c);
    });

    canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      if (!isMouseDown || drawMode === 'start' || drawMode === 'end') return;
      const cell = getCellFromEvent(e.touches[0]);
      if (cell) paintCell(cell.r, cell.c);
    });

    canvas.addEventListener('touchend', () => isMouseDown = false);
  }

  // ============ MAZE GENERATORS ============
  function generateMaze() {
    initGridData();
    startCell = endCell = null;

    // Recursive division-like random DFS maze
    const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));

    // Fill all with walls
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        grid[r][c] = CELL.WALL;

    function carve(r, c) {
      visited[r][c] = true;
      grid[r][c] = CELL.EMPTY;
      const dirs = [[-2,0],[2,0],[0,-2],[0,2]].sort(() => Math.random() - 0.5);
      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !visited[nr][nc]) {
          grid[r + dr/2][c + dc/2] = CELL.EMPTY;
          carve(nr, nc);
        }
      }
    }

    carve(1, 1);

    // Set start/end
    startCell = { r: 1, c: 1 };
    endCell = { r: ROWS - 2, c: COLS - 2 };
    grid[1][1] = CELL.START;
    grid[ROWS-2][COLS-2] = CELL.END;

    drawGrid();
    // Removed Toast to avoid leaking messages onto other game views on load
  }

  function initGridData() {
    grid = Array.from({ length: ROWS }, () => Array(COLS).fill(CELL.EMPTY));
  }

  function clearPath() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] === CELL.VISITED || grid[r][c] === CELL.OPEN || grid[r][c] === CELL.PATH) {
          grid[r][c] = CELL.EMPTY;
        }
      }
    }
    drawGrid();
  }

  function resetAll() {
    initGridData();
    startCell = endCell = null;
    drawGrid();
    stats = { visited: 0, pathLen: 0, time: 0 };
    updateStats();
  }

  // ============ UI ============
  function updateStats() {
    const vEl = document.getElementById('maze-visited');
    const pEl = document.getElementById('maze-pathlen');
    const tEl = document.getElementById('maze-time');
    if (vEl) vEl.textContent = stats.visited;
    if (pEl) pEl.textContent = stats.pathLen || '—';
    if (tEl) tEl.textContent = stats.time ? `${stats.time}ms` : '—';
  }

  function updateStatus(text, type = 'active') {
    const el = document.getElementById('maze-status-text');
    if (el) { el.textContent = text; }

    const logEl = document.getElementById('maze-log');
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

  function updateControlsState(active) {
    ['btn-solve-maze', 'btn-gen-maze', 'btn-clear-maze', 'btn-reset-maze'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.disabled = active; el.style.opacity = active ? '0.5' : '1'; }
    });
    const stop = document.getElementById('btn-stop-maze');
    if (stop) stop.style.display = active ? 'inline-flex' : 'none';
  }

  // ============ INIT ============
  function init() {
    initCanvas();
    initGridData();
    initCanvasEvents();
    generateMaze();

    // Tool buttons
    ['wall', 'erase', 'start', 'end'].forEach(mode => {
      document.getElementById(`tool-${mode}`)?.addEventListener('click', function() {
        drawMode = mode;
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
      });
    });

    document.getElementById('btn-solve-maze')?.addEventListener('click', () => {
      clearPath();
      solving = true;
      stats = { visited: 0, pathLen: 0, time: 0 };
      updateControlsState(true);
      updateStatus('A* solve started...');
      aStar();
    });

    document.getElementById('btn-stop-maze')?.addEventListener('click', () => {
      solving = false;
      updateControlsState(false);
      updateStatus('Solve stopped by user', 'warning');
    });

    document.getElementById('btn-gen-maze')?.addEventListener('click', () => {
      generateMaze();
      updateStatus('New random maze generated.');
    });
    document.getElementById('btn-clear-maze')?.addEventListener('click', clearPath);
    document.getElementById('btn-reset-maze')?.addEventListener('click', () => {
      resetAll();
      const logEl = document.getElementById('maze-log');
      if (logEl) logEl.innerHTML = '<div style="color: var(--text-muted);">Status: Reset completed.</div>';
    });

    document.getElementById('maze-speed')?.addEventListener('input', function() {
      animSpeed = 201 - parseInt(this.value);
    });

    document.getElementById('maze-size')?.addEventListener('change', function() {
      const sizes = { small: [15,20], medium: [20,30], large: [25,40] };
      const [r, c] = sizes[this.value] || [20,30];
      ROWS = r; COLS = c;
      resizeCanvas();
      generateMaze();
    });

    window.addEventListener('resize', () => {
      resizeCanvas();
      drawGrid();
    });
  }

  return { init, reset: resetAll };
})();

// ============ STYLES ============
const mazeStyle = document.createElement('style');
mazeStyle.textContent = `
  #maze-canvas {
    display: block;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    cursor: crosshair;
    max-width: 100%;
    background: #050a0e;
  }

  .tool-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    background: var(--bg-glass);
    color: var(--text-secondary);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .tool-btn.active {
    border-color: var(--accent-cyan);
    color: var(--accent-cyan);
    background: rgba(6,182,212,0.1);
    box-shadow: 0 0 12px rgba(6,182,212,0.15);
  }

  .tool-btn:hover:not(.active) { border-color: var(--border-bright); color: var(--text-primary); }

  .legend-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .legend-dot {
    width: 14px;
    height: 14px;
    border-radius: 3px;
    flex-shrink: 0;
  }

  #btn-stop-maze { display: none; }
`;
document.head.appendChild(mazeStyle);

document.addEventListener('DOMContentLoaded', () => Maze.init());
