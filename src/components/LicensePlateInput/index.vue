<!--
 车牌号智能输入组件
 结构：[省缩写▼][字母▼][·][5个字母数字框]
 数据格式：赣C·8086D（含点）

 输入限制：仅允许大写字母 A-Z 和数字 0-9
 通过 composition 事件正确处理中文输入法
 @author AiKiFan
-->
<template>
 <view class="plate-input">
 <!-- 上方：省 + 字母，下方：5个格子 -->
 <view class="plate-upper">
 <!-- 省简称选择器 -->
 <view class="plate-picker-box">
 <picker
 mode="selector"
 :range="PROVINCES"
 :value="provinceIndex"
 @change="onProvinceChange"
 >
 <view class="plate-picker">
 <text class="plate-picker__text">{{ province }}</text>
 </view>
 </picker>
 </view>

 <!-- 字母选择器 -->
 <view class="plate-picker-box">
 <picker
 mode="selector"
 :range="LETTERS"
 :value="letterIndex"
 @change="onLetterChange"
 >
 <view class="plate-picker">
 <text class="plate-picker__text">{{ letter }}</text>
 </view>
 </picker>
 </view>

 <!-- 中间点 -->
 <text class="plate-dot">·</text>
 </view>

 <!-- 下方：5个方框 -->
 <view class="plate-digits">
 <view
 v-for="(_, i) in 5"
 :key="i"
 class="plate-box"
 @tap="focusBox(i)"
 >
 <input
 class="plate-box__input"
 :ref="el => boxRefs[i] = el"
 maxlength="1"
 :value="digits[i]"
 @input="onDigitInput($event, i)"
 @keydown="onDigitKeydown($event, i)"
 />
 </view>
 </view>
 </view>
</template>

<script>
const PROVINCES = [
 '京', '津', '冀', '晋', '蒙', '辽', '吉', '黑',
 '沪', '苏', '浙', '皖', '闽', '赣', '鲁', '豫',
 '鄂', '湘', '粤', '桂', '琼', '渝', '川', '贵',
 '云', '藏', '陕', '甘', '青', '宁', '新'
]

const LETTERS = [
 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H',
 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R',
 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
]

/** 合法字符：仅大写字母 A-Z 和数字 0-9 */
const ALLOWED_CHARS = /^[A-Z0-9]+$/

export default {
 name: 'LicensePlateInput',

 props: {
 modelValue: {
 type: String,
 default: ''
 }
 },

 emits: ['update:modelValue'],

 data() {
 return {
 PROVINCES,
 LETTERS,
 province: '',
 provinceIndex: 0,
 letter: '',
 letterIndex: 0,
 digits: ['', '', '', '', ''],
 boxRefs: []
 }
 },

 methods: {
 onProvinceChange(e) {
 this.provinceIndex = e.detail.value
 this.province = PROVINCES[e.detail.value]
 this.emitValue()
 },

 onLetterChange(e) {
 this.letterIndex = e.detail.value
 this.letter = LETTERS[e.detail.value]
 this.emitValue()
 },

 onDigitInput(e, index) {
 // 实时过滤：仅保留大写字母 A-Z 和数字 0-9
 const raw = e.detail.value || ''
 const filtered = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
 const val = filtered.slice(-1)

 // 同步直接修改 DOM input 的 value（最可靠的方式）
 // 注意：uni-app 中 ref 回调拿到的可能是真实 DOM 元素或组件实例
 // 用 setAttribute 兜底，确保值被强制重置
 const ref = this.boxRefs[index]
 if (ref) {
 // 1. 直接赋值
 if (ref.value !== undefined) {
 ref.value = val
 }
 // 2. 通过原生 setter 触发（绕过 Vue 响应式）
 const proto = Object.getPrototypeOf(ref)
 const desc = Object.getOwnPropertyDescriptor(proto, 'value')
 if (desc && desc.set) {
 desc.set.call(ref, val)
 }
 // 3. 触发 input 事件让 Vue 同步状态
 if (typeof ref.dispatchEvent === 'function') {
 ref.dispatchEvent(new Event('input', { bubbles: true }))
 }
 }

 this.digits[index] = val

 // 跳到下一格
 if (val && index < 4) {
 this.focusBox(index + 1)
 }
 this.emitValue()
 },

 onDigitKeydown(e, index) {
 if (e.detail.value === '' && index > 0) {
 this.$nextTick(() => this.focusBox(index - 1))
 }
 },

 focusBox(index) {
 if (index < 0 || index >= 5) return
 this.$nextTick(() => {
 const input = this.boxRefs[index]
 if (input && input.focus) input.focus()
 })
 },

 emitValue() {
 const allDigits = this.digits.every(d => d !== '')
 if (this.province && this.letter && allDigits) {
 // 数据格式：赣C·8086D（含点）
 const plate = this.province + this.letter + '·' + this.digits.join('')
 this.$emit('update:modelValue', plate)
 } else {
 this.$emit('update:modelValue', '')
 }
 }
 }
}
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

.plate-input {
 display: flex;
 flex-direction: column;
 align-items: center;
 gap: 20rpx;
 width: 100%;
}

/* 上方：省 + 点 + 字母 */
.plate-upper {
 display: flex;
 align-items: center;
 gap: 16rpx;
}

/* 选择器格子 */
.plate-picker-box {
 /* picker 本身即是可点击区域 */
}

.plate-picker {
 display: flex;
 align-items: center;
 justify-content: center;
 padding: 0 20rpx;
 min-width: 96rpx;
 height: 88rpx;
 background-color: $color-bg-card;
 border: 2rpx solid $color-divider;
 border-radius: 12rpx;
 box-shadow: 0 2rpx 8rpx rgba($color-primary, 0.08);

 &__text {
 font-size: 36rpx;
 font-weight: 700;
 color: $color-primary;
 line-height: 1;
 white-space: nowrap;
 font-family: 'PingFang SC', 'Helvetica Neue', monospace;
 }
}

/* 中间点 */
.plate-dot {
 font-size: 40rpx;
 font-weight: bold;
 color: $color-text-hint;
 line-height: 1;
 padding-top: 0;
 flex-shrink: 0;
}

/* 下方：5个方框 */
.plate-digits {
 display: flex;
 gap: 12rpx;
 width: 100%;
 max-width: 560rpx;
}

.plate-box {
 flex: 1;
 height: 96rpx;
 background-color: $color-bg-card;
 border: 2rpx solid $color-divider;
 border-radius: 12rpx;
 display: flex;
 align-items: center;
 justify-content: center;
 overflow: hidden;
 box-shadow: 0 2rpx 8rpx rgba($color-primary, 0.06);

 &__input {
 width: 100%;
 height: 100%;
 text-align: center;
 font-size: 36rpx;
 font-weight: 700;
 color: $color-primary;
 font-family: 'PingFang SC', 'Helvetica Neue', monospace;
 background: transparent;
 border: none;
 caret-color: $color-primary;
 }
}
</style>
