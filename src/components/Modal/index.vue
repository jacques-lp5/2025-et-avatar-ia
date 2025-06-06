<template>
  <div ref="root" class="modal">
    <div ref="inner" class="modal__inner">
      <div class="modal__content">
        <slot/>
      </div>
    </div>
  </div>
</template>

<script setup>
import {ref, watch, defineProps, defineEmits} from 'vue'
import {onClickOutside} from '@vueuse/core'
import {gsap} from 'gsap'

const emit = defineEmits(['close'])
const props = defineProps({
  visible: Boolean,
  closable: {
    type: Boolean,
    default: true
  },
})
const root = ref(null)
const inner = ref(null)

watch(() => props.visible, (newVisible) => {
  const tl = gsap.timeline()
  if (newVisible) {
    tl.to(root.value, {
      autoAlpha: 1,
      duration: 0.2,
      ease: 'linear'
    }, 0)
    tl.to(root.value.querySelector('.modal__inner'), {
      maxHeight: `calc(100vh - 40px)`,
      duration: 0.3,
      ease: 'power2.out'
    }, 0)
    tl.to(root.value.querySelectorAll('.modal__inner *'), {
      autoAlpha: 1,
      duration: 0.2,
      ease: 'linear',
    }, 0.2)
  } else {
    tl.to(root.value.querySelectorAll('.modal__inner *'), {
      autoAlpha: 0,
      duration: 0.2,
      ease: 'linear',
    }, 0)
    tl.to(root.value.querySelector('.modal__inner'), {
      maxHeight: 0,
      duration: 0.3,
      ease: 'power2.out'
    }, 0)
    tl.to(root.value, {
      autoAlpha: 0,
      duration: 0.2,
      ease: 'linear'
    }, 0)
  }
})

const close = (ev) => {
  if (!props.closable) return
  emit('close')
}

onClickOutside(inner, () => {
  close()
})

</script>

<style lang="scss" scoped>
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  visibility: hidden;

  &__inner {
    width: 80vw;
    height: 80vh;
    position: relative;
    max-height: 0;
    background: white;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
    border-radius: 40px;

    & > * {
      opacity: 0;
    }
  }

  &__content {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  &__close {
    position: absolute;
    top: 34px;
    right: 42px;
    z-index: 1;
    cursor: pointer;
  }
}
</style>