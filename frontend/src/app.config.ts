export default defineAppConfig({
  pages: ['pages/login/login', 'pages/home/home'],
  subPackages: [
    {
      // 课堂互动分包：课堂 / 测验 / 报告 / 学情，主包只保留登录与首页（分包加载优化）
      root: 'packageClass',
      pages: [
        'classroom/classroom',
        'quiz/quiz',
        'report/report',
        'me/me'
      ]
    }
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#f4efe4',
    navigationBarTitleText: 'ClassMate',
    navigationBarTextStyle: 'black'
  }
})
