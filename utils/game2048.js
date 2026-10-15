// 2048 规则参照原版 (gabrielecirulli/2048)：
// 4x4 棋盘，每次滑动后随机出一块（90% 是 2，10% 是 4），
// 同一次滑动里每块最多合并一次，合出 2048 算赢，可以继续玩。

const SIZE = 4
const WIN_VALUE = 2048

// 方向 -> 行列增量
const VECTORS = {
  up: { r: -1, c: 0 },
  down: { r: 1, c: 0 },
  left: { r: 0, c: -1 },
  right: { r: 0, c: 1 }
}

function emptyGrid() {
  const grid = []
  for (let r = 0; r < SIZE; r++) grid.push([null, null, null, null])
  return grid
}

function emptyCells(grid) {
  const cells = []
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!grid[r][c]) cells.push({ r, c })
    }
  }
  return cells
}

// 在空位随机放一块，返回新棋盘；没空位就原样返回
function spawn(state, rand) {
  const cells = emptyCells(state.grid)
  if (!cells.length) return state
  const pos = cells[Math.floor(rand() * cells.length)]
  const grid = state.grid.map(row => row.slice())
  grid[pos.r][pos.c] = { id: state.nextId, value: rand() < 0.9 ? 2 : 4, isNew: true }
  return Object.assign({}, state, { grid, nextId: state.nextId + 1 })
}

function newGame(rand = Math.random) {
  let state = { grid: emptyGrid(), score: 0, nextId: 1, won: false }
  state = spawn(state, rand)
  state = spawn(state, rand)
  return state
}

// 遍历顺序：朝哪个方向滑，就从那一侧开始处理
function order(delta) {
  const idx = [0, 1, 2, 3]
  return delta === 1 ? idx.reverse() : idx
}

function inside(r, c) {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE
}

// 滑动一次。没有任何块移动时 moved 为 false，状态不变也不出新块
function move(state, dir, rand = Math.random) {
  const v = VECTORS[dir]
  const grid = state.grid.map(row => row.map(t => (t ? { id: t.id, value: t.value } : null)))
  const mergedAt = {}
  let score = state.score
  let gained = 0
  let moved = false
  let won = state.won

  order(v.r).forEach(r => {
    order(v.c).forEach(c => {
      const tile = grid[r][c]
      if (!tile) return
      let nr = r
      let nc = c
      while (inside(nr + v.r, nc + v.c) && !grid[nr + v.r][nc + v.c]) {
        nr += v.r
        nc += v.c
      }
      const tr = nr + v.r
      const tc = nc + v.c
      const target = inside(tr, tc) ? grid[tr][tc] : null
      grid[r][c] = null
      if (target && target.value === tile.value && !mergedAt[tr + ',' + tc]) {
        const value = tile.value * 2
        grid[tr][tc] = { id: tile.id, value, merged: true }
        mergedAt[tr + ',' + tc] = true
        score += value
        gained += value
        if (value === WIN_VALUE) won = true
        moved = true
      } else {
        grid[nr][nc] = tile
        if (nr !== r || nc !== c) moved = true
      }
    })
  })

  if (!moved) return { moved: false, gained: 0, justWon: false, state }
  const next = spawn(Object.assign({}, state, { grid, score, won }), rand)
  return { moved: true, gained, justWon: won && !state.won, state: next }
}

function canMove(grid) {
  if (emptyCells(grid).length) return true
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = grid[r][c].value
      if (c + 1 < SIZE && grid[r][c + 1].value === v) return true
      if (r + 1 < SIZE && grid[r + 1][c].value === v) return true
    }
  }
  return false
}

// 摊平成渲染用的列表，按 id 排序保证 wx:key 稳定、滑动有过渡
function tiles(grid) {
  const list = []
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const t = grid[r][c]
      if (t) list.push({ id: t.id, value: t.value, r, c, isNew: !!t.isNew, merged: !!t.merged })
    }
  }
  return list.sort((a, b) => a.id - b.id)
}

// 根据触摸位移判断方向，位移太小视为点击
function swipeDir(dx, dy, threshold = 30) {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return ''
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left'
  return dy > 0 ? 'down' : 'up'
}

module.exports = { SIZE, WIN_VALUE, newGame, move, canMove, tiles, swipeDir }
