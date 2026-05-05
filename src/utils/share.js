/**
 * 分享功能工具
 * 支持分享到微信、朋友圈、复制链接、生成分享海报等功能
 * @author AiKiKiFan
 */

import { showToast, showModal } from '@/utils/common'

/**
 * 分享平台类型
 */
const SHARE_PLATFORMS = {
  WECHAT: 'wechat',           // 微信好友
  MOMENTS: 'moments',          // 朋友圈
  LINK: 'link',                // 复制链接
  POSTER: 'poster',            // 生成海报
  QQ: 'qq',                    // QQ
  SINA: 'sina',                // 微博
}

/**
 * 分享场景类型
 */
const SHARE_SCENES = {
  SCENIC: 'scenic',            // 景点
  INTERPRETER: 'interpreter',  // 讲解员
  RESTAURANT: 'restaurant',    // 餐厅
  HOTEL: 'hotel',              // 酒店
  ACTIVITY: 'activity',        // 活动
}

/**
 * 分享数据结构
 * @param {string} type 分享类型
 * @param {string} id 资源ID
 * @param {string} title 标题
 * @param {string} description 描述
 * @param {string} imageUrl 图片URL
 * @param {string} url 分享链接
 */
class ShareData {
  constructor({ type, id, title, description, imageUrl, url }) {
    this.type = type
    this.id = id
    this.title = title
    this.description = description
    this.imageUrl = imageUrl
    this.url = url
    
    // 生成短链接（简化版）
    this.shortUrl = this.generateShortUrl()
  }
  
  /**
   * 生成短链接
   */
  generateShortUrl() {
    // 这里可以调用短链接服务API
    // 暂时返回原链接
    return this.url
  }
}

/**
 * 分享管理器
 */
class ShareManager {
  constructor() {
    this.currentShareData = null
  }
  
  /**
   * 设置分享数据
   * @param {Object} data 分享数据
   */
  setShareData(data) {
    this.currentShareData = new ShareData(data)
    return this
  }
  
  /**
   * 显示分享面板
   */
  showSharePanel() {
    if (!this.currentShareData) {
      showToast('分享数据未设置')
      return
    }
    
    uni.showActionSheet({
      itemList: ['微信好友', '朋友圈', '复制链接', '生成海报'],
      success: (res) => {
        const platforms = [
          SHARE_PLATFORMS.WECHAT,
          SHARE_PLATFORMS.MOMENTS,
          SHARE_PLATFORMS.LINK,
          SHARE_PLATFORMS.POSTER,
        ]
        
        this.share(platforms[res.tapIndex])
      },
    })
  }
  
  /**
   * 执行分享
   * @param {string} platform 分享平台
   */
  async share(platform) {
    if (!this.currentShareData) {
      showToast('分享数据未设置')
      return
    }
    
    const data = this.currentShareData
    
    switch (platform) {
      case SHARE_PLATFORMS.WECHAT:
        await this.shareToWeChat(data)
        break
        
      case SHARE_PLATFORMS.MOMENTS:
        await this.shareToMoments(data)
        break
        
      case SHARE_PLATFORMS.LINK:
        await this.shareLink(data)
        break
        
      case SHARE_PLATFORMS.POSTER:
        await this.generatePoster(data)
        break
        
      case SHARE_PLATFORMS.QQ:
        await this.shareToQQ(data)
        break
        
      case SHARE_PLATFORMS.SINA:
        await this.shareToSina(data)
        break
        
      default:
        showToast('暂不支持该分享方式')
    }
  }
  
  /**
   * 分享到微信好友
   */
  async shareToWeChat(data) {
    try {
      // #ifdef MP-WEIXIN
      await uni.share({
        provider: 'weixin',
        scene: 'WXSceneSession',
        type: 0,
        title: data.title,
        summary: data.description,
        href: data.url,
        imageUrl: data.imageUrl,
      })
      showToast('分享成功')
      // #endif
      
      // #ifndef MP-WEIXIN
      showToast('微信分享仅支持小程序环境')
      // #endif
      
      this.recordShareHistory('wechat', data)
    } catch (error) {
      console.error('分享到微信失败:', error)
      showToast('分享失败')
    }
  }
  
  /**
   * 分享到朋友圈
   */
  async shareToMoments(data) {
    try {
      // #ifdef MP-WEIXIN
      await uni.share({
        provider: 'weixin',
        scene: 'WXSceneTimeline',
        type: 0,
        title: data.title,
        summary: data.description,
        href: data.url,
        imageUrl: data.imageUrl,
      })
      showToast('分享成功')
      // #endif
      
      // #ifndef MP-WEIXIN
      showToast('朋友圈分享仅支持小程序环境')
      // #endif
      
      this.recordShareHistory('moments', data)
    } catch (error) {
      console.error('分享到朋友圈失败:', error)
      showToast('分享失败')
    }
  }
  
  /**
   * 复制分享链接
   */
  async shareLink(data) {
    try {
      await uni.setClipboardData({
        data: data.url,
      })
      showToast('链接已复制，可以发送给好友')
      this.recordShareHistory('link', data)
    } catch (error) {
      console.error('复制链接失败:', error)
      showToast('复制失败')
    }
  }
  
  /**
   * 生成分享海报
   */
  async generatePoster(data) {
    try {
      showToast('正在生成海报...')
      
      // 调用后端API生成海报
      const response = await uni.request({
        url: '/api/share/poster',
        method: 'POST',
        data: {
          type: data.type,
          id: data.id,
          title: data.title,
          description: data.description,
          imageUrl: data.imageUrl,
        },
      })
      
      if (response.data.code === 200) {
        const posterUrl = response.data.data.posterUrl
        
        // 预览海报
        uni.previewImage({
          urls: [posterUrl],
          current: posterUrl,
        })
        
        // 保存到相册
        uni.showActionSheet({
          itemList: ['保存到相册'],
          success: async (res) => {
            if (res.tapIndex === 0) {
              await this.saveImageToPhotosAlbum(posterUrl)
            }
          },
        })
        
        this.recordShareHistory('poster', data)
      } else {
        showToast('海报生成失败')
      }
    } catch (error) {
      console.error('生成海报失败:', error)
      showToast('海报生成失败')
    }
  }
  
  /**
   * 分享到QQ
   */
  async shareToQQ(data) {
    try {
      // #ifdef H5
      if (window.mqq) {
        window.mqq.data.setShareInfo({
          share_url: data.url,
          share_title: data.title,
          share_desc: data.description,
          share_img_url: data.imageUrl,
        })
        showToast('请点击分享按钮')
      } else {
        showToast('请在QQ浏览器中打开')
      }
      // #endif
      
      this.recordShareHistory('qq', data)
    } catch (error) {
      console.error('分享到QQ失败:', error)
      showToast('分享失败')
    }
  }
  
  /**
   * 分享到微博
   */
  async shareToSina(data) {
    try {
      // #ifdef H5
      const shareUrl = `http://service.weibo.com/share/share.php?title=${encodeURIComponent(data.title)}&url=${encodeURIComponent(data.url)}&pic=${encodeURIComponent(data.imageUrl)}`
      window.open(shareUrl, '_blank')
      // #endif
      
      this.recordShareHistory('sina', data)
    } catch (error) {
      console.error('分享到微博失败:', error)
      showToast('分享失败')
    }
  }
  
  /**
   * 保存图片到相册
   */
  async saveImageToPhotosAlbum(imageUrl) {
    try {
      showToast('正在保存...')
      
      // 下载图片
      const downloadRes = await uni.downloadFile({
        url: imageUrl,
      })
      
      // 保存到相册
      await uni.saveImageToPhotosAlbum({
        filePath: downloadRes.tempFilePath,
      })
      
      showToast('已保存到相册')
    } catch (error) {
      console.error('保存图片失败:', error)
      
      // 用户拒绝授权
      if (error.errMsg.includes('auth deny')) {
        showModal({
          title: '提示',
          content: '需要您授权保存图片到相册',
          confirmText: '去授权',
          success: (res) => {
            if (res.confirm) {
              uni.openSetting()
            }
          },
        })
      } else {
        showToast('保存失败')
      }
    }
  }
  
  /**
   * 记录分享历史
   */
  recordShareHistory(platform, data) {
    try {
      const history = uni.getStorageSync('share_history') || []
      
      history.unshift({
        platform,
        type: data.type,
        id: data.id,
        title: data.title,
        timestamp: Date.now(),
      })
      
      // 只保留最近50条记录
      const trimmedHistory = history.slice(0, 50)
      
      uni.setStorageSync('share_history', trimmedHistory)
      
      // 上报分享统计数据
      this.reportShareStats(platform, data)
    } catch (error) {
      console.error('记录分享历史失败:', error)
    }
  }
  
  /**
   * 上报分享统计数据
   */
  reportShareStats(platform, data) {
    try {
      // 调用统计API
      uni.request({
        url: '/api/analytics/share',
        method: 'POST',
        data: {
          platform,
          type: data.type,
          id: data.id,
          timestamp: Date.now(),
        },
      })
    } catch (error) {
      console.error('上报分享统计失败:', error)
    }
  }
  
  /**
   * 获取分享历史
   */
  getShareHistory() {
    try {
      return uni.getStorageSync('share_history') || []
    } catch (error) {
      console.error('获取分享历史失败:', error)
      return []
    }
  }
}

// 创建全局实例
const shareManager = new ShareManager()

/**
 * 快捷分享方法
 * @param {Object} data 分享数据
 */
function quickShare(data) {
  return shareManager.setShareData(data).showSharePanel()
}

/**
 * 分享到微信好友
 * @param {Object} data 分享数据
 */
function shareToWeChat(data) {
  return shareManager.setShareData(data).share(SHARE_PLATFORMS.WECHAT)
}

/**
 * 分享到朋友圈
 * @param {Object} data 分享数据
 */
function shareToMoments(data) {
  return shareManager.setShareData(data).share(SHARE_PLATFORMS.MOMENTS)
}

/**
 * 复制分享链接
 * @param {Object} data 分享数据
 */
function shareLink(data) {
  return shareManager.setShareData(data).share(SHARE_PLATFORMS.LINK)
}

/**
 * 生成分享海报
 * @param {Object} data) 分享数据
 */
function generateSharePoster(data) {
  return shareManager.setShareData(data).share(SHARE_PLATFORMS.POSTER)
}

export {
  SHARE_PLATFORMS,
  SHARE_SCENES,
  ShareData,
  ShareManager,
  shareManager,
  quickShare,
  shareToWeChat,
  shareToMoments,
  shareLink,
  generateSharePoster,
}

export default shareManager