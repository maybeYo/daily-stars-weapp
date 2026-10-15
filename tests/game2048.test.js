const test = require('node:test')
const assert = require('node:assert/strict')

const game = require('../utils/game2048')

// 由数字矩阵造棋盘，0 表示空
function make(rows) {
  let id = 1
  const grid = rows.map(row => row.map(v => (v ? { id: id++, value: v } : null)))
  return { grid, score: 0, nextId: id, won: false }
}

const values = grid => grid.map(row => row.map(t => (t ? t.value : 0)))
// 固定随机数：总是放在第一个空位，且出 2
const first = () => 0

test('newGame：开局两块', () => {
  const s = game.newGame()
  assert.equal(game.tiles(s.grid).length, 2)
  game.tiles(s.grid).forEach(t => assert.ok(t.value === 2 || t.value === 4))
})

test('move：同一次滑动每块最多合并一次', () => {
  const res = game.move(make([
    [2, 2, 2, 2],
    [4, 4, 8, 0],
    [2, 0, 0, 2],
    [0, 0, 0, 0]
  ]), 'left', first)
  assert.equal(res.moved, true)
  // (0,2) 是第一个空位，新出的 2 落在那里
  assert.deepEqual(values(res.state.grid), [
    [4, 4, 2, 0],
    [8, 8, 0, 0],
    [4, 0, 0, 0],
    [0, 0, 0, 0]
  ])
  assert.equal(res.gained, 4 + 4 + 8 + 4)
  assert.equal(res.state.score, 20)
  assert.equal(res.state.grid[0][2].isNew, true)
})

test('move：靠近滑动方向的一侧先合并', () => {
  const res = game.move(make([
    [2, 0, 0, 0],
    [2, 0, 0, 0],
    [2, 0, 0, 0],
    [0, 0, 0, 0]
  ]), 'down', first)
  // 底下两块合成 4，最上面那块落到它上方；新块出在 (0,0)
  assert.deepEqual(values(res.state.grid).map(r => r[0]), [2, 0, 2, 4])
  assert.equal(res.state.grid[0][0].isNew, true)
})

test('move：没有块能动时不算一步，不出新块', () => {
  const s = make([
    [2, 4, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ])
  const res = game.move(s, 'left', first)
  assert.equal(res.moved, false)
  assert.equal(res.state, s)
})

test('move：合出 2048 时 justWon 只触发一次', () => {
  const res = game.move(make([
    [1024, 1024, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ]), 'right', first)
  assert.equal(res.justWon, true)
  assert.equal(res.state.won, true)
  const again = game.move(res.state, 'left', first)
  assert.equal(again.justWon, false)
})

test('canMove：满盘但有相邻同数仍可走', () => {
  assert.equal(game.canMove(make([
    [2, 4, 2, 4],
    [4, 2, 4, 2],
    [2, 4, 2, 4],
    [4, 2, 4, 2]
  ]).grid), false)
  assert.equal(game.canMove(make([
    [2, 4, 2, 4],
    [4, 2, 4, 2],
    [2, 4, 2, 4],
    [4, 2, 4, 4]
  ]).grid), true)
})

test('swipeDir：按主方向判断，位移太小忽略', () => {
  assert.equal(game.swipeDir(5, 10), '')
  assert.equal(game.swipeDir(80, 20), 'right')
  assert.equal(game.swipeDir(-80, 20), 'left')
  assert.equal(game.swipeDir(10, -60), 'up')
  assert.equal(game.swipeDir(10, 60), 'down')
})
