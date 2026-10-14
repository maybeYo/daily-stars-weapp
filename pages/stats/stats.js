const store = require('../../utils/store')

const WEEKS = 5
const LEVEL_TEXT = ['未打卡', '完成少量', '完成一半左右', '完成大部分', '全部完成']

Page({
  data: {
    totalStars: 0,
    activeDays: 0,
    bestStreak: 0,
    weekNames: ['一', '二', '三', '四', '五', '六', '日'],
    cells: [],
    habitStats: []
  },

  onShow() {
    const habits = store.getHabits()
    const records = store.getRecords()
    const ids = habits.map(h => h.id)
    const countOf = key => (records[key] || []).filter(id => ids.indexOf(id) !== -1).length

    const days = Object.keys(records).filter(k => countOf(k) > 0)
    const totalStars = days.reduce((sum, k) => sum + countOf(k), 0)

    const habitStats = habits.map(h => ({
      id: h.id,
      icon: h.icon,
      name: h.name,
      streak: store.getStreak(h.id, records),
      longest: store.getLongestStreak(h.id, records),
      total: store.getTotal(h.id, records)
    }))

    // 近 5 周热力格：从 (WEEKS-1) 周前的周一排到今天
    const today = new Date()
    const todayKey = store.dateKey(today)
    const mondayOffset = (today.getDay() + 6) % 7
    const start = store.addDays(today, -(mondayOffset + (WEEKS - 1) * 7))
    const cells = []
    for (let d = start; store.dateKey(d) <= todayKey; d = store.addDays(d, 1)) {
      const key = store.dateKey(d)
      const ratio = ids.length ? countOf(key) / ids.length : 0
      const level = ratio === 0 ? 0 : ratio >= 1 ? 4 : Math.ceil(ratio * 3)
      cells.push({
        key,
        level,
        isToday: key === todayKey,
        label: `${d.getMonth() + 1}月${d.getDate()}日，${LEVEL_TEXT[level]}`
      })
    }

    this.setData({
      totalStars,
      activeDays: days.length,
      bestStreak: habitStats.reduce((m, h) => Math.max(m, h.longest), 0),
      cells,
      habitStats
    })
  },

  onShareAppMessage() {
    return {
      title: `我已累计点亮 ${this.data.totalStars} 颗星 ⭐ Daily Stars`,
      path: '/pages/index/index'
    }
  }
})
