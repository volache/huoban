// /views/DashboardView.js

const { inject, ref, watch, computed, onMounted, onBeforeUnmount, nextTick } =
  Vue;

export default {
  name: "DashboardView",
  setup() {
    const dashboard = inject("dashboard");
    const getStatusColor = inject("getStatusColor");
    const membersData = inject("members");
    const auth = inject("auth");

    const showActions = ref(false);
    const actionsButton = ref(null);
    const actionsMenu = ref(null);

    const handleClickOutside = (event) => {
      if (
        showActions.value &&
        actionsButton.value?.$el &&
        !actionsButton.value.$el.contains(event.target) &&
        actionsMenu.value &&
        !actionsMenu.value.contains(event.target)
      ) {
        showActions.value = false;
      }
    };

    onMounted(() => {
      nextTick(() => {
        document.addEventListener("click", handleClickOutside);
      });
    });

    onBeforeUnmount(() => {
      document.removeEventListener("click", handleClickOutside);
    });

    const startAction = (a) => {
      dashboard.startQuickEdit(a);
      showActions.value = false;
    };
    const switchToBaseEditMode = () => {
      dashboard.cancelQuickEdit();
      dashboard.isBaseEditMode.value = true;
      showActions.value = false;
    };

    const getOvertimeHours = (day, memberId) => {
      const evts = (
        dashboard.finalSchedule.value?.[day]?.[memberId]?.events || []
      ).filter((e) => e.eventType === "加班");
      return evts.reduce((sum, e) => sum + (e.hours || 0), 0);
    };

    const teamTabs = computed(() =>
      (membersData?.teams.value || []).map((t) => ({ value: t, text: t }))
    );

    watch(
      () => dashboard?.isQuickEditMode.value,
      (v) => v && (showActions.value = false)
    );
    watch(
      () => dashboard?.isBaseEditMode.value,
      (v) => v && (showActions.value = false)
    );

    return {
      dashboard,
      getStatusColor,
      membersData,
      auth,
      teamTabs,
      showActions,
      actionsButton,
      actionsMenu,
      startAction,
      switchToBaseEditMode,
      getOvertimeHours,
    };
  },
  template: `
    <div v-if="dashboard && membersData" class="flex flex-col h-full">
      <div class="shrink-0">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-2xl font-bold text-slate-700">出勤狀況總覽</h2>
          <div class="relative">
            <round-icon-button
              ref="actionsButton"
              icon="fa-bolt"
              title="快速操作"
              @click="showActions = !showActions"
            />
            <transition name="dropdown-fade">
              <div v-if="showActions" ref="actionsMenu" class="absolute top-full right-0 mt-2 w-52 bg-white rounded-lg shadow-xl border border-slate-200 z-30 overflow-hidden">
                <button @click="switchToBaseEditMode" class="w-full text-left px-4 py-2 hover:bg-slate-100 text-sm font-semibold flex items-center gap-2"
                        :class="dashboard.isBaseEditMode.value ? 'bg-teal-50 text-teal-600' : ''">
                  <i class="fa-solid fa-fw fa-table-list"></i>編輯基礎班表
                </button>
                <div class="border-t border-slate-200 my-1"></div>
                <button @click="startAction('請假')" class="w-full text-left px-4 py-2 hover:bg-slate-100 text-sm font-semibold flex items-center gap-2"
                        :class="dashboard.isQuickEditMode.value && dashboard.quickEditAction.value === '請假' ? 'bg-teal-50 text-teal-600' : ''">
                  <i class="fa-solid fa-fw fa-person-walking-arrow-right"></i>快速請假
                </button>
                <button @click="startAction('代班')" class="w-full text-left px-4 py-2 hover:bg-slate-100 text-sm font-semibold flex items-center gap-2"
                        :class="dashboard.isQuickEditMode.value && dashboard.quickEditAction.value === '代班' ? 'bg-teal-50 text-teal-600' : ''">
                  <i class="fa-solid fa-fw fa-user-clock"></i>快速代班
                </button>
                <button @click="startAction('調班')" class="w-full text-left px-4 py-2 hover:bg-slate-100 text-sm font-semibold flex items-center gap-2"
                        :class="dashboard.isQuickEditMode.value && dashboard.quickEditAction.value === '調班' ? 'bg-teal-50 text-teal-600' : ''">
                  <i class="fa-solid fa-fw fa-people-arrows"></i>快速調班
                </button>
                <button @click="startAction('調假')" class="w-full text-left px-4 py-2 hover:bg-slate-100 text-sm font-semibold flex items-center gap-2"
                        :class="dashboard.isQuickEditMode.value && dashboard.quickEditAction.value === '調假' ? 'bg-teal-50 text-teal-600' : ''">
                  <i class="fa-solid fa-fw fa-retweet"></i>快速調假
                </button>
                <button @click="startAction('加班')" class="w-full text-left px-4 py-2 hover:bg-slate-100 text-sm font-semibold flex items-center gap-2"
                        :class="dashboard.isQuickEditMode.value && dashboard.quickEditAction.value === '加班' ? 'bg-teal-50 text-teal-600' : ''">
                  <i class="fa-solid fa-fw fa-stopwatch"></i>快速加班
                </button>
                
                <div class="border-t border-slate-200 my-1"></div>
                <button @click="dashboard.exportScheduleToCSV()" class="w-full text-left px-4 py-2 hover:bg-slate-100 text-sm font-semibold flex items-center gap-2">
                  <i class="fa-solid fa-fw fa-file-csv"></i>匯出班表 (CSV)
                </button>

                <div class="border-t border-slate-200 my-1"></div>
                <button @click="auth.logout()" class="w-full text-left px-4 py-2 hover:bg-slate-100 text-sm font-semibold flex items-center gap-2 text-rose-500 hover:text-rose-700">
                  <i class="fa-solid fa-fw fa-right-from-bracket"></i>登出
                </button>
              </div>
            </transition>
          </div>
        </div>

        <div class="flex items-center justify-center space-x-2 mb-4">
          <button @click="dashboard.goToPreviousMonth" class="w-10 h-10 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 transition-colors">
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          <div class="flex-1 text-center font-bold text-lg text-slate-700 w-36 py-2 bg-white border border-slate-300 rounded-lg">
            {{ dashboard.currentMonthDisplay.value }}
          </div>
          <button @click="dashboard.goToNextMonth" class="w-10 h-10 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 transition-colors">
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>

        <team-tabs v-if="membersData.teams.value.length > 1" v-model="dashboard.activeTeam.value" :tabs="teamTabs" />

        <transition name="fade">
          <div v-if="(dashboard.hasChanges.value && dashboard.isBaseEditMode.value) || dashboard.isQuickEditMode.value" class="flex items-center space-x-2 mb-4">
            <button v-if="dashboard.hasChanges.value && dashboard.isBaseEditMode.value" @click="dashboard.saveChanges" class="flex-1 bg-teal-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-teal-700"><i class="fa-solid fa-save mr-2"></i>儲存變更</button>
            <button v-if="dashboard.hasChanges.value && dashboard.isBaseEditMode.value" @click="dashboard.discardChanges" class="flex-1 bg-slate-500 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-slate-600"><i class="fa-solid fa-times mr-2"></i>捨棄變更</button>
            <div v-if="dashboard.isQuickEditMode.value" class="w-full flex items-center justify-between gap-4 p-3 bg-white rounded-lg shadow border border-teal-500">
              <p class="text-sm font-semibold text-slate-700 whitespace-pre-line">{{ dashboard.getQuickEditPrompt.value }}</p>
              <button @click="dashboard.cancelQuickEdit" class="bg-slate-200 text-slate-600 font-bold py-2 px-4 rounded-lg hover:bg-slate-300 text-sm">取消</button>
            </div>
          </div>
        </transition>
      </div>

      <div class="flex-1 overflow-auto bg-white rounded-xl shadow-md" :ref="(el) => dashboard.scrollContainer.value = el">
        <transition name="fade" mode="out-in">
          <table :key="dashboard.activeTeam.value" class="w-full text-center text-sm border-separate table-fixed" style="border-spacing: 0;">
            <thead class="sticky top-0 bg-white z-20" :ref="(el) => dashboard.tableHeader.value = el">
              <tr>
                <th class="p-1 border-b-2 border-slate-200 sticky left-0 bg-white w-16 min-w-[4rem] z-30">日期</th>
                <th v-for="member in dashboard.filteredMembers.value" :key="member.id" class="p-2 border-b-2 border-slate-200 whitespace-nowrap font-bold">
                  {{ member.name }}
                </th>
              </tr>
            </thead>
            <tbody v-if="dashboard.filteredMembers.value && dashboard.filteredMembers.value.length > 0" :ref="(el) => dashboard.scheduleTableBody.value = el">
              <tr v-for="day in dashboard.daysInMonth.value" :key="day" class="transition-colors" :class="{ 'bg-teal-50/50': dashboard.isToday(day) }" :id="'day-row-' + day">
                <td class="p-2 sticky left-0 font-medium z-10" :class="{ 'bg-teal-50/50 font-bold text-teal-700': dashboard.isToday(day), 'bg-white': !dashboard.isToday(day) }">
                  <div class="flex flex-col items-center">
                    <span>{{ String(dashboard.month.value).padStart(2,'0') }}-{{ String(day).padStart(2,'0') }}</span>
                    <span class="text-xs text-slate-400">({{ dashboard.getDayOfWeek(day) }})</span>
                  </div>
                </td>
                <td v-for="member in dashboard.filteredMembers.value" :key="member.id" class="p-0.5 border-t border-slate-100"
                    @mouseover="dashboard.handleMouseOver(day, member.id)" @mouseout="dashboard.handleMouseOut()">
                  <div @click="dashboard.handleGridClick(day, member.id)"
                      class="px-1 rounded-md transition-colors text-xs font-semibold h-full flex flex-col justify-center relative min-h-[5rem]"
                      :class="[getStatusColor(dashboard.finalSchedule.value[day]?.[member.id]?.colorStatus), dashboard.getHighlightClass(day, member.id), dashboard.getCellClass(day, member.id)]">

                    <div v-if="getOvertimeHours(day, member.id)" class="overtime-ribbon">
                      加班 {{ getOvertimeHours(day, member.id) }} 小時
                    </div>

                    <div class="flex-grow flex flex-col items-center justify-center pt-2">
                      <span class="block" v-html="dashboard.finalSchedule.value[day]?.[member.id]?.status"></span>
                      <span v-if="dashboard.finalSchedule.value[day]?.[member.id]?.note" class="text-slate-500 font-normal text-[10px] mt-0.5 block" v-html="dashboard.finalSchedule.value[day]?.[member.id]?.note">
                      </span>
                    </div>

                  </div>
                </td>
              </tr>
            </tbody>
            <tbody v-else>
              <tr><td colspan="99" class="py-8 text-slate-500">尚無資料</td></tr>
            </tbody>
          </table>
        </transition>
      </div>
    </div>
  `,
};
