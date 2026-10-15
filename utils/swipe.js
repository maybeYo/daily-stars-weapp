// 根据触摸位移判断方向，位移太小视为点击
function swipeDir(dx, dy, threshold = 30) {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return ''
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left'
  return dy > 0 ? 'down' : 'up'
}

module.exports = { swipeDir }
