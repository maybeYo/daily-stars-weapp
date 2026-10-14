// 本地存储：
//   habits:  [{ id, name, icon, createdAt }]
//   records: { 'YYYY-MM-DD': [habitId, ...] }
const HABITS_KEY = 'habits'
const RECORDS_KEY = 'records'
const INITED_KEY = 'inited'

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

function addHabit(name, icon) {
  const habits = getHabits()
  const habit = { id: genId(), name, icon, createdAt: dateKey() }
  habits.push(habit)
  saveHabits(habits)
  return habit
}

function updateHabit(id, fields) {
  saveHabits(getHabits().map(h => (h.id === id ? Object.assign({}, h, fields) : h)))
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
  return idx === -1
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
  dateKey,
  parseKey,
  addDays,
  getHabits,
  getRecords,
  getHabit,
  addHabit,
  updateHabit,
  removeHabit,
  isChecked,
  toggleCheck,
  getStreak,
  getLongestStreak,
  getTotal,
  seedIfFirstLaunch
}
