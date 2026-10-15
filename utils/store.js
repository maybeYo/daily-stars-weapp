// 本地存储：
//   habits:  [{ id, name, icon, createdAt, type, date }]
//            type: 'daily' 每天（旧数据没有 type，也按每天算）| 'once' 指定日，只在 date 那天出现
//            category: 随手记的类别，有它的是指定日习惯里“记一件事”记下的
//   records: { 'YYYY-MM-DD': [habitId, ...] }
const HABITS_KEY = 'habits'
const RECORDS_KEY = 'records'
const INITED_KEY = 'inited'

// 随手记的固定类别
const CATEGORIES = [
  { key: 'help', name: '助人', icon: '🤝', hint: '比如：帮同事解决了一个问题' },
  { key: 'health', name: '健康', icon: '💧', hint: '比如：今天喝够 8 杯水' },
  { key: 'money', name: '理财', icon: '💰', hint: '比如：存了 500 元' },
  { key: 'study', name: '学习', icon: '📖', hint: '比如：读完一章书' },
  { key: 'other', name: '其他', icon: '✨', hint: '记下今天做的一件事' }
]

function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function addDays(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

function getHabits() {
  return wx.getStorageSync(HABITS_KEY) || []
}

function saveHabits(habits) {
  wx.setStorageSync(HABITS_KEY, habits)
}

function getRecords() {
  return wx.getStorageSync(RECORDS_KEY) || {}
}

function saveRecords(records) {
  wx.setStorageSync(RECORDS_KEY, records)
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

function getHabit(id) {
  return getHabits().find(h => h.id === id)
}

function isOnce(habit) {
  return habit.type === 'once'
}

// 某天统计时是否算上这个习惯：每天的从创建日起都算，一次性的只算指定那天
function isActiveOn(habit, key) {
  if (isOnce(habit)) return habit.date === key
  return !habit.createdAt || habit.createdAt <= key
}

function addHabit(name, icon, opts = {}) {
  const habits = getHabits()
  const habit = { id: genId(), name, icon, type: opts.type || 'daily', createdAt: dateKey() }
  if (isOnce(habit)) habit.date = opts.date || habit.createdAt
  if (opts.category) habit.category = opts.category
  habits.push(habit)
  saveHabits(habits)
  return habit
}

function updateHabit(id, fields) {
  saveHabits(getHabits().map(h => (h.id === id ? Object.assign({}, h, fields) : h)))
}

// 交换两个习惯的位置（排序时与列表里相邻的那个交换，中间隐藏的一次性习惯不受影响）
function swapHabits(idA, idB) {
  const habits = getHabits()
  const i = habits.findIndex(h => h.id === idA)
  const j = habits.findIndex(h => h.id === idB)
  if (i === -1 || j === -1 || i === j) return false
  const t = habits[i]
  habits[i] = habits[j]
  habits[j] = t
  saveHabits(habits)
  return true
}

function getCategory(key) {
  return CATEGORIES.find(c => c.key === key)
}

// 随手记：存成那天的指定日习惯。今天及以前的算已经做完，直接打卡；以后的先排上，到那天再打卡
function addNote(name, category, key = dateKey()) {
  const cat = getCategory(category) || CATEGORIES[CATEGORIES.length - 1]
  const habit = addHabit(name, cat.icon, { type: 'once', date: key, category: cat.key })
  if (key <= dateKey()) toggleCheck(habit.id, key)
  return habit
}

// 某天是否已经记过同名的事
function hasNote(name, key) {
  return getHabits().some(h => h.category && h.date === key && h.name === name)
}

// 随手记统计：每个类别已完成的件数和明细（日期新的在前）。month 为 'YYYY-MM'，不传则统计全部
function noteSummary(month, habits = getHabits(), records = getRecords()) {
  const done = habits.filter(h =>
    h.category && (!month || h.date.slice(0, 7) === month) && isChecked(h.id, h.date, records)
  )
  return CATEGORIES.map(c => {
    const items = done
      .filter(h => h.category === c.key)
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    return Object.assign({}, c, { count: items.length, items })
  })
}

function removeHabit(id) {
  saveHabits(getHabits().filter(h => h.id !== id))
  const records = getRecords()
  Object.keys(records).forEach(key => {
    records[key] = records[key].filter(hid => hid !== id)
    if (!records[key].length) delete records[key]
  })
  saveRecords(records)
}

function isChecked(id, key, records = getRecords()) {
  return (records[key] || []).indexOf(id) !== -1
}

// 切换打卡状态，返回切换后是否已打卡
function toggleCheck(id, key = dateKey()) {
  const records = getRecords()
  const list = records[key] || []
  const idx = list.indexOf(id)
  if (idx === -1) list.push(id)
  else list.splice(idx, 1)
  if (list.length) records[key] = list
  else delete records[key]
  saveRecords(records)
  if (idx === -1) {
    // 给每天的习惯补了创建之前那天的卡：把创建日期提前，统计时那天就算有这个习惯
    const habit = getHabit(id)
    if (habit && !isOnce(habit) && habit.createdAt > key) updateHabit(id, { createdAt: key })
  }
  return idx === -1
}

// 一键：把这些习惯在某天全部打上卡（已打的不动），返回新打了几个
function checkAll(ids, key = dateKey()) {
  const records = getRecords()
  const todo = ids.filter(id => !isChecked(id, key, records))
  todo.forEach(id => toggleCheck(id, key))
  return todo.length
}

// 一键：把这些习惯在某天的打卡全部取消，返回取消了几个
function uncheckAll(ids, key = dateKey()) {
  const records = getRecords()
  const done = ids.filter(id => isChecked(id, key, records))
  done.forEach(id => toggleCheck(id, key))
  return done.length
}

// 当前连续天数：今天没打卡时从昨天开始算，不打断连续
function getStreak(id, records = getRecords()) {
  let d = new Date()
  if (!isChecked(id, dateKey(d), records)) d = addDays(d, -1)
  let count = 0
  while (isChecked(id, dateKey(d), records)) {
    count++
    d = addDays(d, -1)
  }
  return count
}

function getLongestStreak(id, records = getRecords()) {
  const days = Object.keys(records).filter(k => isChecked(id, k, records)).sort()
  let best = 0
  let cur = 0
  let prev = null
  days.forEach(k => {
    cur = prev && dateKey(addDays(parseKey(prev), 1)) === k ? cur + 1 : 1
    best = Math.max(best, cur)
    prev = k
  })
  return best
}

function getTotal(id, records = getRecords()) {
  return Object.keys(records).filter(k => isChecked(id, k, records)).length
}

function seedIfFirstLaunch() {
  if (wx.getStorageSync(INITED_KEY)) return
  if (!getHabits().length) {
    addHabit('早起', '🌅')
    addHabit('阅读 30 分钟', '📖')
    addHabit('运动', '🏃')
  }
  wx.setStorageSync(INITED_KEY, true)
}

module.exports = {
  CATEGORIES,
  getCategory,
  addNote,
  hasNote,
  noteSummary,
  dateKey,
  parseKey,
  addDays,
  getHabits,
  getRecords,
  getHabit,
  addHabit,
  updateHabit,
  swapHabits,
  isOnce,
  isActiveOn,
  removeHabit,
  isChecked,
  toggleCheck,
  checkAll,
  uncheckAll,
  getStreak,
  getLongestStreak,
  getTotal,
  seedIfFirstLaunch
}
