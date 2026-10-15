const test = require('node:test')
const assert = require('node:assert/strict')

global.wx = { getStorageSync: () => undefined, setStorageSync: () => {} }
const cal = require('../utils/calendar')

const lead = cells => cells.filter(c => c.blank).length
const days = cells => cells.filter(c => !c.blank)

test('monthCells：周一开头补空格，天数正确', () => {
  // 2026-10-01 是周四，前面补 3 格
  const oct = cal.monthCells(2026, 9)
  assert.equal(lead(oct), 3)
  assert.equal(days(oct).length, 31)
  assert.deepEqual(days(oct)[0], { key: '2026-10-01', day: 1 })
  assert.equal(days(oct)[30].key, '2026-10-31')

  // 2026-02-01 是周日，补 6 格；平年 28 天
  const feb = cal.monthCells(2026, 1)
  assert.equal(lead(feb), 6)
  assert.equal(days(feb).length, 28)

  // 2028 是闰年，2 月 29 天；2028-02-01 是周二，补 1 格
  const leap = cal.monthCells(2028, 1)
  assert.equal(lead(leap), 1)
  assert.equal(days(leap).length, 29)

  // 2027-03-01 是周一，不补
  assert.equal(lead(cal.monthCells(2027, 2)), 0)
})

test('monthCells：格子 key 不重复', () => {
  const keys = cal.monthCells(2026, 1).map(c => c.key)
  assert.equal(new Set(keys).size, keys.length)
})

test('shiftMonth 跨年', () => {
  assert.deepEqual(cal.shiftMonth(2026, 0, -1), { year: 2025, month: 11 })
  assert.deepEqual(cal.shiftMonth(2025, 11, 1), { year: 2026, month: 0 })
  assert.deepEqual(cal.shiftMonth(2026, 9, 0), { year: 2026, month: 9 })
})

test('dayStatus 只算当天已创建的习惯', () => {
  const habits = [
    { id: 'a', createdAt: '2026-10-01' },
    { id: 'b', createdAt: '2026-10-10' },
    { id: 'c' }
  ]
  const records = { '2026-10-05': ['a'], '2026-10-12': ['a', 'b', 'c'] }
  assert.deepEqual(cal.dayStatus('2026-10-05', habits, records), { done: 1, total: 2 })
  assert.deepEqual(cal.dayStatus('2026-10-12', habits, records), { done: 3, total: 3 })
  assert.deepEqual(cal.dayStatus('2026-09-30', habits, records), { done: 0, total: 1 })
  assert.deepEqual(cal.dayStatus('2026-10-05', [], records), { done: 0, total: 0 })
})

test('dayStatus 一次性习惯只算在指定那天', () => {
  const habits = [
    { id: 'a', createdAt: '2026-10-01' },
    { id: 'o', type: 'once', createdAt: '2026-10-01', date: '2026-10-08' }
  ]
  const records = { '2026-10-08': ['a'], '2026-10-09': ['a'] }
  assert.deepEqual(cal.dayStatus('2026-10-08', habits, records), { done: 1, total: 2 })
  assert.deepEqual(cal.dayStatus('2026-10-09', habits, records), { done: 1, total: 1 })
})

test('level 分档', () => {
  assert.equal(cal.level(0, 0), 0)
  assert.equal(cal.level(0, 3), 0)
  assert.equal(cal.level(1, 3), 1)
  assert.equal(cal.level(2, 3), 2)
  assert.equal(cal.level(3, 4), 3)
  assert.equal(cal.level(1, 4), 1)
  assert.equal(cal.level(3, 3), 4)
})
