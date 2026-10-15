// 贪吃蛇规则参照经典版 (Google Snake)：
// 撞墙或撞到自己结束，不能直接掉头，吃一颗星 +1 分并变长，越吃越快。

const COLS = 15
const ROWS = 15

const VECTORS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
}

const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' }

function same(a, b) {
  return a.x === b.x && a.y === b.y
}

// 在蛇身以外的空格随机放食物；铺满了返回 null
function placeFood(snake, rand) {
  const free = []
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!snake.some(s => s.x === x && s.y === y)) free.push({ x, y })
    }
  }
  return free.length ? free[Math.floor(rand() * free.length)] : null
}

function newGame(rand = Math.random) {
  const y = Math.floor(ROWS / 2)
  // 蛇头在前，长度 3，朝右
  const snake = [{ x: 4, y }, { x: 3, y }, { x: 2, y }]
  return { snake, dir: 'right', queue: [], food: placeFood(snake, rand), score: 0, over: false }
}

// 记下转向，下一步再生效。最多缓存两次，快速连按「上、左」也不丢；
// 和当前（或上一个缓存的）方向相同或相反的忽略
function turn(state, dir) {
  if (!VECTORS[dir] || state.over) return state
  const last = state.queue.length ? state.queue[state.queue.length - 1] : state.dir
  if (dir === last || dir === OPPOSITE[last] || state.queue.length >= 2) return state
  return Object.assign({}, state, { queue: state.queue.concat(dir) })
}

// 走一步
function step(state, rand = Math.random) {
  if (state.over) return state
  const queue = state.queue.slice()
  const dir = queue.length ? queue.shift() : state.dir
  const v = VECTORS[dir]
  const head = { x: state.snake[0].x + v.x, y: state.snake[0].y + v.y }
  const eating = !!state.food && same(head, state.food)
  // 不吃的话尾巴会让开，所以可以紧跟着尾巴走
  const body = eating ? state.snake : state.snake.slice(0, -1)

  const hitWall = head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS
  if (hitWall || body.some(s => same(s, head))) {
    return Object.assign({}, state, { dir, queue, over: true })
  }

  const snake = [head].concat(body)
  if (!eating) return Object.assign({}, state, { snake, dir, queue })
  const food = placeFood(snake, rand)
  return { snake, dir, queue, food, score: state.score + 1, over: !food }
}

// 每步间隔（毫秒）：从 180 开始，每吃一颗快 4ms，最快 80
function interval(score) {
  return Math.max(80, 180 - score * 4)
}

module.exports = { COLS, ROWS, newGame, turn, step, interval }
