<script setup>
import {computed, onMounted, ref} from "vue";
import Heygen from "@/components/Heygen.vue";
import Modal from "@/components/Modal/index.vue";
import {useIndexStore} from "../stores/index.js";

const STATE = {
  HOME : 'home',
  LOADING : 'loading',
  HEYGEN : 'heygen',
}
const state = ref(STATE.HOME);
const store = useIndexStore()
const heygen = ref(null);
const heygenReady = ref(false);

const modalVisible = ref(false);
const storeID = computed(() => store.getStoreId);

const onKeydown = (ev) => {
  if (ev.key === 'Escape') {
    modalVisible.value = !modalVisible.value;
  }
};

const onStoreIdChange = (ev) => {
  store.setStoreID(ev.target.value);
};

const setState = (newState) => {
  state.value = newState;
  if (newState === STATE.LOADING) {
      if (heygen.value) {
        heygen.value.onStart();
      }
  }
};

const text = computed(() => {
  switch (state.value) {
    case STATE.HOME:
      return 'Bienvenue';
    case STATE.LOADING:
      return 'Chargement';
    case STATE.HEYGEN:
      return '';
    default:
      return '';
  }
});

const onHeygenReady = () => {
  heygenReady.value = true;
  state.value = STATE.HEYGEN;
};

onMounted(() => {
  document.addEventListener('keydown', onKeydown);
});
</script>

<template>
  <main>
    <Modal :visible="modalVisible">
        <div>Store ID</div>
        <input type="text" v-model="storeID" placeholder="Enter Store ID" @change="onStoreIdChange"/>
    </Modal>
    <div class="background">
      <video autoplay loop muted playsinline v-if="!heygenReady">
        <source src="@/assets/loop.mp4" type="video/mp4">
      </video>
      <Heygen ref="heygen" v-show="heygenReady" @ready="onHeygenReady" @close="setState(STATE.HOME)"/>
    </div>
    <div class="content">
      <h1 class="text">{{ text }}</h1>
      <button class="cta" v-if="state === STATE.HOME" @click="setState(STATE.LOADING)">SCAN</button>
      <img class="loading" v-else-if="state === STATE.LOADING" src="@/assets/loading.gif" alt="">
    </div>
  </main>
</template>

<style scoped lang="scss">

main {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;

  video {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100%;
    height: 100%;
    transform: translate(-50%, -50%);
    object-fit: cover;
  }
}

.text {
  text-align: center;
  color: black;
  font-weight: bold;
  font-size: 5rem;
}

.content {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width:  100%;
  padding: 200px 50px;
  display: flex;
  align-items: center;
  justify-content: end;
  flex-direction: column;
  gap: 50px;
  pointer-events: none;
  z-index: 1;
}

.cta {
  background-color: #f0f0f0;
  color: black;
  border: none;
  padding: 20px 40px;
  font-size: 2rem;
  text-transform: uppercase;
  font-weight: bold;
  cursor: pointer;
  margin-top: 20px;
  border-radius: 10px;
  pointer-events:  auto;
}

.loading {
  width: 100px;
}

</style>
