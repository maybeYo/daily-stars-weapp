const store = require('../../utils/store')
const cal = require('../../utils/calendar')

const LEVEL_TEXT = ['未打卡', '完成少量', '完成一半左右', '完成大部分', '全部完成']
const monthIndex = (year, month) => year * 12 + month

Page({
  data: {
    totalStars: 0,
    activeDays: 0,
    bestStreak: 0,
    weekNames: ['一', '二', '三', '四', '五', '六', '日'],
    monthTitle: '',
    canPrev: false,
    canNext: false,
    monthDays: 0,
    monthPerfect: 0,
    cells: [],
    selectedKey: '',
    selectedTitle: '',
    dayDetail: [],
    habitStats: []
  },

  onShow() {
    if (this.year === undefined) {
      const now = new Date()
      this.year = now.getFullYear()
      this.month = now.getMonth()
      this.setData({ selectedKey: store.dateKey(now) })
    }
    this.refresh()
  },

  refresh() {
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

    // 月历：最早能翻到第一个习惯或第一条打卡记录所在的月份，最晚到本月
    const todayKey = store.dateKey()
    const today = store.parseKey(todayKey)
    const first = store.parseKey(habits.map(h => h.createdAt).concat(days).filter(Boolean).sort()[0] || todayKey)
    const cur = monthIndex(this.year, this.month)

    let monthDays = 0
    let monthPerfect = 0
    const cells = cal.monthCells(this.year, this.month).map(c => {
      if (c.blank) return c
      const isFuture = c.key > todayKey
      const { done, total } = cal.dayStatus(c.key, habits, records)
      const level = isFuture ? 0 : cal.level(done, total)
      if (done) monthDays++
      if (level === 4) monthPerfect++
      return Object.assign({}, c, {
        level,
        isFuture,
        isToday: c.key === todayKey,
        label: `${this.month + 1}月${c.day}日，${isFuture ? '还没到' : LEVEL_TEXT[level]}`
      })
    })

    this.setData({
      totalStars,
      activeDays: days.length,
      bestStreak: habitStats.reduce((m, h) => Math.max(m, h.longest), 0),
      habitStats,
      monthTitle: `${this.year}年${this.month + 1}月`,
      canPrev: cur > monthIndex(first.getFullYear(), first.getMonth()),
      canNext: cur < monthIndex(today.getFullYear(), today.getMonth()),
      monthDays,
      monthPerfect,
      cells
    })
    this.showDay(this.data.selectedKey, habits, records)
  },

  // 月历下方显示选中那天每个习惯的完成情况
  showDay(key, habits = store.getHabits(), records = store.getRecords()) {
    if (!key) {
      this.setData({ selectedKey: '', selectedTitle: '点日期查看当天打卡', dayDetail: [] })
      return
    }
    const d = store.parseKey(key)
    const dayDetail = habits
      .filter(h => !h.createdAt || h.createdAt <= key)
      .map(h => ({ id: h.id, icon: h.icon, name: h.name, checked: store.isChecked(h.id, key, records) }))
    const done = dayDetail.filter(h => h.checked).length
    const progress = !dayDetail.length ? '' : done === dayDetail.length ? ' · 全部完成 🎉' : ` · 完成 ${done}/${dayDetail.length}`
    this.setData({ selectedKey: key, selectedTitle: `${d.getMonth() + 1}月${d.getDate()}日${progress}`, dayDetail })
  },

  onPrevMonth() {
    if (this.data.canPrev) this.shiftMonth(-1)
  },

  onNextMonth() {
    if (this.data.canNext) this.shiftMonth(1)
  },

  shiftMonth(delta) {
    const m = cal.shiftMonth(this.year, this.month, delta)
    this.year = m.year
    this.month = m.month
    // 翻回本月时默认选中今天，其他月份先不选
    const todayKey = store.dateKey()
    const inMonth = todayKey.slice(0, 7) === store.dateKey(new Date(m.year, m.month, 1)).slice(0, 7)
    this.setData({ selectedKey: inMonth ? todayKey : '' })
    this.refresh()
  },

  onPickDay(e) {
    const cell = this.data.cells.find(c => c.key === e.currentTarget.dataset.key)
    if (!cell || cell.blank || cell.isFuture) return
    this.showDay(cell.key)
  },

  onShareAppMessage() {
    return {
      title: `我已累计点亮 ${this.data.totalStars} 颗星 ⭐ Daily Stars`,
      path: '/pages/index/index'
    }
  }
})
