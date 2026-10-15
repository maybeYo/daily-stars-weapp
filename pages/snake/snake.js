const snake = require('../../utils/snake')
const joystick = require('../../utils/joystick')

const BEST_KEY = 'snake_best'

// status: ready 未开始 / playing / paused / over
Page({
  data: {
    snake: [],
    food: null,
    score: 0,
    best: 0,
    status: 'ready',
    newBest: false,
    joy: null
  },

  onLoad() {
    this.best = wx.getStorageSync(BEST_KEY) || 0
    this.reset()
  },

  onHide() {
    this.pause()
  },

  onUnload() {
    this.stop()
  },

  reset() {
    this.stop()
    this.state = snake.newGame()
    this.setData({ status: 'ready', newBest: false, best: this.best })
    this.render()
  },

  render() {
    // 按位置编号做 wx:key，蛇头永远是 0
    const segs = this.state.snake.map((p, i) => ({ i, x: p.x, y: p.y }))
    this.setData({ snake: segs, food: this.state.food, score: this.state.score })
  },

  play() {
    if (this.data.status === 'over') this.reset()
    this.setData({ status: 'playing' })
    this.schedule()
  },

  schedule() {
    this.stop()
    this.timer = setTimeout(() => this.tick(), snake.interval(this.state.score))
  },

  stop() {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
  },

  pause() {
    if (this.data.status !== 'playing') return
    this.stop()
    this.setData({ status: 'paused' })
  },

  tick() {
    const prev = this.state.score
    this.state = snake.step(this.state)
    this.render()
    if (this.state.over) return this.finish()
    if (this.state.score > prev) wx.vibrateShort({ type: 'light', fail() {} })
    this.schedule()
  },

  finish() {
    this.stop()
    const newBest = this.state.score > this.best
    if (newBest) {
      this.best = this.state.score
      wx.setStorageSync(BEST_KEY, this.best)
    }
    wx.vibrateShort({ type: 'heavy', fail() {} })
    this.setData({ status: 'over', best: this.best, newBest })
  },

  steer(dir) {
    const status = this.data.status
    if (status === 'over') return
    this.state = snake.turn(this.state, dir)
    if (status !== 'playing') this.play()
  },

  onTouchStart(e) {
    const t = e.touches[0]
    this.joyCenter = { x: t.clientX, y: t.clientY }
    this.joyDir = ''
    this.setData({ joy: { x: t.clientX, y: t.clientY, dx: 0, dy: 0 } })
  },

  onTouchMove(e) {
    if (!this.joyCenter) return
    const t = e.touches[0]
    const res = joystick.drag(this.joyCenter, { x: t.clientX, y: t.clientY })
    this.joyCenter = res.center
    this.setData({ joy: { x: res.center.x, y: res.center.y, dx: res.dx, dy: res.dy } })
    // 同一方向按住不放只算一次，换方向才再转
    if (res.dir && res.dir !== this.joyDir) {
      this.joyDir = res.dir
      this.steeredAt = Date.now()
      this.steer(res.dir)
    }
  },

  onTouchEnd() {
    this.joyCenter = null
    this.setData({ joy: null })
  },

  onToggle() {
    // 刚用摇杆开始的话，松手时可能还会落一次点击，别让它马上暂停
    if (Date.now() - (this.steeredAt || 0) < 300) return
    if (this.data.status === 'playing') this.pause()
    else this.play()
  }
})
