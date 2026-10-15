const store = require('../../utils/store')
const cal = require('../../utils/calendar')

const LEVEL_TEXT = ['未打卡', '完成少量', '完成一半左右', '完成大部分', '全部完成']

Page({
  data: {
    totalStars: 0,
    activeDays: 0,
    bestStreak: 0,
    weekNames: ['一', '二', '三', '四', '五', '六', '日'],
    monthTitle: '',
    monthValue: '',
    isThisMonth: true,
    canPrev: false,
    canNext: false,
    monthDays: 0,
    monthPerfect: 0,
    noteRange: 'month',
    noteMonthLabel: '',
    noteRows: [],
    noteTotal: 0,
    noteTop: '',
    noteOpenKey: '',
    cells: [],
    selectedKey: '',
    selectedTitle: '',
    selectedFuture: false,
    allAction: '',
    allLater: false,
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

    // 连续天数只对每天的习惯有意义
    const habitStats = habits.filter(h => !store.isOnce(h)).map(h => ({
      id: h.id,
      icon: h.icon,
      name: h.name,
      streak: store.getStreak(h.id, records),
      longest: store.getLongestStreak(h.id, records),
      total: store.getTotal(h.id, records)
    }))

    // 月历：前后都不限。过去的看完成情况、能补卡；以后的看当天安排
    const todayKey = store.dateKey()

    let monthDays = 0
    let monthPerfect = 0
    const cells = cal.monthCells(this.year, this.month).map(c => {
      if (c.blank) return c
      const isFuture = c.key > todayKey
      const { done, total } = cal.dayStatus(c.key, habits, records)
      const level = isFuture ? 0 : cal.level(done, total)
      // 以后的日子有指定日安排就打个点（每天的习惯天天都有，不算）
      const plan = isFuture && habits.some(h => store.isOnce(h) && h.date === c.key)
      if (done) monthDays++
      if (level === 4) monthPerfect++
      return Object.assign({}, c, {
        level,
        isFuture,
        plan,
        isToday: c.key === todayKey,
        label: `${this.month + 1}月${c.day}日，${isFuture ? (plan ? '有安排' : '还没到') : LEVEL_TEXT[level]}`
      })
    })

    this.setData({
      totalStars,
      activeDays: days.length,
      bestStreak: habitStats.reduce((m, h) => Math.max(m, h.longest), 0),
      habitStats,
      monthTitle: `${this.year}年${this.month + 1}月`,
      monthValue: store.dateKey(new Date(this.year, this.month, 1)).slice(0, 7),
      isThisMonth: store.dateKey(new Date(this.year, this.month, 1)).slice(0, 7) === todayKey.slice(0, 7),
      canPrev: true,
      canNext: true,
      monthDays,
      monthPerfect,
      cells
    })
    this.showDay(this.data.selectedKey, habits, records)
    this.showNotes(habits, records)
  },

  // 随手记统计：本月（跟着月历的月份）或全部，每个类别一条，条形按最多的那个类别比例
  showNotes(habits = store.getHabits(), records = store.getRecords()) {
    const month = store.dateKey(new Date(this.year, this.month, 1)).slice(0, 7)
    const summary = store.noteSummary(this.data.noteRange === 'month' ? month : '', habits, records)
    const max = Math.max(...summary.map(c => c.count))
    const total = summary.reduce((sum, c) => sum + c.count, 0)
    const noteRows = summary.map(c => ({
      key: c.key,
      icon: c.icon,
      name: c.name,
      count: c.count,
      pct: c.count ? Math.max(6, Math.round((c.count / max) * 100)) : 0,
      items: c.items.slice(0, 5).map(h => {
        const d = store.parseKey(h.date)
        return { id: h.id, text: `${d.getMonth() + 1}月${d.getDate()}日  ${h.name}` }
      }),
      more: Math.max(0, c.items.length - 5)
    }))
    this.setData({
      noteMonthLabel: `${this.month + 1}月`,
      noteRows,
      noteTotal: total,
      noteTop: total ? summary.filter(c => c.count === max).map(c => c.name).join('、') : ''
    })
  },

  onNoteRange(e) {
    this.setData({ noteRange: e.currentTarget.dataset.range, noteOpenKey: '' })
    this.showNotes()
  },

  onToggleNoteCat(e) {
    const key = e.currentTarget.dataset.key
    const row = this.data.noteRows.find(r => r.key === key)
    if (!row || !row.count) return
    this.setData({ noteOpenKey: this.data.noteOpenKey === key ? '' : key })
  },

  // 月历下方显示选中那天每个习惯的完成情况，点一行可以补卡 / 取消。
  // 那天之后才新增的每天习惯也列出来（变淡），补卡后创建日会提前到那天
  showDay(key, habits = store.getHabits(), records = store.getRecords()) {
    if (!key) {
      this.setData({ selectedKey: '', selectedTitle: '点日期查看当天打卡', dayDetail: [] })
      return
    }
    const d = store.parseKey(key)
    const dayDetail = habits
      .filter(h => !store.isOnce(h) || h.date === key)
      .map(h => {
        const cat = h.category && store.getCategory(h.category)
        return {
          id: h.id,
          icon: h.icon,
          name: h.name,
          tag: store.isOnce(h) ? (cat ? cat.name : '指定日') : '',
          active: store.isActiveOn(h, key),
          checked: store.isChecked(h.id, key, records)
        }
      })
    const active = dayDetail.filter(h => h.active)
    const done = active.filter(h => h.checked).length
    const future = key > store.dateKey()
    const progress = !active.length ? ''
      : future ? ` · 计划 ${active.length} 项`
      : done === active.length ? ' · 全部完成 🎉'
      : ` · 完成 ${done}/${active.length}`
    this.setData({
      selectedKey: key,
      selectedTitle: `${d.getMonth() + 1}月${d.getDate()}日${progress}`,
      selectedFuture: future,
      // 一键按钮：对列表里所有项（含后来新增的，和首页一致）；没打完是补全，全打完是取消
      allAction: future || !dayDetail.length ? '' : dayDetail.every(h => h.checked) ? 'uncheck' : 'check',
      // 整天都是后来新增的：不逐行标注，标题下统一说明
      allLater: !future && dayDetail.length > 0 && !active.length,
      dayDetail
    })
  },

  onPrevMonth() {
    if (this.data.canPrev) this.shiftMonth(-1)
  },

  onNextMonth() {
    if (this.data.canNext) this.shiftMonth(1)
  },

  shiftMonth(delta) {
    const m = cal.shiftMonth(this.year, this.month, delta)
    this.goToMonth(m.year, m.month)
  },

  // 点标题弹出年月选择器，直接跳到某个月
  onPickMonth(e) {
    const [y, m] = e.detail.value.split('-').map(Number)
    this.goToMonth(y, m - 1)
  },

  onBackToday() {
    const now = new Date()
    this.goToMonth(now.getFullYear(), now.getMonth())
  },

  goToMonth(year, month) {
    this.year = year
    this.month = month
    // 回到本月时默认选中今天，其他月份先不选
    const todayKey = store.dateKey()
    const inMonth = todayKey.slice(0, 7) === store.dateKey(new Date(year, month, 1)).slice(0, 7)
    this.setData({ selectedKey: inMonth ? todayKey : '' })
    this.refresh()
  },

  onPickDay(e) {
    const cell = this.data.cells.find(c => c.key === e.currentTarget.dataset.key)
    if (!cell || cell.blank) return
    this.showDay(cell.key)
  },

  // 过去和今天：补卡 / 取消；以后的日子还不能打卡，点了去编辑
  onToggleDay(e) {
    const key = this.data.selectedKey
    if (!key) return
    if (key > store.dateKey()) {
      wx.navigateTo({ url: `/pages/edit/edit?id=${e.currentTarget.dataset.id}` })
      return
    }
    if (store.toggleCheck(e.currentTarget.dataset.id, key)) wx.vibrateShort({ type: 'light' })
    this.refresh()
  },

  onToggleAllDay() {
    const key = this.data.selectedKey
    if (!key || key > store.dateKey()) return
    const ids = this.data.dayDetail.map(h => h.id)
    if (this.data.allAction === 'check') {
      const n = store.checkAll(ids, key)
      wx.vibrateShort({ type: 'medium' })
      wx.showToast({ title: key === store.dateKey() ? '今日全部完成 🎉' : `已补卡 ${n} 项`, icon: 'none' })
      this.refresh()
      return
    }
    wx.showModal({
      title: '全部取消',
      content: `取消这天全部 ${ids.length} 项打卡？`,
      confirmColor: '#E5533D',
      success: res => {
        if (!res.confirm) return
        store.uncheckAll(ids, key)
        this.refresh()
      }
    })
  },

  onOpenGame() {
    wx.navigateTo({ url: '/pages/game/game' })
  },

  onShareAppMessage() {
    return {
      title: `我已累计点亮 ${this.data.totalStars} 颗星 ⭐ Daily Stars`,
      path: '/pages/index/index'
    }
  }
})
