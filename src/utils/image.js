/**
 * 将 MinIO 不可达地址替换为当前页面可访问的地址
 *
 * 公共读策略下，图片 URL 不带预签名参数，格式为：
 * http://localhost:9000/bucket/20260524/xxx.jpg
 *
 * 本地开发（localhost/127.0.0.1）直接返回原 URL
 * 手机访问时，将 localhost/127.0.0.1 替换为当前页面 hostname
 *
 * 抽离到工具方法，便于在所有需要预览大图的地方统一调用
 *
 * @param {string} rawUrl 原始 URL
 * @returns {string} 替换后可访问的 URL
 */
export function buildAccessibleUrl(rawUrl) {
 if (!rawUrl) return ''
 // 非 HTTP 地址（相对路径等）直接返回
 if (!rawUrl.match(/^https?:\/\//)) return rawUrl
 // 本地开发环境（hostname 是 localhost / 127.0.0.1）直接返回原 URL
 if (typeof location !== 'undefined'
 && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
 return rawUrl
 }
 // 手机/其他设备访问：替换 localhost/127.0.0.1 为当前 hostname
 return rawUrl.replace(/http:\/\/(localhost|127\.0\.0\.1):9000/g,
 `${location.protocol}//${location.hostname}:9000`)
}

/**
 * 统一封装 uni.previewImage，自动对 URLs 做可访问性处理
 * 解决手机端预览大图时因 URL 仍是 localhost 导致图片无法加载的问题
 *
 * @param {Object} options
 * @param {string[]} options.urls 图片 URL 列表
 * @param {string} [options.current] 当前显示的图片 URL
 */
export function previewImage(options) {
 const { urls, current } = options || {}
 if (!urls || urls.length === 0) return

 const accessibleUrls = urls.map(buildAccessibleUrl)
 const accessibleCurrent = current ? buildAccessibleUrl(current) : accessibleUrls[0]

 // #ifdef H5
 // H5 端 uni.previewImage 实现是将 URL 注入到 img 标签中展示
 // 注入的 img 标签在原生 HTML 容器中，可以直接加载外部图片
 // #endif

 uni.previewImage({
 urls: accessibleUrls,
 current: accessibleCurrent,
 })
}
