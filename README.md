# daily-stars-weapp

English | [简体中文](README.zh-CN.md)

Daily Stars — a minimal WeChat mini program for daily habit check-in: finish a habit, light up a star.

Built as a native mini program. All data stays on the device (`wx.setStorageSync`) — no backend, no user data collected.

## Features

- **Today**: tap a habit card to check in or undo; shows today's progress, current streak and total count; stars rain down when everything is done
- **One-tap check-in**: "一键完成 / 一键补全" checks off the whole list for the viewed day, and "全部取消" undoes it (with confirmation); also available for any past day in the calendar, including habits added later. Single taps still work as usual
- **Make-up check-ins**: switch to yesterday or the day before on the home page, or tap any past date in the stats calendar; habits created today can be made up too
- **Habit types**: daily (shows every day) or on a set date (shows only on the chosen date, any date; upcoming ones are listed under "即将到来")
- **Quick notes**: "✎ 记一件事" on the home page — pick a category (help others / health / money / study / other) and write a line. Any date: today or earlier counts as a done star right away; future ones are scheduled and checked in on the day
- **Manage habits**: add, rename, change icon, delete (removes its records too), reorder
- **Stats**
  - Total stars, days checked in, longest streak
  - Month calendar: tap the title to jump to any year/month, "回到今天" brings you back; past days show completion and can be made up, future days with plans get a dot and show the day's plan
  - Quick notes by category (one month / all time), tap a category for details
  - Per-habit current streak / longest streak / total
- **2048**: a little break at the bottom of the stats page — classic 2048 rules, swipe to play, progress and best score are saved
- **Share** the home and stats pages with friends
- **Dark mode** following the system
- **Screen reader** labels for VoiceOver / TalkBack

## Getting started

1. Open the project folder in [WeChat DevTools](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. `project.config.json` uses the test AppID `touristappid`. To preview on a phone or publish, put your own AppID in `project.private.config.json` (git-ignored, and DevTools reads it first) instead of committing it:

   ```json
   {
     "appid": "wxYourAppID"
   }
   ```

## Tests

```shell
npm test
```

Uses Node's built-in test runner (Node 20+) with a mocked `wx` storage to test check-ins, streaks, make-ups, quick notes and calendar logic in `utils/store.js` and `utils/calendar.js`. `tests/`, `package.json` and `.github/` are excluded in `project.config.json`, so they are not packaged into the mini program.

GitHub Actions (`.github/workflows/test.yml`) runs the tests on every pull request and push to `main`.

## Project layout

```txt
app.js / app.json / app.wxss   entry, pages & tab bar config, global styles and light/dark variables
theme.json                     light/dark colors for the navigation bar and tab bar
utils/store.js                 local storage and stats for habits, check-ins and quick notes
utils/calendar.js              date math for the stats calendar
utils/game2048.js              2048 game rules
pages/index                    today's check-ins, quick notes
pages/edit                     add / edit a habit
pages/stats                    stats and calendar
pages/game                     2048 mini game
tests/                         unit tests
```

## License

[MIT](LICENSE)
