import { defineConfig, type UserConfigExport } from '@tarojs/cli'
import type { Plugin } from 'vite'

import devConfig from './dev'
import prodConfig from './prod'

/**
 * NutUI 的 dist/style.css 含 WXSS 不支持的语法，小程序端会报
 * “WXSS 文件编译错误 error at token *”，整个 vendors.wxss 被丢弃、页面空白：
 *  1) calc(数值 * var(--nut-scale-...)) 缩放表达式（WXSS 不支持 calc 乘法）
 *  2) 通配符选择器 `>*`、属性子串选择器 `[class*=...]`
 *  3) `:root` 选择器、`[dir=rtl]` 属性选择器
 * 这里在构建期把 NutUI 样式改写为 WXSS 兼容写法（仅 weapp 端生效，H5 不受影响）。
 */
function patchNutuiCssForWxss(): Plugin {
  return {
    name: 'patch-nutui-css-for-wxss',
    enforce: 'pre',
    transform(code, id) {
      if (process.env.TARO_ENV !== 'weapp') return null
      const cleanId = id.split('?')[0]
      if (!cleanId.includes('node_modules') || !cleanId.endsWith('.css')) return null

      let css = code
      // 1) 变量嵌套归一：var(--nut-scale-xxx, var(--nut-scale-f, 1)) -> var(--nut-scale-f, 1)
      css = css.replace(/var\(--nut-scale-[a-z-]+,\s*var\(--nut-scale-f,\s*1\)\)/g, 'var(--nut-scale-f, 1)')
      // 2) 数值 * var(--nut-scale-f, 1) 还原为数值（等价于乘 1）
      css = css.replace(
        /(-?\d+(?:\.\d+)?(?:rpx|px|%|vh|vw|em|rem)?)\s*\*\s*var\(--nut-scale-f,\s*1\)/g,
        '$1',
      )
      // 3) tabbar 指示器位移（变量 * 100% 无法静态求值），取初始状态
      css = css.replace(
        /calc\(\s*var\(--nutui-tabbar-select-index,\s*0\)\s*\*\s*100%\s*\)/g,
        '0%',
      )
      // 4) 安全区倍数默认为 1，去掉乘法（兼容 env(safe-area-inset-top, 0) 带默认值写法）
      css = css.replace(
        /env\(safe-area-inset-(top|bottom)[^)]*\)\s*\*\s*var\(--nutui-safe-area-multiple,\s*1\)/g,
        'env(safe-area-inset-$1)',
      )
      // 5) calc(-1 * var(x)) 改写为减法
      css = css.replace(/calc\(\s*-1\s*\*\s*var\((--[a-z-]+)\)\s*\)/g, 'calc(0px - var($1))')
      // 6) 指示器进度表达式：var(total,2) - 1 默认为 1，随后约掉 current/1 * 前缀
      css = css.replace(/\(var\(--nutui-indicator-total,\s*2\)\s*-\s*1\)/g, '1')
      css = css.replace(/var\(--nutui-indicator-current,\s*0\)\s*\/\s*1\s*\*\s*/g, '')
      // 7) calc(... * -1) 改写为减法
      css = css.replace(/calc\(([^{}]*?)\s*\*\s*-1\s*\)/g, 'calc(0rpx - ($1))')
      // 8) 字面量倍乘统一改除法（WXSS 对 calc 乘号解析报错，除号可用）：X * 2 -> X / 0.5
      css = css.replace(/\*\s*(\d+(?:\.\d+)?|\.\d+)(?=[\s,)])/g, (_m, num) => {
        const v = parseFloat(num)
        return v === 0 ? ' * 0' : ` / ${1 / v}`
      })
      // 9) 数字 * var(x, v) 同理改除法：2 * var(x, 16rpx) -> (var(x, 16rpx) / 0.5)
      css = css.replace(
        /(\d+(?:\.\d+)?)\s*\*\s*var\((--[a-z-]+,\s*(?:calc\(-?[\d.]+(?:px|rpx)\)|-?[\d.]+(?:px|rpx|%))\))/g,
        (_m, num, varPart) => {
          const v = parseFloat(num)
          return v === 0 ? '0' : `(var(${varPart}) / ${1 / v})`
        },
      )
      // 10) 通配符 / 属性子串选择器规则直接移除（仅影响 tabbar 背景铺满、navbar 子项高度、动画类时长等装饰性样式）
      css = css.replace(/[^{}]*>\*[^{}]*\{[^{}]*\}/g, '')
      css = css.replace(/[^{}]*\[class\*=[^{}]*\{[^{}]*\}/g, '')
      // 11) :root 与 [dir=rtl] 属性选择器改为 WXSS 兼容写法
      css = css.replace(/:root/g, 'page')
      css = css.replace(/\[dir=rtl\]\s*/g, '')

      return { code: css, map: null }
    },
  }
}

// https://taro-docs.jd.com/docs/next/config#defineconfig-辅助函数
export default defineConfig<'vite'>(async (merge) => {
  const baseConfig: UserConfigExport<'vite'> = {
    projectName: 'frontend',
    date: '2026-11-22',
    designWidth: 375,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      375: 2,
      828: 1.81 / 2
    },
    sourceRoot: 'src',
    outputRoot: 'dist',
    plugins: [
      "@tarojs/plugin-generator",
      "@tarojs/plugin-html"
    ],
    defineConstants: {
    },
    copy: {
      patterns: [
      ],
      options: {
      }
    },
    framework: 'react',
    compiler: {
      type: 'vite',
      vitePlugins: [patchNutuiCssForWxss()],
    },
    mini: {
      postcss: {
        pxtransform: {
          enable: true,
          config: {

          }
        },
        cssModules: {
          enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
          config: {
            namingPattern: 'module', // 转换模式，取值为 global/module
            generateScopedName: '[name]__[local]___[hash:base64:5]'
          }
        }
      },
    },
    h5: {
      publicPath: '/',
      staticDirectory: 'static',

      miniCssExtractPluginOption: {
        ignoreOrder: true,
        filename: 'css/[name].[hash].css',
        chunkFilename: 'css/[name].[chunkhash].css'
      },
      postcss: {
        autoprefixer: {
          enable: true,
          config: {}
        },
        cssModules: {
          enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
          config: {
            namingPattern: 'module', // 转换模式，取值为 global/module
            generateScopedName: '[name]__[local]___[hash:base64:5]'
          }
        }
      },
    },
  }

  process.env.BROWSERSLIST_ENV = process.env.NODE_ENV

  if (process.env.NODE_ENV === 'development') {
    // 本地开发构建配置（不混淆压缩）
    return merge({}, baseConfig, devConfig)
  }
  // 生产构建配置（默认开启压缩混淆等）
  return merge({}, baseConfig, prodConfig)
})
