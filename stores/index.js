import {defineStore} from "pinia";

export const useIndexStore = defineStore('index', {
    state: () => ({
        storeID: null,
    }),
    getters: {
        getStoreID: (state) => state.storeID
    },
    actions: {
        setStoreID(id) {
            this.storeID = id;
        },
    }
})
