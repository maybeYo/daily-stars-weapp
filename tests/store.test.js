const test = require('node:test')
const assert = require('node:assert/strict')

// 固定“今天”为 2026-03-02，方便测试跨月（2 月 28 天）
const TODAY = new Date(2026, 2, 2, 10, 0, 0)

function setup(t) {
  t.mock.timers.enable({ apis: ['Date'], now: TODAY.getTime() })
  const mem = {}
  global.wx = {
    getStorageSync: k => mem[k],
    setStorageSync: (k, v) => {
      mem[k] = JSON.parse(JSON.stringify(v))
    }
  }
  delete require.cache[require.resolve('../utils/store')]
  return require('../utils/store')
}

function check(store, id, ...keys) {
  keys.forEach(k => store.toggleCheck(id, k))
}

test('dateKey / addDays 处理补零与跨月跨年', t => {
  const store = setup(t)
  assert.equal(store.dateKey(new Date(2026, 0, 5)), '2026-01-05')
  assert.equal(store.dateKey(), '2026-03-02')
  assert.equal(store.dateKey(store.addDays(new Date(2026, 2, 1), -1)), '2026-02-28')
  assert.equal(store.dateKey(store.addDays(new Date(2025, 11, 31), 1)), '2026-01-01')
  assert.equal(store.dateKey(store.parseKey('2026-02-28')), '2026-02-28')
})

test('首次启动只预置一次示例习惯', t => {
  const store = setup(t)
  store.seedIfFirstLaunch()
  const habits = store.getHabits()
  assert.equal(habits.length, 3)
  assert.equal(habits[0].createdAt, '2026-03-02')
  habits.forEach(h => store.removeHabit(h.id))
  store.seedIfFirstLaunch()
  assert.equal(store.getHabits().length, 0)
})

test('toggleCheck 切换打卡，取消后清掉空的日期', t => {
  const store = setup(t)
  const { id } = store.addHabit('跑步', '🏃')
  assert.equal(store.toggleCheck(id), true)
  assert.equal(store.isChecked(id, '2026-03-02'), true)
  assert.equal(store.toggleCheck(id), false)
  assert.deepEqual(store.getRecords(), {})
})

test('连续天数：今天未打卡时从昨天算，跨月不断', t => {
  const store = setup(t)
  const { id } = store.addHabit('跑步', '🏃')
  check(store, id, '2026-02-27', '2026-02-28', '2026-03-01')
  assert.equal(store.getStreak(id), 3)
  store.toggleCheck(id)
  assert.equal(store.getStreak(id), 4)
  store.toggleCheck(id, '2026-02-28')
  assert.equal(store.getStreak(id), 2)
})

test('连续天数：最近一次打卡在前天时为 0', t => {
  const store = setup(t)
  const { id } = store.addHabit('跑步', '🏃')
  check(store, id, '2026-02-28')
  assert.equal(store.getStreak(id), 0)
})

test('补卡后连续天数接上', t => {
  const store = setup(t)
  const { id } = store.addHabit('跑步', '🏃')
  check(store, id, '2026-02-28', '2026-03-02')
  assert.equal(store.getStreak(id), 1)
  check(store, id, '2026-03-01')
  assert.equal(store.getStreak(id), 3)
})

test('最长连续与累计次数', t => {
  const store = setup(t)
  const { id } = store.addHabit('跑步', '🏃')
  check(store, id, '2026-01-01', '2026-01-02', '2026-01-03', '2026-02-27', '2026-02-28', '2026-03-01', '2026-03-02')
  assert.equal(store.getLongestStreak(id), 4)
  assert.equal(store.getTotal(id), 7)
  assert.equal(store.getLongestStreak('none'), 0)
})

test('删除习惯只清除它自己的记录', t => {
  const store = setup(t)
  const a = store.addHabit('跑步', '🏃')
  const b = store.addHabit('阅读', '📖')
  check(store, a.id, '2026-03-01', '2026-03-02')
  check(store, b.id, '2026-03-02')
  store.removeHabit(a.id)
  assert.deepEqual(store.getRecords(), { '2026-03-02': [b.id] })
  assert.deepEqual(store.getHabits().map(h => h.id), [b.id])
})

test('updateHabit 只改指定字段', t => {
  const store = setup(t)
  const a = store.addHabit('跑步', '🏃')
  store.updateHabit(a.id, { name: '夜跑' })
  assert.deepEqual(store.getHabit(a.id), Object.assign({}, a, { name: '夜跑' }))
})

test('moveHabit 交换相邻顺序，越界不动', t => {
  const store = setup(t)
  const [a, b, c] = ['A', 'B', 'C'].map(n => store.addHabit(n, '⭐'))
  const names = () => store.getHabits().map(h => h.name).join('')
  assert.equal(store.moveHabit(c.id, -1), true)
  assert.equal(names(), 'ACB')
  assert.equal(store.moveHabit(a.id, -1), false)
  assert.equal(store.moveHabit(b.id, 1), false)
  assert.equal(store.moveHabit('none', 1), false)
  assert.equal(names(), 'ACB')
})
