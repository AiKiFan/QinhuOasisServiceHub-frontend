/**
 * 主题切换工具函数
 * 支持深色/浅色主题切换
 * @author AiKiFan
 */

/** 主题在 Storage 中的键名 */
const STORAGE_KEY_THEME = 'qinhu_theme'

/** 主题类型 */
export const THEME_TYPE = {
  LIGHT: 'light',
  DARK: 'dark',
}

/** 默认主题 */
const DEFAULT_THEME = THEME_TYPE.LIGHT

/**
 * 保存主题偏好
 * @param {'light'|'dark'} theme
 */
export function saveTheme(theme) {
  uni.setStorageSync(STORAGE_KEY_THEME, theme)
  applyTheme(theme)
}

/**
 * 读取主题偏好，未设置时返回默认值
 * @returns {'light'|'dark'}
 */
export function getTheme() {
  return uni.getStorageSync(STORAGE_KEY_THEME) || DEFAULT_THEME
}

/**
 * 切换主题（浅色 ↔ 深色）
 * @returns {'light'|'dark'} 切换后的主题
 */
export function toggleTheme() {
  const current = getTheme()
  const next = current === THEME_TYPE.LIGHT ? THEME_TYPE.DARK : THEME_TYPE.LIGHT
  saveTheme(next)
  return next
}

/**
 * 应用主题到页面（修改CSS变量）
 * @param {'light'|'dark'} theme
 */
export function applyTheme(theme) {
  // 获取页面容器
  const pages = getCurrentPages()
  if (pages.length === 0) return

  const page = pages[pages.length - 1]
  const $vm = page.$vm

  if (!$vm) return

  // 通过修改页面样式类来应用主题
  if (theme === THEME_TYPE.DARK) {
    $vm.$el.classList.add('theme-dark')
    $vm.$el.classList.remove('theme-light')
  } else {
    $vm.$el.classList.add('theme-light')
    $vm.$el.classList.remove('theme-dark')
  }

  // 提示用户
  uni.showToast({ title: theme === THEME_TYPE.DARK ? '已切换到深色模式' : '已切换到浅色模式', icon: 'success', duration: 1000 })
}
