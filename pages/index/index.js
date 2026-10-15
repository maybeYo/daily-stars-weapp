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
    stars: [],
    sorting: false,
    upcoming: [],
    categories: store.CATEGORIES,
    noteOpen: false,
    noteText: '',
    noteCat: store.CATEGORIES[0].key,
    noteHint: store.CATEGORIES[0].hint,
    noteDate: '',
    noteDateText: '',
    noteFuture: false
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
    const todayKey = store.dateKey(now)
    const records = store.getRecords()
    const all = store.getHabits()
    // 每天的习惯每天都显示（补卡时也显示今天新建的），一次性的只在指定那天显示
    const habits = all
      .filter(h => !store.isOnce(h) || h.date === viewKey)
      .map(h => {
        const once = store.isOnce(h)
        const cat = h.category && store.getCategory(h.category)
        return Object.assign({}, h, {
          once,
          tag: once ? (cat ? cat.name : '指定日') : '',
          checked: store.isChecked(h.id, viewKey, records),
          streak: once ? 0 : store.getStreak(h.id, records),
          total: store.getTotal(h.id, records)
        })
      })
    // 以后某天的一次性习惯，列在下方“即将到来”
    const upcoming = all
      .filter(h => store.isOnce(h) && h.date > todayKey)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
      .map(h => {
        const d = store.parseKey(h.date)
        return { id: h.id, icon: h.icon, name: h.name, dateText: `${d.getMonth() + 1}月${d.getDate()}日 周${WEEK[d.getDay()]}` }
      })
    const doneCount = habits.filter(h => h.checked).length
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000)
    this.today = todayKey
    this.viewKey = viewKey
    this.setData({
      habits,
      upcoming,
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

  onToggleSort() {
    // 排序回到今天，避免补卡视图里隐藏的习惯让移动看起来没反应
    this.setData({ sorting: !this.data.sorting, offset: 0 })
    this.refresh()
  },

  // 与列表里相邻的那个交换（列表里看不到的一次性习惯位置不变）
  onMove(e) {
    const { id, dir } = e.currentTarget.dataset
    const list = this.data.habits
    const target = list[list.findIndex(h => h.id === id) + Number(dir)]
    if (target && store.swapHabits(id, target.id)) this.refresh()
  },

  onToggle(e) {
    if (this.data.sorting) return
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

  // 一键：没打完就把当前这天列表里的全部打上；已经全打完了就（确认后）全部取消
  onToggleAll() {
    if (store.dateKey() !== this.today) {
      this.refresh()
      wx.showToast({ title: '新的一天开始啦', icon: 'none' })
      return
    }
    const ids = this.data.habits.map(h => h.id)
    if (this.data.doneCount < ids.length) {
      const n = store.checkAll(ids, this.viewKey)
      this.refresh()
      wx.vibrateShort({ type: 'medium' })
      if (this.data.offset > 0) {
        wx.showToast({ title: `已补卡 ${n} 项`, icon: 'none' })
      } else {
        this.burst()
        wx.showToast({ title: '今日全部完成 🎉', icon: 'none' })
      }
      return
    }
    wx.showModal({
      title: '全部取消',
      content: `取消这天全部 ${ids.length} 项打卡？`,
      confirmColor: '#E5533D',
      success: res => {
        if (!res.confirm) return
        store.uncheckAll(ids, this.viewKey)
        this.refresh()
      }
    })
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

  // 随手记：底部弹出面板，默认记到当前查看的那天，日期可以任意改
  onOpenNote() {
    if (store.dateKey() !== this.today) this.refresh()
    this.setData({ noteOpen: true, noteText: '' })
    this.setNoteDate(this.viewKey)
  },

  setNoteDate(key) {
    const d = store.parseKey(key)
    const near = [{ offset: -1, label: '明天' }].concat(DAY_TABS)
      .find(t => store.dateKey(store.addDays(new Date(), -t.offset)) === key)
    const text = `${d.getMonth() + 1}月${d.getDate()}日${near ? `（${near.label}）` : ''}`
    this.setData({ noteDate: key, noteDateText: text, noteFuture: key > this.today })
  },

  onPickNoteDate(e) {
    this.setNoteDate(e.detail.value)
  },

  onCloseNote() {
    this.setData({ noteOpen: false })
  },

  noop() {},

  onPickCat(e) {
    const cat = store.getCategory(e.currentTarget.dataset.key)
    this.setData({ noteCat: cat.key, noteHint: cat.hint })
  },

  onNoteInput(e) {
    this.setData({ noteText: e.detail.value })
  },

  onSaveNote() {
    const name = this.data.noteText.trim()
    if (!name) {
      wx.showToast({ title: '写点什么吧', icon: 'none' })
      return
    }
    const key = this.data.noteDate
    if (store.hasNote(name, key)) {
      wx.showToast({ title: '这天已经记过了', icon: 'none' })
      return
    }
    const note = store.addNote(name, this.data.noteCat, key)
    this.setData({ noteOpen: false })
    this.refresh()
    wx.vibrateShort({ type: 'light' })
    if (this.data.noteFuture) {
      wx.showToast({ title: `已安排在${this.data.noteDateText}`, icon: 'none' })
    } else if (key === this.viewKey) {
      this.pop(note.id)
      wx.showToast({ title: '已记下 ⭐', icon: 'none' })
    } else {
      wx.showToast({ title: `已记到${this.data.noteDateText}`, icon: 'none' })
    }
  },

  onShareAppMessage() {
    const best = this.data.habits.reduce((m, h) => Math.max(m, h.streak), 0)
    return {
      title: best > 0 ? `我已连续打卡 ${best} 天，一起来点亮星星吧 ⭐` : 'Daily Stars · 每天点亮一颗星',
      path: '/pages/index/index'
    }
  }
})
