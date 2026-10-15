# daily-stars-weapp

Daily Stars — a minimal WeChat mini program for daily habit check-in

每天完成一个习惯就点亮一颗星。原生小程序，数据存在本地（`wx.setStorageSync`），无需后端。

## 功能

- **今日打卡**：点击习惯卡片打卡/取消，显示今日进度、连续天数、累计次数；全部完成时撒星星
- **一键打卡**：首页「一键完成 / 一键补全」把当天列表全部打上，全部完成后可「全部取消」（需确认）；月历选中过去某天也能一键补全（包括后来新增的习惯）。单个点击照常可用
- **补卡**：首页可快速切到昨天、前天补卡；统计页月历点任意过去日期也能补，今天新建的习惯也能补
- **习惯管理**：新增、修改名称和图标、删除（同时清除其打卡记录）、调整顺序
- **随手记**：首页「记一件事」，选类别（助人 / 健康 / 理财 / 学习 / 其他）写一句话，日期任意：今天及以前的直接算完成的一颗星，以后的先排进「即将到来」，到那天再打卡；统计页按类别显示本月次数
- **习惯类型**：每天（每天出现）或指定日（只在选定的那天出现，日期不限，以后的列在首页「即将到来」）
- **统计**：累计星星、打卡天数、最长连续；月历（前后任意翻月；过去的日子看完成情况、可补卡，以后的日子有安排会打点，点开看当天计划）；每个习惯的连续/最长/累计
- **深色模式**：跟随系统

## 运行

1. 打开 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)，导入本目录
2. 默认使用测试号 `touristappid`；要真机预览或发布，在 `project.config.json` 中改成你自己的 AppID

## 测试

```shell
npm test
```

用 Node 自带的测试框架（需 Node 20+）模拟 `wx` 存储，测试 `utils/store.js` 的打卡与连续天数逻辑。`tests/` 和 `package.json` 已在 `project.config.json` 中排除，不会打包进小程序。

开 PR 或推送到 `main` 时，GitHub Actions（`.github/workflows/test.yml`）会自动运行测试。

## 目录

```txt
app.js / app.json / app.wxss   全局入口、页面与 tabBar 配置、全局样式与深浅色变量
theme.json                     导航栏、tabBar 的深浅色配置
utils/store.js                 习惯与打卡记录的本地存储、连续天数计算
utils/calendar.js              统计页月历的日期计算
pages/index                    今日打卡
pages/edit                     新增 / 编辑习惯
pages/stats                    统计
tests/                         store 单元测试
```
