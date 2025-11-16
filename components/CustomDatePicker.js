// /components/CustomDatePicker.js

const { ref, computed, watch } = Vue;

export default {
  name: "CustomDatePicker",
  props: {
    modelValue: { type: String, default: "" }, // YYYY-MM-DD
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const showModal = ref(false);
    const hasFocus = ref(false);

    const currentDate = computed(() => {
      if (!props.modelValue) return new Date();
      const parts = props.modelValue.split("-").map((p) => parseInt(p, 10));
      return new Date(parts[0], parts[1] - 1, parts[2]);
    });

    const year = ref(currentDate.value.getFullYear());
    const month = ref(currentDate.value.getMonth());

    const monthDisplay = computed(() => {
      return `${year.value} 年 ${month.value + 1} 月`;
    });

    const daysInMonth = computed(() => {
      const date = new Date(year.value, month.value + 1, 0);
      return Array.from({ length: date.getDate() }, (_, i) => i + 1);
    });

    const firstDayOffset = computed(() => {
      const firstDay = new Date(year.value, month.value, 1).getDay();
      return Array.from({ length: firstDay });
    });

    const formattedDate = computed(() => {
      if (!props.modelValue) return "選擇日期";
      return props.modelValue; // 直接返回 YYYY-MM-DD 格式的 modelValue
    });

    const selectDate = (day) => {
      const d = new Date(year.value, month.value, day);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      emit("update:modelValue", `${y}-${m}-${dd}`);
      showModal.value = false;
    };

    const isSelected = (day) => {
      if (!props.modelValue) return false;
      const selectedDate = currentDate.value;
      return (
        selectedDate.getFullYear() === year.value &&
        selectedDate.getMonth() === month.value &&
        selectedDate.getDate() === day
      );
    };

    const isToday = (day) => {
      const today = new Date();
      return (
        today.getFullYear() === year.value &&
        today.getMonth() === month.value &&
        today.getDate() === day
      );
    };

    const goToPrevMonth = () => {
      if (month.value === 0) {
        month.value = 11;
        year.value--;
      } else {
        month.value--;
      }
    };

    const goToNextMonth = () => {
      if (month.value === 11) {
        month.value = 0;
        year.value++;
      } else {
        month.value++;
      }
    };

    watch(
      () => props.modelValue,
      (newVal) => {
        if (newVal) {
          const newDate = new Date(
            newVal.split("-")[0],
            newVal.split("-")[1] - 1,
            newVal.split("-")[2]
          );
          year.value = newDate.getFullYear();
          month.value = newDate.getMonth();
        }
      }
    );

    return {
      showModal,
      hasFocus,
      year,
      month,
      monthDisplay,
      daysInMonth,
      firstDayOffset,
      formattedDate,
      selectDate,
      isSelected,
      isToday,
      goToPrevMonth,
      goToNextMonth,
    };
  },
  template: `
    <div>
      <button @click="showModal = true" type="button" 
              class="p-3 w-full rounded-lg bg-white flex items-center border"
              :class="[(hasFocus || showModal) ? 'border-teal-500' : 'border-slate-300']"
              :style="(hasFocus || showModal) ? { boxShadow: 'inset 0 0 0 1px #0d9488' } : {}"
              @focus="hasFocus = true"
              @blur="hasFocus = false">
        <i class="fa-solid fa-calendar-days fa-fw mr-2 text-slate-500"></i>
        <span :class="{'text-slate-400': !modelValue}">{{ formattedDate }}</span>
      </button>

      <teleport to="#mobile-container">
        <transition name="modal-fade">
          <div v-if="showModal" @click.self="showModal = false" class="absolute inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <transition name="modal-pop">
              <div v-if="showModal" class="bg-white rounded-xl shadow-xl w-full max-w-sm">
                <div class="px-6 py-4">
                  <div class="flex items-center justify-between mb-4">
                    <button @click="goToPrevMonth" class="w-10 h-10 rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
                      <i class="fa-solid fa-chevron-left"></i>
                    </button>
                    <div class="font-bold text-lg text-slate-700">{{ monthDisplay }}</div>
                    <button @click="goToNextMonth" class="w-10 h-10 rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
                      <i class="fa-solid fa-chevron-right"></i>
                    </button>
                  </div>
                  
                  <div class="grid grid-cols-7 gap-1 text-center text-xs text-slate-500 mb-2">
                    <div v-for="day in ['日', '一', '二', '三', '四', '五', '六']" :key="day">{{ day }}</div>
                  </div>
                  
                  <div class="grid grid-cols-7 gap-1">
                    <div v-for="i in firstDayOffset" :key="'offset-' + i"></div>
                    <div v-for="day in daysInMonth" :key="day" class="flex justify-center">
                      <button @click="selectDate(day)" 
                              class="w-10 h-10 rounded-full transition-colors"
                              :class="{
                                'bg-teal-600 text-white': isSelected(day),
                                'text-teal-600 font-bold border-2 border-teal-600': isToday(day) && !isSelected(day),
                                'hover:bg-slate-100': !isSelected(day)
                              }">
                        {{ day }}
                      </button>
                    </div>
                  </div>
                </div>
                <div class="px-6 py-4 bg-slate-50 rounded-b-xl">
                  <div class="flex justify-end">
                    <button @click="showModal = false" type="button" class="bg-slate-200 text-slate-700 font-semibold py-2 px-4 text-sm rounded-lg hover:bg-slate-300">
                      取消
                    </button>
                  </div>
                </div>
              </div>
            </transition>
          </div>
        </transition>
      </teleport>
    </div>
  `,
};
