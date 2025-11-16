// /components/RoundIconButton.js

export default {
  name: "RoundIconButton",
  props: {
    icon: { type: String, required: true },
    title: { type: String, default: "" },
    variant: { type: String, default: "default" }, // 'default' | 'primary' | 'secondary'
    size: { type: String, default: "10" },
  },
  emits: ["click"],
  computed: {
    variantClass() {
      switch (this.variant) {
        case "primary":
          return "bg-teal-600 text-white hover:bg-teal-700 shadow-md";
        case "secondary":
          return "bg-sky-500 text-white hover:bg-sky-600 shadow-md";
        default:
          return "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 shadow-sm";
      }
    },
  },
  template: `
    <button 
        :title="title" 
        type="button"
        class="flex items-center justify-center rounded-full transition-colors duration-200"
        :class="[
            'h-' + size, 
            'w-' + size,
            variantClass
        ]"
        @click.stop="$emit('click', $event)">
      <i class="fa-solid" :class="icon"></i>
    </button>
  `,
};
