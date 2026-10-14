# daily-stars-weapp

Daily Stars — a minimal WeChat mini program for daily habit check-in

每天完成一个习惯就点亮一颗星。原生小程序，数据存在本地（`wx.setStorageSync`），无需后端。

## 功能

- **今日打卡**：点击习惯卡片打卡/取消，显示今日进度、连续天数、累计次数；长按编辑
- **习惯管理**：新增、修改名称和图标、删除（同时清除其打卡记录）
- **统计**：累计星星、打卡天数、最长连续；近 5 周热力格；每个习惯的连续/最长/累计

## 运行

1. 打开 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)，导入本目录
2. 默认使用测试号 `touristappid`；要真机预览或发布，在 `project.config.json` 中改成你自己的 AppID

## 目录

```txt
app.js / app.json / app.wxss   全局入口、页面与 tabBar 配置、全局样式
utils/store.js                 习惯与打卡记录的本地存储、连续天数计算
pages/index                    今日打卡
pages/edit                     新增 / 编辑习惯
pages/stats                    统计
```
