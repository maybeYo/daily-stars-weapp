// 浮动摇杆：手指按下的位置就是摇杆中心，拖动时按偏移判断方向。
// 手指拖出半径后中心跟着手指走，想反向时不用先拖回起点。

const RADIUS = 40 // 摇杆可拖动半径（px）
const DEAD = 14 // 偏移小于这个值不算方向

// origin: 摇杆中心；point: 手指位置。返回新的中心、小圆点偏移和方向
function drag(origin, point) {
  let dx = point.x - origin.x
  let dy = point.y - origin.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  let center = origin
  if (dist > RADIUS) {
    const k = RADIUS / dist
    center = { x: point.x - dx * k, y: point.y - dy * k }
    dx *= k
    dy *= k
  }
  let dir = ''
  if (dist >= DEAD) {
    dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')
  }
  return { center, dx, dy, dir }
}

module.exports = { RADIUS, DEAD, drag }
