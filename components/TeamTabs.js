// /components/TeamTabs.js

export default {
  name: "TeamTabs",
  props: {
    modelValue: { type: String, default: "" },
    tabs: { type: Array, default: () => [] }, // [{value, text}]
    dense: { type: Boolean, default: false },
    edgePadding: { type: Boolean, default: true },
  },
  emits: ["update:modelValue"],
  template: `
  <div :class="[
        'border-b border-slate-300',
        edgePadding ? '-mx-6 px-6' : '',
        dense ? 'mb-2' : 'mb-4',
        'overflow-x-auto whitespace-nowrap'
      ]">
    <button v-for="t in tabs" :key="t.value"
            @click="$emit('update:modelValue', t.value)"
            type="button"
            class="py-2 px-4 text-sm font-semibold"
            :class="modelValue === t.value ? 'border-b-2 border-teal-500 text-teal-600' : 'text-slate-500 hover:text-slate-800'">
      {{ t.text }}
    </button>
  </div>
  `,
};
