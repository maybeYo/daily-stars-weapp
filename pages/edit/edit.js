const store = require('../../utils/store')

const ICONS = ['🌅', '📖', '🏃', '💧', '🧘', '✍️', '🍎', '😴', '🎸', '💪', '🧹', '📵', '🌿', '🧠', '💰', '⭐']
function dateText(key, todayKey) {
  const d = store.parseKey(key)
  return `${d.getMonth() + 1}月${d.getDate()}日${key === todayKey ? '（今天）' : ''}`
}

Page({
  data: {
    id: '',
    name: '',
    icon: ICONS[0],
    icons: ICONS,
    type: 'daily',
    date: '',
    dateText: ''
  },

  onLoad(options) {
    const todayKey = store.dateKey()
    let date = todayKey
    const habit = options.id && store.getHabit(options.id)
    if (habit) {
      if (store.isOnce(habit)) date = habit.date
      this.setData({ id: habit.id, name: habit.name, icon: habit.icon, type: store.isOnce(habit) ? 'once' : 'daily' })
      wx.setNavigationBarTitle({ title: '编辑习惯' })
    }
    this.todayKey = todayKey
    this.setData({ date, dateText: dateText(date, todayKey) })
  },

  onInput(e) {
    this.setData({ name: e.detail.value })
  },

  onPick(e) {
    this.setData({ icon: e.currentTarget.dataset.icon })
  },

  onPickType(e) {
    this.setData({ type: e.currentTarget.dataset.type })
  },

  onPickDate(e) {
    const date = e.detail.value
    this.setData({ date, dateText: dateText(date, this.todayKey) })
  },

  onSave() {
    const { id, icon, type, date } = this.data
    const name = this.data.name.trim()
    if (!name) {
      wx.showToast({ title: '请输入习惯名称', icon: 'none' })
      return
    }
    // 每天的不能重名；一次性的只有同一天才算重名
    const dup = store.getHabits().some(h =>
      h.id !== id && h.name === name && (store.isOnce(h) ? type === 'once' && h.date === date : type === 'daily')
    )
    if (dup) {
      wx.showToast({ title: type === 'once' ? '那天已有同名习惯' : '已有同名习惯', icon: 'none' })
      return
    }
    const fields = type === 'once' ? { name, icon, type, date } : { name, icon, type }
    if (id) store.updateHabit(id, fields)
    else store.addHabit(name, icon, fields)
    if (type === 'once' && date > this.todayKey) {
      wx.showToast({ title: `已安排在${dateText(date, this.todayKey)}`, icon: 'none' })
    }
    wx.navigateBack()
  },

  onDelete() {
    wx.showModal({
      title: '删除习惯',
      content: '删除后该习惯的打卡记录也会清除，确定吗？',
      confirmColor: '#E5533D',
      success: res => {
        if (!res.confirm) return
        store.removeHabit(this.data.id)
        wx.navigateBack()
      }
    })
  }
})
