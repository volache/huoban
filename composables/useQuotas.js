// /composables/useQuotas.js

const { ref, reactive, computed, watch } = Vue;
import { getQuotasForYear, batchUpdateQuotas } from "/firebase-api/firebase.js";
import { LEAVE_TYPES, LEAVE_TYPE_CONFIG } from "../utils/constants.js";

export function useQuotas(isLoading, membersData, eventsData) {
  const year = ref(new Date().getFullYear());
  const selectedMemberId = ref(null);
  const allQuotasForYear = ref([]);
  const leaveTypes = ref([...LEAVE_TYPES]);
  const hasChanges = ref(false);
  const HOURS_PER_DAY = 8;

  const activeMembers = computed(() =>
    (membersData.members.value ?? []).filter((m) => m.status === "在職")
  );

  const memberOptions = computed(() => {
    if (!activeMembers.value.length) return [];
    const grouped = activeMembers.value.reduce((acc, member) => {
      acc[member.team] = acc[member.team] || [];
      acc[member.team].push({
        value: member.id,
        text: `${member.name}（${member.team}）`,
      });
      return acc;
    }, {});
    const options = [];
    const teams = Object.keys(grouped).sort();
    teams.forEach((team, index) => {
      options.push(...grouped[team]);
      if (index < teams.length - 1) options.push({ isSeparator: true });
    });
    return options;
  });

  const currentYearDisplay = computed(() => `${year.value} 年`);

  const loadQuotas = async () => {
    try {
      const data = await getQuotasForYear(year.value);
      allQuotasForYear.value = data.map((q) => reactive(q));
      hasChanges.value = false;
    } catch (e) {
      console.error("載入假別額度失敗：", e);
      alert("假別額度載入失敗！");
    }
  };

  const getQuota = (memberId, leaveType) => {
    if (!memberId)
      return reactive({
        totalDays: 0,
        initialUsedDays: 0,
        totalHours: 0,
        initialUsedHours: 0,
      });
    let quota = allQuotasForYear.value.find(
      (q) => q.memberId === memberId && q.leaveType === leaveType
    );
    if (!quota) {
      quota = reactive({
        memberId,
        year: year.value,
        leaveType,
        totalDays: 0,
        initialUsedDays: 0,
        totalHours: 0,
        initialUsedHours: 0,
      });
      allQuotasForYear.value.push(quota);
    }
    return quota;
  };

  const getEventsForYear = computed(() => {
    return (eventsData.allEvents.value ?? []).filter((e) =>
      e.date?.startsWith(String(year.value))
    );
  });

  const getNewlyUsedHoursForLeave = (memberId, leaveType) => {
    if (!memberId) return 0;
    const config = LEAVE_TYPE_CONFIG[leaveType];
    const events = getEventsForYear.value.filter(
      (e) =>
        e.memberId === memberId &&
        e.eventType === "請假" &&
        e.reason === leaveType
    );
    if (config.unit === "day") return events.length;
    return events.reduce((sum, e) => sum + (e.hours || 0), 0);
  };

  const getNewlyOvertimeHours = (memberId) => {
    if (!memberId) return 0;
    return getEventsForYear.value
      .filter((e) => e.memberId === memberId && e.eventType === "加班")
      .reduce((sum, e) => sum + (e.hours || 0), 0);
  };

  const getNewlyUsedLeaveHours = (memberId) => {
    if (!memberId) return 0;
    return getEventsForYear.value
      .filter(
        (e) =>
          e.memberId === memberId &&
          e.eventType === "請假" &&
          e.reason === "補休"
      )
      .reduce((sum, e) => sum + (e.hours || 0), 0);
  };

  const formatHoursToDaysAndHours = (totalHours) => {
    if (typeof totalHours !== "number" || isNaN(totalHours)) return "0 天";
    if (totalHours === 0) return "0 小時";
    const days = Math.floor(totalHours / HOURS_PER_DAY),
      hours = totalHours % HOURS_PER_DAY;
    let result = "";
    if (days > 0) result += `${days} 天`;
    if (hours > 0) result += ` ${hours} 小時`;
    return result.trim() || "0 小時";
  };

  const saveQuotas = async () => {
    isLoading.value = true;
    try {
      const toUpdate = allQuotasForYear.value.filter(
        (q) => q.memberId === selectedMemberId.value
      );
      await batchUpdateQuotas(toUpdate);
      alert("額度已成功儲存！");
      await loadQuotas();
    } catch (e) {
      console.error("儲存額度失敗：", e);
      alert("儲存額度失敗！");
    } finally {
      isLoading.value = false;
    }
  };

  const goToPreviousYear = () => year.value--;
  const goToNextYear = () => year.value++;

  watch(year, loadQuotas);
  watch(
    activeMembers,
    (newMembers) => {
      if (newMembers.length > 0 && !selectedMemberId.value) {
        selectedMemberId.value = newMembers[0].id;
      }
    },
    { immediate: true }
  );
  watch(allQuotasForYear, () => (hasChanges.value = true), { deep: true });

  return {
    year,
    selectedMemberId,
    leaveTypes,
    hasChanges,
    memberOptions,
    currentYearDisplay,
    LEAVE_TYPE_CONFIG,
    getQuota,
    getNewlyUsedHoursForLeave,
    getNewlyOvertimeHours,
    getNewlyUsedLeaveHours,
    formatHoursToDaysAndHours,
    loadQuotas,
    saveQuotas,
    goToPreviousYear,
    goToNextYear,
  };
}
