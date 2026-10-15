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

test('swapHabits 交换两个习惯，无效参数不动', t => {
  const store = setup(t)
  const [a, b, c] = ['A', 'B', 'C'].map(n => store.addHabit(n, '⭐'))
  const names = () => store.getHabits().map(h => h.name).join('')
  assert.equal(store.swapHabits(a.id, c.id), true)
  assert.equal(names(), 'CBA')
  assert.equal(store.swapHabits(b.id, b.id), false)
  assert.equal(store.swapHabits(b.id, 'none'), false)
  assert.equal(names(), 'CBA')
})

test('addHabit 默认每天，一次性带日期', t => {
  const store = setup(t)
  assert.equal(store.addHabit('跑步', '🏃').type, 'daily')
  const once = store.addHabit('体检', '🏥', { type: 'once', date: '2026-03-05' })
  assert.equal(once.type, 'once')
  assert.equal(once.date, '2026-03-05')
  assert.equal(store.addHabit('取快递', '📦', { type: 'once' }).date, '2026-03-02')
})

test('isActiveOn：每天的从创建日起，一次性的只在那天，旧数据按每天算', t => {
  const store = setup(t)
  const daily = { createdAt: '2026-03-01' }
  assert.equal(store.isActiveOn(daily, '2026-02-28'), false)
  assert.equal(store.isActiveOn(daily, '2026-03-01'), true)
  assert.equal(store.isActiveOn(daily, '2026-04-01'), true)
  const once = { type: 'once', createdAt: '2026-03-01', date: '2026-03-05' }
  assert.equal(store.isActiveOn(once, '2026-03-04'), false)
  assert.equal(store.isActiveOn(once, '2026-03-05'), true)
  assert.equal(store.isActiveOn(once, '2026-03-06'), false)
  assert.equal(store.isActiveOn({}, '2020-01-01'), true)
})

test('补卡到创建日之前：每天的习惯创建日提前，一次性的不变', t => {
  const store = setup(t)
  const daily = store.addHabit('跑步', '🏃')
  store.toggleCheck(daily.id, '2026-03-01')
  assert.equal(store.getHabit(daily.id).createdAt, '2026-03-01')
  // 取消不会把创建日改回去，再打今天也不会往后挪
  store.toggleCheck(daily.id, '2026-03-01')
  store.toggleCheck(daily.id, '2026-03-02')
  assert.equal(store.getHabit(daily.id).createdAt, '2026-03-01')

  const once = store.addHabit('体检', '🏥', { type: 'once', date: '2026-02-28' })
  store.toggleCheck(once.id, '2026-02-28')
  assert.equal(store.getHabit(once.id).createdAt, '2026-03-02')
})

test('addNote 记下当天已完成的一件事，类别决定图标', t => {
  const store = setup(t)
  const n = store.addNote('帮邻居搬东西', 'help')
  assert.equal(n.type, 'once')
  assert.equal(n.date, '2026-03-02')
  assert.equal(n.category, 'help')
  assert.equal(n.icon, '🤝')
  assert.equal(store.isChecked(n.id, '2026-03-02'), true)
  // 未知类别归到“其他”；可以记到补卡的日子
  const o = store.addNote('随便记记', 'nope', '2026-03-01')
  assert.equal(o.category, 'other')
  assert.equal(store.isChecked(o.id, '2026-03-01'), true)
})

test('hasNote 只认同一天同名的随手记', t => {
  const store = setup(t)
  store.addNote('喝水', 'health')
  store.addHabit('跑步', '🏃')
  assert.equal(store.hasNote('喝水', '2026-03-02'), true)
  assert.equal(store.hasNote('喝水', '2026-03-01'), false)
  assert.equal(store.hasNote('跑步', '2026-03-02'), false)
})

test('noteCounts 按月按类别统计已完成的随手记', t => {
  const store = setup(t)
  store.addNote('帮忙', 'help')
  store.addNote('帮忙 2', 'help', '2026-03-01')
  store.addNote('存钱', 'money', '2026-02-28')
  const undone = store.addNote('喝水', 'health')
  store.toggleCheck(undone.id)
  store.addHabit('体检', '🏥', { type: 'once', date: '2026-03-05' })
  assert.deepEqual(store.noteCounts('2026-03').map(c => [c.key, c.count]), [['help', 2]])
  assert.deepEqual(store.noteCounts('2026-02').map(c => [c.key, c.count]), [['money', 1]])
  assert.deepEqual(store.noteCounts('2026-04'), [])
})

test('addNote 记到以后的日子：先排上，不算完成', t => {
  const store = setup(t)
  const n = store.addNote('帮爸妈大扫除', 'help', '2026-03-07')
  assert.equal(n.date, '2026-03-07')
  assert.equal(store.isChecked(n.id, '2026-03-07'), false)
  assert.deepEqual(store.noteCounts('2026-03'), [])
})

test('checkAll / uncheckAll 一键打卡和取消，只动需要动的', t => {
  const store = setup(t)
  const [a, b, c] = ['A', 'B', 'C'].map(n => store.addHabit(n, '⭐'))
  const ids = [a.id, b.id, c.id]
  store.toggleCheck(b.id)
  assert.equal(store.checkAll(ids), 2)
  assert.deepEqual(ids.map(id => store.isChecked(id, '2026-03-02')), [true, true, true])
  assert.equal(store.checkAll(ids), 0)
  // 补卡的日子也能一键，新建习惯的创建日会跟着提前
  assert.equal(store.checkAll([a.id], '2026-03-01'), 1)
  assert.equal(store.getHabit(a.id).createdAt, '2026-03-01')
  assert.equal(store.uncheckAll(ids), 3)
  assert.equal(store.uncheckAll(ids), 0)
  assert.deepEqual(store.getRecords(), { '2026-03-01': [a.id] })
})
