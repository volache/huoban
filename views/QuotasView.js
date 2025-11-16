// /views/QuotasView.js

const { inject, computed } = Vue;

export default {
  setup() {
    const quotas = inject("quotas");

    const getRemainingBalance = (memberId, leaveType) => {
      if (!quotas) return 0;
      const config = quotas.LEAVE_TYPE_CONFIG[leaveType];
      if (!config || !memberId) return 0;

      const quotaData = quotas.getQuota(memberId, leaveType);

      if (config.unit === "day") {
        const total = quotaData.totalDays || 0;
        const initialUsed = quotaData.initialUsedDays || 0;
        const newlyUsed = quotas.getNewlyUsedHoursForLeave(memberId, leaveType);
        return total - initialUsed - newlyUsed;
      }

      if (leaveType === "補休") {
        const total = quotaData.totalHours || 0;
        const initialUsed = quotaData.initialUsedHours || 0;
        const overtime = quotas.getNewlyOvertimeHours(memberId);
        const used = quotas.getNewlyUsedLeaveHours(memberId);
        return total - initialUsed + overtime - used;
      }

      const total =
        (quotaData.totalDays || 0) * 8 + (quotaData.totalHours || 0);
      const initialUsed =
        (quotaData.initialUsedDays || 0) * 8 +
        (quotaData.initialUsedHours || 0);
      const newlyUsed = quotas.getNewlyUsedHoursForLeave(memberId, leaveType);
      return total - initialUsed - newlyUsed;
    };

    return { quotas, getRemainingBalance };
  },
  template: `
    <div v-if="quotas" class="flex flex-col h-full">
      <!-- 頁首 -->
      <div class="shrink-0">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-2xl font-bold text-slate-700">假別設定</h2>

          <transition name="fade">
            <round-icon-button
              v-if="quotas.hasChanges.value"
              @click="quotas.saveQuotas"
              icon="fa-floppy-disk"
              title="儲存變更"
              variant="secondary"
            />
          </transition>
        </div>

        <div class="flex items-center justify-center space-x-2 mb-4">
          <button
            @click="quotas.goToPreviousYear"
            class="w-10 h-10 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 transition-colors"
          >
            <i class="fa-solid fa-chevron-left"></i>
          </button>

          <div class="flex-1 text-center font-bold text-lg text-slate-700 w-36 py-2 bg-white border border-slate-300 rounded-lg">
            {{ quotas.currentYearDisplay.value }}
          </div>

          <button
            @click="quotas.goToNextYear"
            class="w-10 h-10 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 transition-colors"
          >
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>

        <div class="mb-4">
          <custom-select
            v-model="quotas.selectedMemberId.value"
            :options="quotas.memberOptions.value"
            placeholder="選擇成員"
            icon-class="fa-solid fa-user"
          ></custom-select>
        </div>
      </div>

      <!-- 假別卡區塊 -->
      <div class="flex-1 overflow-y-auto -mx-2 px-2">
        <transition name="fade" mode="out-in">
          <div
            v-if="quotas.selectedMemberId.value"
            :key="quotas.selectedMemberId.value"
            class="grid grid-cols-2 gap-3"
          >
            <div
              v-for="lt in quotas.leaveTypes.value"
              :key="lt"
              class="bg-white rounded-xl shadow p-4 flex flex-col justify-between"
            >
              <div class="flex items-start justify-between mb-2">
                <h4 class="text-base font-bold text-slate-800">{{ lt }}</h4>
                <div class="text-right">
                  <p class="text-xs text-slate-500 leading-tight">
                    {{ quotas.LEAVE_TYPE_CONFIG[lt].unit === 'hour' ? '剩餘時數' : '剩餘天數' }}
                  </p>
                  <p class="font-extrabold text-teal-600 text-2xl">
                    {{ getRemainingBalance(quotas.selectedMemberId.value, lt) }}
                  </p>
                </div>
              </div>

              <div class="space-y-2 text-sm flex-grow flex flex-col">
                <template v-if="quotas.LEAVE_TYPE_CONFIG[lt].unit === 'hour'">
                  <div v-if="lt !== '補休'">
                    <div class="flex items-center justify-between">
                      <label class="text-slate-600 shrink-0">總額度</label>
                      <div class="flex items-center gap-2">
                        <input type="number" v-model.number="quotas.getQuota(quotas.selectedMemberId.value, lt).totalDays" class="w-16 text-center p-2 border rounded-lg" />
                        <span class="text-slate-500">天</span>
                      </div>
                    </div>
                    <div class="flex items-center justify-between mt-2">
                      <label class="text-slate-600 shrink-0">調整用</label>
                      <div class="flex items-center gap-2">
                        <input type="number" v-model.number="quotas.getQuota(quotas.selectedMemberId.value, lt).initialUsedHours" class="w-16 text-center p-2 border rounded-lg" />
                        <span class="text-slate-500">時</span>
                      </div>
                    </div>
                  </div>

                  <div v-if="lt === '補休'">
                    <div class="flex items-center justify-between">
                      <label class="text-slate-600 shrink-0">總額度</label>
                      <div class="flex items-center gap-2">
                        <input type="number" v-model.number="quotas.getQuota(quotas.selectedMemberId.value, lt).totalHours" class="w-16 text-center p-2 border rounded-lg" />
                        <span class="text-slate-500">時</span>
                      </div>
                    </div>
                    <div class="flex items-center justify-between mt-2">
                      <label class="text-slate-600 shrink-0">調整用</label>
                      <div class="flex items-center gap-2">
                        <input type="number" v-model.number="quotas.getQuota(quotas.selectedMemberId.value, lt).initialUsedHours" class="w-16 text-center p-2 border rounded-lg" />
                        <span class="text-slate-500">時</span>
                      </div>
                    </div>
                  </div>

                  <div class="flex-grow"></div>
                  <div v-if="lt === '補休'" class="flex items-center justify-between pt-1 mt-1 border-t">
                    <span class="text-slate-600">加班累計</span>
                    <span class="text-green-600 font-medium">+{{ quotas.getNewlyOvertimeHours(quotas.selectedMemberId.value) }} 小時</span>
                  </div>
                  <div v-else class="pt-1 mt-1 border-t border-transparent"></div>

                  <div class="flex items-center justify-between pt-1 mt-1 border-t">
                    <span class="text-slate-600">系統累計</span>
                    <span class="font-medium">
                      {{ quotas.getNewlyUsedHoursForLeave(quotas.selectedMemberId.value, lt) }} 小時
                    </span>
                  </div>
                </template>

                <template v-else>
                  <div class="flex items-center justify-between">
                    <label class="text-slate-600 shrink-0">總額度</label>
                    <div class="flex items-center gap-2">
                      <input type="number" v-model.number="quotas.getQuota(quotas.selectedMemberId.value, lt).totalDays" class="w-16 text-center p-2 border rounded-lg" />
                      <span class="text-slate-500">天</span>
                    </div>
                  </div>
                  <div class="flex items-center justify-between mt-2">
                    <label class="text-slate-600 shrink-0">調整用</label>
                    <div class="flex items-center gap-2">
                      <input type="number" v-model.number="quotas.getQuota(quotas.selectedMemberId.value, lt).initialUsedDays" class="w-16 text-center p-2 border rounded-lg" />
                      <span class="text-slate-500">天</span>
                    </div>
                  </div>
                  <div class="flex-grow"></div>
                  <div class="pt-1 mt-1 border-t border-transparent"></div>
                  <div class="flex items-center justify-between pt-1 mt-1 border-t">
                    <span class="text-slate-600">系統累計</span>
                    <span class="font-medium">
                      {{ quotas.getNewlyUsedHoursForLeave(quotas.selectedMemberId.value, lt) }} 天
                    </span>
                  </div>
                </template>
              </div>
            </div>
          </div>
          <p v-else class="text-slate-500 text-center py-8">
            請先選擇成員
          </p>
        </transition>
      </div>
    </div>
  `,
};
