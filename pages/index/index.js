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

Page({
  data: {
    habits: [],
    doneCount: 0,
    percent: 0,
    dateText: '',
    quote: ''
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const now = new Date()
    const today = store.dateKey(now)
    const records = store.getRecords()
    const habits = store.getHabits().map(h =>
      Object.assign({}, h, {
        checked: store.isChecked(h.id, today, records),
        streak: store.getStreak(h.id, records),
        total: store.getTotal(h.id, records)
      })
    )
    const doneCount = habits.filter(h => h.checked).length
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000)
    this.setData({
      habits,
      doneCount,
      percent: habits.length ? Math.round((doneCount * 100) / habits.length) : 0,
      dateText: `${now.getMonth() + 1}月${now.getDate()}日 星期${WEEK[now.getDay()]}`,
      quote: QUOTES[dayOfYear % QUOTES.length]
    })
  },

  onToggle(e) {
    const checked = store.toggleCheck(e.currentTarget.dataset.id)
    this.refresh()
    if (!checked) return
    wx.vibrateShort({ type: 'light' })
    if (this.data.doneCount === this.data.habits.length) {
      wx.showToast({ title: '今日全部完成 🎉', icon: 'none' })
    }
  },

  onEdit(e) {
    wx.navigateTo({ url: `/pages/edit/edit?id=${e.currentTarget.dataset.id}` })
  },

  onAdd() {
    wx.navigateTo({ url: '/pages/edit/edit' })
  }
})
