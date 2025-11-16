// /components/CustomSelect.js

const { ref, watch, onMounted, onBeforeUnmount, nextTick, computed } = Vue;

export default {
  name: "CustomSelect",
  props: {
    modelValue: {
      type: [String, Number, Boolean, Object, null],
      default: null,
    },
    options: { type: [Array, Object], default: () => [] },
    placeholder: { type: String, default: "請選擇" },
    iconClass: { type: String, default: "" },
    emptyText: { type: String, default: "沒有資料" },
    disabled: { type: Boolean, default: false },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const root = ref(null);
    const btn = ref(null);

    const isOpen = ref(false);
    const hasFocus = ref(false);
    const filtered = ref([]);

    const optionsArray = computed(() => {
      const o = props.options;
      if (Array.isArray(o)) return o;
      if (o && Array.isArray(o.value)) return o.value;
      return [];
    });

    const ddTop = ref(0);
    const ddBottom = ref(0);
    const ddLeft = ref(0);
    const ddWidth = ref(0);
    const openUpward = ref(false);
    const GAP = 6;
    const zIndex = 58;

    const currentOption = () =>
      optionsArray.value.find((opt) => opt.value === props.modelValue) || null;
    const labelText = () => (currentOption() ? currentOption().text : "");

    const recomputePosition = () => {
      if (!btn.value) return;
      const rect = btn.value.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      ddWidth.value = rect.width;
      ddLeft.value = Math.max(8, Math.min(rect.left, vw - rect.width - 8));
      const below = vh - rect.bottom;
      openUpward.value = below < 240;

      if (openUpward.value) {
        ddBottom.value = Math.max(8, vh - rect.top + GAP);
      } else {
        ddTop.value = rect.bottom + GAP;
      }
    };

    const onKeydown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        hasFocus.value = false;
        close();
      }
    };

    const clickOutside = (e) => {
      if (root.value?.contains(e.target)) return;
      const menu = document.getElementById(menuId());
      if (menu?.contains(e.target)) return;
      hasFocus.value = false;
      close();
    };

    const bindGlobalListeners = (on) => {
      const fn = on ? window.addEventListener : window.removeEventListener;
      fn("scroll", recomputePosition, true);
      fn("resize", recomputePosition, true);
      fn("keydown", onKeydown, true);
      fn("mousedown", clickOutside, true);
      fn("touchstart", clickOutside, true);
    };

    const open = async () => {
      if (props.disabled) return;
      isOpen.value = true;
      hasFocus.value = true;
      filtered.value = optionsArray.value.slice();
      await nextTick();
      recomputePosition();
      bindGlobalListeners(true);
    };

    const close = () => {
      isOpen.value = false;
      bindGlobalListeners(false);
    };

    const toggle = () => (isOpen.value ? close() : open());

    const select = (val) => {
      emit("update:modelValue", val);
      close();
    };

    const uid = Math.random().toString(36).slice(2) + Date.now();
    const menuId = () => `_cs_menu_${uid}`;

    watch(optionsArray, (arr) => {
      if (!isOpen.value) return;
      filtered.value = arr.slice();
      nextTick(recomputePosition);
    });

    onMounted(() => {
      filtered.value = optionsArray.value.slice();
    });

    onBeforeUnmount(() => {
      bindGlobalListeners(false);
    });

    return {
      root,
      btn,
      isOpen,
      hasFocus,
      filtered,
      ddTop,
      ddBottom,
      ddLeft,
      ddWidth,
      openUpward,
      zIndex,
      labelText,
      currentOption,
      open,
      close,
      toggle,
      select,
      menuId,
    };
  },
  template: `
  <div ref="root" class="relative">
    <button ref="btn" type="button" :disabled="disabled"
            :class="[
              'w-full px-3 py-3 rounded-lg flex items-center justify-between bg-white outline-none',
              'disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-100',
              (hasFocus || isOpen) ? 'border border-teal-500' : 'border border-slate-300',
              isOpen ? 'relative z-[60]' : ''
            ]"
            :style="(hasFocus || isOpen) ? { boxShadow: 'inset 0 0 0 1px rgb(13 148 136)' } : {}"
            @click="toggle"
            @focus="hasFocus = true"
            @blur="hasFocus = false"
            aria-haspopup="listbox"
            :aria-expanded="isOpen ? 'true' : 'false'">
      <span class="flex items-center gap-2 text-slate-700 w-full">
        <i v-if="iconClass" :class="iconClass"></i>
        <span class="truncate" :class="currentOption() ? '' : 'text-slate-400'">
          {{ currentOption() ? labelText() : (placeholder || '請選擇') }}
        </span>
      </span>
      <i class="fa-solid ml-2" :class="isOpen ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
    </button>

    <teleport to="body">
      <div v-if="isOpen"
           :id="menuId()"
           class="fixed"
           :style="{
             left: ddLeft + 'px',
             width: ddWidth + 'px',
             zIndex: zIndex,
             top: openUpward ? 'auto' : (ddTop + 'px'),
             bottom: openUpward ? (ddBottom + 'px') : 'auto'
           }">
        <div class="bg-white rounded-lg shadow-lg border border-slate-300 overflow-auto"
             :style="openUpward
               ? { marginBottom: '-1px', maxHeight: 'min(50vh, 320px)' }
               : { marginTop: '-1px',  maxHeight: 'min(50vh, 320px)' }">
          <ul class="py-1" role="listbox">
            <li v-if="!filtered.length" class="px-3 py-2 text-slate-400 text-sm">沒有資料</li>
            <li v-for="(opt, index) in filtered" :key="opt.value || 'sep-' + index">
              <div v-if="opt.isSeparator" class="my-1 border-t border-slate-200"></div>
              <button v-else type="button"
                      class="w-full text-left px-3 py-2 hover:bg-slate-100 flex items-center justify-between"
                      role="option"
                      @click="select(opt.value)">
                <span class="truncate">{{ opt.text }}</span>
                <i v-if="opt.value === modelValue" class="fa-solid fa-check text-teal-600"></i>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </teleport>
  </div>
  `,
};
