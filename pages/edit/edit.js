const store = require('../../utils/store')

const ICONS = ['🌅', '📖', '🏃', '💧', '🧘', '✍️', '🍎', '😴', '🎸', '💪', '🧹', '📵', '🌿', '🧠', '💰', '⭐']

Page({
  data: {
    id: '',
    name: '',
    icon: ICONS[0],
    icons: ICONS
  },

  onLoad(options) {
    if (!options.id) return
    const habit = store.getHabit(options.id)
    if (!habit) return
    this.setData({ id: habit.id, name: habit.name, icon: habit.icon })
    wx.setNavigationBarTitle({ title: '编辑习惯' })
  },

  onInput(e) {
    this.setData({ name: e.detail.value })
  },

  onPick(e) {
    this.setData({ icon: e.currentTarget.dataset.icon })
  },

  onSave() {
    const name = this.data.name.trim()
    if (!name) {
      wx.showToast({ title: '请输入习惯名称', icon: 'none' })
      return
    }
    if (store.getHabits().some(h => h.id !== this.data.id && h.name === name)) {
      wx.showToast({ title: '已有同名习惯', icon: 'none' })
      return
    }
    if (this.data.id) store.updateHabit(this.data.id, { name, icon: this.data.icon })
    else store.addHabit(name, this.data.icon)
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
