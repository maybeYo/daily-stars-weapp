// 统计页月历用到的纯日期计算，不读写存储
const store = require('./store')

// 某月的日历格：周一开头，月初前用空格补齐。month 为 0-11
function monthCells(year, month) {
  const lead = (new Date(year, month, 1).getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < lead; i++) cells.push({ key: `blank-${i}`, blank: true })
  for (let d = 1; d <= days; d++) {
    cells.push({ key: store.dateKey(new Date(year, month, d)), day: d })
  }
  return cells
}

function shiftMonth(year, month, delta) {
  const d = new Date(year, month + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() }
}

// 某天的完成情况：只算那天该做的习惯（已创建的每天习惯 + 当天的一次性习惯）
function dayStatus(key, habits, records) {
  const existing = habits.filter(h => store.isActiveOn(h, key))
  const done = existing.filter(h => store.isChecked(h.id, key, records)).length
  return { done, total: existing.length }
}

// 完成度分 5 档：0 未打卡 … 4 全部完成
function level(done, total) {
  if (!total || !done) return 0
  if (done >= total) return 4
  return Math.ceil((done / total) * 3)
}

module.exports = {
  monthCells,
  shiftMonth,
  dayStatus,
  level
}
