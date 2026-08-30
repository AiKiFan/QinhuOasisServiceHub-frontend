<!-- @author AiKiFan -->
<script setup>
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { language, toggleLanguage } from '@/utils/i18n'

function isEditableTarget(target) {
  if (!target || typeof target !== 'object') {
    return false
  }

  const tagName = typeof target.tagName === 'string' ? target.tagName.toLowerCase() : ''
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable === true
}

const pageKey = computed(() => `page-${language.value}`)

function handleGlobalLanguageShortcut(event) {
  if (typeof window === 'undefined') {
    return
  }

  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) {
    return
  }

  if (event.key?.toLowerCase() !== 's') {
    return
  }

  if (isEditableTarget(event.target)) {
    return
  }

  const nextLang = toggleLanguage()
  uni.showToast({
    title: nextLang === 'en-US' ? 'Switched to English' : '切换到中文',
    icon: 'none',
  })

}

onMounted(() => {
  if (typeof window === 'undefined') {
    return
  }

  window.addEventListener('keydown', handleGlobalLanguageShortcut)
})

onBeforeUnmount(() => {
  if (typeof window === 'undefined') {
    return
  }

  window.removeEventListener('keydown', handleGlobalLanguageShortcut)
})
</script>

<template>
  <page :key="pageKey" />
</template>

<style lang="scss">
@import './uni.scss';

page {
  background-color: $color-bg-page;
  font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

/* H5 瀵艰埅鏍忔爣棰樺瓧浣撶缉灏?*/
uni-page-head .uni-page-head__title {
  font-size: 14px !important;
}
</style>
