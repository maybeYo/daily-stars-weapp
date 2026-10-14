const store = require('../../utils/store')

const WEEK = ['日', '一', '二', '三', '四', '五', '六']
const QUOTES = [
  '自律给我自由。',
  '每天进步一点点。',
  '坚持，是最朴素的天赋。',
  '今天的星星，是明天的光。',
  '不必完美，只要不停下。',
  '行动是治愈焦虑的良药。',
  '小事做久了，就是大事。'
]
// 可切换的日期：今天 + 最多补卡 2 天
const DAY_TABS = [
  { offset: 0, label: '今天' },
  { offset: 1, label: '昨天' },
  { offset: 2, label: '前天' }
]

Page({
  data: {
    habits: [],
    doneCount: 0,
    percent: 0,
    dateText: '',
    quote: '',
    dayTabs: DAY_TABS,
    offset: 0,
    popId: '',
    stars: []
  },

  onShow() {
    this.refresh()
  },

  onUnload() {
    clearTimeout(this.popTimer)
    clearTimeout(this.burstTimer)
  },

  refresh() {
    const now = new Date()
    const view = store.addDays(now, -this.data.offset)
    const viewKey = store.dateKey(view)
    const records = store.getRecords()
    // 补卡时只显示那天已创建的习惯
    const habits = store.getHabits()
      .filter(h => !h.createdAt || h.createdAt <= viewKey)
      .map(h =>
        Object.assign({}, h, {
          checked: store.isChecked(h.id, viewKey, records),
          streak: store.getStreak(h.id, records),
          total: store.getTotal(h.id, records)
        })
      )
    const doneCount = habits.filter(h => h.checked).length
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000)
    this.today = store.dateKey(now)
    this.viewKey = viewKey
    this.setData({
      habits,
      doneCount,
      percent: habits.length ? Math.round((doneCount * 100) / habits.length) : 0,
      dateText: `${view.getMonth() + 1}月${view.getDate()}日 星期${WEEK[view.getDay()]}`,
      quote: QUOTES[dayOfYear % QUOTES.length]
    })
  },

  onPickDay(e) {
    this.setData({ offset: e.currentTarget.dataset.offset })
    this.refresh()
  },

  onToggle(e) {
    // 页面开着跨过零点时，先切到新的一天，避免把卡打到错的日期
    if (store.dateKey() !== this.today) {
      this.refresh()
      wx.showToast({ title: '新的一天开始啦', icon: 'none' })
      return
    }
    const id = e.currentTarget.dataset.id
    const checked = store.toggleCheck(id, this.viewKey)
    this.refresh()
    if (!checked) return

    this.pop(id)
    const allDone = this.data.doneCount === this.data.habits.length
    wx.vibrateShort({ type: allDone ? 'medium' : 'light' })
    if (this.data.offset > 0) {
      wx.showToast({ title: '补卡成功', icon: 'none' })
    } else if (allDone) {
      this.burst()
      wx.showToast({ title: '今日全部完成 🎉', icon: 'none' })
    }
  },

  // 星星弹一下
  pop(id) {
    clearTimeout(this.popTimer)
    this.setData({ popId: id })
    this.popTimer = setTimeout(() => this.setData({ popId: '' }), 450)
  },

  // 全部完成时撒星星
  burst() {
    const stars = Array.from({ length: 16 }, (_, i) => ({
      id: `${Date.now()}-${i}`,
      left: Math.round(Math.random() * 95),
      delay: (Math.random() * 0.5).toFixed(2),
      size: 28 + Math.round(Math.random() * 32)
    }))
    clearTimeout(this.burstTimer)
    this.setData({ stars })
    this.burstTimer = setTimeout(() => this.setData({ stars: [] }), 2200)
  },

  onEdit(e) {
    wx.navigateTo({ url: `/pages/edit/edit?id=${e.currentTarget.dataset.id}` })
  },

  onAdd() {
    wx.navigateTo({ url: '/pages/edit/edit' })
  },

  onShareAppMessage() {
    const best = this.data.habits.reduce((m, h) => Math.max(m, h.streak), 0)
    return {
      title: best > 0 ? `我已连续打卡 ${best} 天，一起来点亮星星吧 ⭐` : 'Daily Stars · 每天点亮一颗星',
      path: '/pages/index/index'
    }
  }
})
