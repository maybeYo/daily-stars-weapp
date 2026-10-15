const test = require('node:test')
const assert = require('node:assert/strict')

const snake = require('../utils/snake')
const { swipeDir } = require('../utils/swipe')

const first = () => 0
const pts = list => list.map(([x, y]) => ({ x, y }))
const make = (body, extra) => Object.assign({ snake: pts(body), dir: 'right', queue: [], food: { x: 14, y: 14 }, score: 0, over: false }, extra)

test('newGame：长度 3 朝右，食物不在蛇身上', () => {
  const s = snake.newGame()
  assert.equal(s.snake.length, 3)
  assert.equal(s.dir, 'right')
  assert.ok(!s.snake.some(p => p.x === s.food.x && p.y === s.food.y))
})

test('step：没吃到就整体前进一格，长度不变', () => {
  const s = snake.step(make([[4, 7], [3, 7], [2, 7]]))
  assert.deepEqual(s.snake, pts([[5, 7], [4, 7], [3, 7]]))
  assert.equal(s.over, false)
})

test('step：吃到星星变长、加分，新星星落在空格', () => {
  const s = snake.step(make([[4, 7], [3, 7], [2, 7]], { food: { x: 5, y: 7 } }), first)
  assert.equal(s.snake.length, 4)
  assert.equal(s.score, 1)
  assert.deepEqual(s.food, { x: 0, y: 0 })
})

test('step：撞墙结束', () => {
  const s = snake.step(make([[14, 0], [13, 0], [12, 0]]))
  assert.equal(s.over, true)
  assert.equal(snake.step(s), s)
})

test('step：咬到自己结束，但可以紧跟尾巴走', () => {
  // 口字形，蛇头 (1,1) 向下走到 (1,2) 是身体
  const bite = make([[1, 1], [2, 1], [2, 2], [1, 2], [0, 2]], { dir: 'down' })
  assert.equal(snake.step(bite).over, true)
  // 长度 4 的环，下一步要进的格子正好是尾巴让开的位置
  const chase = make([[1, 1], [2, 1], [2, 2], [1, 2]], { dir: 'down' })
  assert.equal(snake.step(chase).over, false)
})

test('turn：不能直接掉头，连按两次都能生效', () => {
  let s = make([[4, 7], [3, 7], [2, 7]])
  assert.deepEqual(snake.turn(s, 'left').queue, [])
  s = snake.turn(snake.turn(s, 'up'), 'left')
  assert.deepEqual(s.queue, ['up', 'left'])
  assert.deepEqual(snake.turn(s, 'down').queue, ['up', 'left'])
  s = snake.step(s)
  assert.deepEqual(s.snake[0], { x: 4, y: 6 })
  s = snake.step(s)
  assert.deepEqual(s.snake[0], { x: 3, y: 6 })
  assert.equal(s.dir, 'left')
})

test('interval：越吃越快，有下限', () => {
  assert.equal(snake.interval(0), 180)
  assert.ok(snake.interval(10) < snake.interval(0))
  assert.equal(snake.interval(100), 80)
})

test('swipeDir：按主方向判断，位移太小忽略', () => {
  assert.equal(swipeDir(5, 10), '')
  assert.equal(swipeDir(80, 20), 'right')
  assert.equal(swipeDir(-80, 20), 'left')
  assert.equal(swipeDir(10, -60), 'up')
  assert.equal(swipeDir(10, 60), 'down')
})

const joystick = require('../utils/joystick')

test('joystick：死区内不算方向，按主轴判断', () => {
  const o = { x: 100, y: 100 }
  assert.equal(joystick.drag(o, { x: 105, y: 108 }).dir, '')
  assert.equal(joystick.drag(o, { x: 130, y: 110 }).dir, 'right')
  assert.equal(joystick.drag(o, { x: 90, y: 70 }).dir, 'up')
})

test('joystick：拖出半径后中心跟着手指走，反向不用拖回起点', () => {
  const o = { x: 100, y: 100 }
  const far = joystick.drag(o, { x: 300, y: 100 })
  assert.deepEqual(far.center, { x: 300 - joystick.RADIUS, y: 100 })
  assert.equal(far.dx, joystick.RADIUS)
  // 从远处往回拖一点就是向左
  assert.equal(joystick.drag(far.center, { x: 240, y: 100 }).dir, 'left')
})
