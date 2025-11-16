// /components/BaseModal.js

export default {
  name: "BaseModal",
  props: {
    modelValue: { type: Boolean, default: false },
    title: { type: String, default: "" },
    widthClass: { type: String, default: "max-w-sm" },
    closable: { type: Boolean, default: true },
  },
  emits: ["update:modelValue"],
  methods: {
    close() {
      if (this.closable) this.$emit("update:modelValue", false);
    },
  },
  template: `
  <teleport to="#mobile-container">
    <transition name="modal-fade">
      <div v-if="modelValue" class="absolute inset-0 bg-black/60 flex items-center justify-center p-4 z-50" @click.self="close">
        <transition name="modal-pop">
          <div v-if="modelValue" class="bg-white rounded-xl shadow-xl w-full" :class="widthClass">
            <h3 class="font-bold text-xl text-slate-800 px-6 py-4" v-if="title">{{ title }}</h3>
            
            <div class="px-6 pb-4">
              <slot />
            </div>
            
            <div class="px-6 py-4 bg-slate-50 rounded-b-xl">
              <slot name="footer" />
            </div>
          </div>
        </transition>
      </div>
    </transition>
  </teleport>
  `,
};
