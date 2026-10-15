const game = require('../../utils/game2048')

const SAVE_KEY = 'game2048'
const BEST_KEY = 'game2048_best'

Page({
  data: {
    slots: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    tiles: [],
    score: 0,
    best: 0,
    gained: 0,
    gainKey: 0,
    over: false,
    showWin: false
  },

  onLoad() {
    let saved = null
    try {
      saved = wx.getStorageSync(SAVE_KEY) || null
    } catch (e) {}
    this.best = wx.getStorageSync(BEST_KEY) || 0
    this.state = saved && saved.grid ? saved : game.newGame()
    this.render()
  },

  onUnload() {
    this.save()
  },

  onHide() {
    this.save()
  },

  save() {
    if (!this.state) return
    wx.setStorageSync(SAVE_KEY, this.state)
    wx.setStorageSync(BEST_KEY, this.best)
  },

  render(extra) {
    const over = !game.canMove(this.state.grid)
    this.setData(Object.assign({
      tiles: game.tiles(this.state.grid),
      score: this.state.score,
      best: this.best,
      over
    }, extra))
  },

  onTouchStart(e) {
    const t = e.touches[0]
    this.start = { x: t.clientX, y: t.clientY }
  },

  onTouchEnd(e) {
    if (!this.start || this.data.over || this.data.showWin) return
    const t = e.changedTouches[0]
    const dir = game.swipeDir(t.clientX - this.start.x, t.clientY - this.start.y)
    this.start = null
    if (dir) this.slide(dir)
  },

  slide(dir) {
    const res = game.move(this.state, dir)
    if (!res.moved) return
    this.state = res.state
    if (this.state.score > this.best) this.best = this.state.score
    const extra = { showWin: res.justWon }
    if (res.gained) {
      extra.gained = res.gained
      extra.gainKey = this.data.gainKey + 1
      wx.vibrateShort({ type: 'light', fail() {} })
    }
    this.render(extra)
    this.save()
  },

  onRestart() {
    if (this.data.over || this.state.score === 0) return this.restart()
    wx.showModal({
      title: '重新开始？',
      content: '当前这局会清空',
      confirmText: '重来',
      success: res => {
        if (res.confirm) this.restart()
      }
    })
  },

  restart() {
    this.state = game.newGame()
    this.render({ showWin: false, gained: 0 })
    this.save()
  },

  onKeepGoing() {
    this.setData({ showWin: false })
  },

  noop() {}
})
