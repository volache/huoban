// /components/FilterBar.js

export default {
  name: "FilterBar",
  props: {
    modelValue: { type: Object, default: () => ({}) },
    filters: { type: Array, default: () => [] },
    clearText: { type: String, default: "清除篩選" },
  },
  emits: ["update:modelValue", "clear"],
  methods: {
    updateFilter(key, value) {
      const newModelValue = { ...this.modelValue, [key]: value };
      this.$emit("update:modelValue", newModelValue);
    },
  },
  template: `
  <div class="p-4 bg-white rounded-xl shadow-sm mb-4 space-y-3">
    <template v-for="f in filters" :key="f.key">
      <custom-select v-if="f.type==='select'"
                     :model-value="modelValue[f.key]"
                     @update:modelValue="updateFilter(f.key, $event)"
                     :options="f.options || []"
                     :placeholder="f.placeholder || ''"
                     :icon-class="f.icon || ''" />
      <input v-else
             :value="modelValue[f.key]"
             @input="updateFilter(f.key, $event.target.value)"
             :placeholder="f.placeholder || ''"
             class="w-full p-2 border rounded-lg" />
    </template>
    <button @click="$emit('clear')" type="button" class="w-full text-center py-2 text-slate-600 font-semibold hover:text-red-500 transition-colors">{{ clearText }}</button>
  </div>
  `,
};
