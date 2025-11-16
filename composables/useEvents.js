// /composables/useEvents.js

const { ref, reactive, computed, watch } = Vue;
import {
  getEvents,
  addEvent,
  updateEvent,
  deleteEvent,
} from "/firebase-api/firebase.js";
import {
  LEAVE_TYPES,
  EVENT_TYPES,
  LEAVE_TYPE_CONFIG,
} from "../utils/constants.js";
import { fmtYMD } from "../utils/date.js";

export function useEvents(isLoading, membersData) {
  const allEvents = ref([]);
  const showAddEventModal = ref(false);
  const eventFilter = reactive({ memberId: "", eventType: "" });
  const showFilters = ref(false);
  const showEditEventModal = ref(false);
  const editingEvent = ref(null);

  const newEventTemplate = () => ({
    date: fmtYMD(),
    memberId: "",
    eventType: "",
    reason: "",
    relatedMemberId: null,
    relatedDate: null,
    isExternalSubstitute: false,
    externalSubstituteName: null,
    hours: null,
    description: "",
  });
  const newEvent = reactive(newEventTemplate());

  const leaveTypes = ref([...LEAVE_TYPES]);
  const eventTypes = ref([...EVENT_TYPES]);

  const isHourlyLeave = computed(() => {
    const event = editingEvent.value || newEvent;
    if (event.eventType !== "請假" || !event.reason) return false;
    const config = LEAVE_TYPE_CONFIG[event.reason];
    return config && config.unit === "hour";
  });

  const getMemberName = (id) =>
    membersData.members.value.find((m) => m.id === id)?.name || "未知成員";

  const filteredEvents = computed(() =>
    allEvents.value
      .filter(
        (e) => !eventFilter.memberId || e.memberId === eventFilter.memberId
      )
      .filter(
        (e) => !eventFilter.eventType || e.eventType === eventFilter.eventType
      )
  );

  const memberOptionsForFilter = computed(() => {
    const members = membersData.members.value;
    if (!members) return [];
    const grouped = members.reduce((acc, member) => {
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

  const eventTypeOptionsForFilter = computed(() =>
    eventTypes.value.map((et) => ({ value: et, text: et }))
  );
  const leaveTypeOptions = computed(() =>
    leaveTypes.value.map((lt) => ({ value: lt, text: lt }))
  );

  const loadEvents = async () => {
    try {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      const startDate = fmtYMD(date);
      allEvents.value = await getEvents(startDate);
    } catch (e) {
      console.error("載入事件失敗：", e);
      alert("事件資料載入失敗！");
    }
  };

  const handleAddEvent = async () => {
    if (!newEvent.memberId || !newEvent.eventType || !newEvent.date) {
      alert("成員、事件類型和日期為必填項。");
      return;
    }
    const isLeave = newEvent.eventType === "請假",
      isOvertime = newEvent.eventType === "加班";
    const config = isLeave ? LEAVE_TYPE_CONFIG[newEvent.reason] : {};
    const isHourly = config && config.unit === "hour";
    if (
      (isOvertime || (isLeave && isHourly)) &&
      (!newEvent.hours || Number(newEvent.hours) <= 0)
    ) {
      alert("請輸入有效的時數。");
      return;
    }
    if (
      newEvent.eventType === "代班" &&
      newEvent.isExternalSubstitute &&
      !newEvent.externalSubstituteName
    ) {
      alert("請輸入外部代班人員的姓名。");
      return;
    }
    if (
      newEvent.eventType === "代班" &&
      !newEvent.isExternalSubstitute &&
      !newEvent.relatedMemberId
    ) {
      alert("請選擇內部代班成員。");
      return;
    }
    if (isLeave && !isHourly) newEvent.hours = null;
    if (newEvent.reason !== "事假") newEvent.description = "";
    isLoading.value = true;
    try {
      const payload = { ...newEvent };
      if (payload.isExternalSubstitute) payload.relatedMemberId = null;
      else payload.externalSubstituteName = null;
      await addEvent(payload);
      showAddEventModal.value = false;
      Object.assign(newEvent, newEventTemplate());
      await loadEvents();
    } catch (e) {
      console.error("新增事件失敗：", e);
      alert("新增事件失敗！");
    } finally {
      isLoading.value = false;
    }
  };

  const openEditEventModal = (event) => {
    editingEvent.value = {
      description: "",
      ...JSON.parse(JSON.stringify(event)),
    };
    showEditEventModal.value = true;
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent.value) return;
    if (editingEvent.value.reason !== "事假")
      editingEvent.value.description = "";
    isLoading.value = true;
    try {
      const payload = { ...editingEvent.value };
      await updateEvent(payload.id, payload);
      showEditEventModal.value = false;
      await loadEvents();
      alert("事件已成功更新！");
    } catch (e) {
      console.error("更新事件失敗：", e);
      alert("更新事件失敗！");
    } finally {
      isLoading.value = false;
    }
  };

  const handleDeleteEvent = async (eventId, info) => {
    if (!confirm(`確定要刪除這筆事件嗎？\n${info}`)) return;
    isLoading.value = true;
    try {
      await deleteEvent(eventId);
      await loadEvents();
    } catch (e) {
      console.error("刪除事件失敗：", e);
      alert("刪除事件失敗！");
    } finally {
      isLoading.value = false;
    }
  };

  const clearFilters = () => {
    eventFilter.memberId = "";
    eventFilter.eventType = "";
  };

  const formatEventDetails = (event) => {
    const hoursText = event.hours ? `（${event.hours} 小時）` : "";
    switch (event.eventType) {
      case "請假":
        if (event.reason === "事假" && event.description)
          return `事由：${event.description}${hoursText}`;
        const config = LEAVE_TYPE_CONFIG[event.reason];
        if (config && config.unit === "day") return `假別：${event.reason}`;
        return `假別：${event.reason}${hoursText}`;
      case "加班":
        return `時數：${event.hours} 小時`;
      case "代班":
        if (event.externalSubstituteName)
          return `由 ${event.externalSubstituteName} 代班`;
        return `由 ${getMemberName(event.relatedMemberId)} 代班`;
      case "調班":
        return `與 ${getMemberName(event.relatedMemberId)} 在 ${
          event.relatedDate
        } 換班`;
      case "調假":
        return `與 ${event.relatedDate} 對調`;
      default:
        return "";
    }
  };

  const getEventVisuals = (eventType) => {
    const v = {
      請假: {
        icon: "fa-person-walking-arrow-right",
        color: "bg-rose-100 text-rose-600",
      },
      加班: { icon: "fa-stopwatch", color: "bg-purple-100 text-purple-600" },
      代班: { icon: "fa-user-clock", color: "bg-sky-100 text-sky-600" },
      調班: { icon: "fa-people-arrows", color: "bg-teal-100 text-teal-600" },
      調假: { icon: "fa-retweet", color: "bg-indigo-100 text-indigo-600" },
    };
    return (
      v[eventType] || {
        icon: "fa-question-circle",
        color: "bg-slate-100 text-slate-600",
      }
    );
  };

  watch(
    () => newEvent.eventType,
    () => {
      newEvent.reason = "";
      newEvent.relatedMemberId = null;
      newEvent.relatedDate = null;
      newEvent.isExternalSubstitute = false;
      newEvent.externalSubstituteName = null;
      newEvent.hours = null;
      newEvent.description = "";
    }
  );
  watch(
    () => newEvent.reason,
    () => {
      newEvent.hours = null;
      if (newEvent.reason !== "事假") newEvent.description = "";
    }
  );

  return {
    allEvents,
    showAddEventModal,
    eventFilter,
    showFilters,
    newEvent,
    isHourlyLeave,
    showEditEventModal,
    editingEvent,
    memberOptionsForFilter,
    eventTypeOptionsForFilter,
    leaveTypeOptions,
    filteredEvents,
    loadEvents,
    handleAddEvent,
    handleDeleteEvent,
    clearFilters,
    formatEventDetails,
    getEventVisuals,
    getMemberName,
    openEditEventModal,
    handleUpdateEvent,
  };
}
