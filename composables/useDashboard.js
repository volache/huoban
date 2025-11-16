// /composables/useDashboard.js

const { ref, reactive, computed, watch } = Vue;
import {
  getSchedulesForMonth,
  batchUpdateSchedules,
  addEvent as apiAddEvent,
} from "../firebase-api/firebase.js";
import { LEAVE_TYPES, LEAVE_TYPE_CONFIG } from "../utils/constants.js";
import { fmtYMD, ymdOf, getDowShort } from "../utils/date.js";
import { exportToCsv } from "../utils/export.js";

export function useDashboard(isLoading, membersData, eventsData) {
  const year = ref(new Date().getFullYear()),
    month = ref(new Date().getMonth() + 1);
  const activeTeam = ref(null),
    todayString = ref(fmtYMD());
  const scheduleTableBody = ref(null),
    scrollContainer = ref(null),
    tableHeader = ref(null);

  watch(
    () => membersData.teams.value,
    (t) => {
      if (t && t.length && !activeTeam.value) activeTeam.value = t[0];
    },
    { immediate: true }
  );

  const monthlyRawSchedules = ref([]),
    scheduleChanges = reactive({}),
    originalSchedulesMap = ref(new Map());
  const isBaseEditMode = ref(false),
    isQuickEditMode = ref(false),
    quickEditAction = ref(null);
  const selection = reactive({ step: 0, source: null, target: null });
  const showQuickEditModal = ref(false),
    showSubstituteTypeModal = ref(false);
  const modalEvent = reactive({
    date: "",
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
  const resetModalEvent = () =>
    Object.assign(modalEvent, {
      date: "",
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

  const leaveTypes = ref([...LEAVE_TYPES]),
    highlightedCells = reactive({});

  const isQuickEditHourlyLeave = computed(() => {
    if (modalEvent.eventType !== "請假" || !modalEvent.reason) return false;
    const config = LEAVE_TYPE_CONFIG[modalEvent.reason];
    return config && config.unit === "hour";
  });

  const daysInMonth = computed(() =>
    new Date(year.value, month.value, 0).getDate()
  );
  const currentMonthDisplay = computed(
    () => `${year.value} 年 ${month.value} 月`
  );
  const hasChanges = computed(() => Object.keys(scheduleChanges).length > 0);
  const leaveTypeOptions = computed(() =>
    leaveTypes.value.map((lt) => ({ value: lt, text: lt }))
  );

  const filteredMembers = computed(() => {
    if (!activeTeam.value) return [];
    return membersData.members.value.filter(
      (m) => m.team === activeTeam.value && m.status === "在職"
    );
  });

  const monthlyEvents = computed(() => {
    const monthPrefix = `${year.value}-${String(month.value).padStart(2, "0")}`;
    return eventsData.allEvents.value.filter(
      (e) =>
        e.date?.startsWith(monthPrefix) ||
        (e.relatedDate && e.relatedDate.startsWith(monthPrefix))
    );
  });

  const baseSchedule = computed(() => {
    const result = {},
      allMembers = membersData.members.value;
    if (!allMembers || allMembers.length === 0) return result;
    const monthPrefix = `${year.value}-${String(month.value).padStart(2, "0")}`;
    const map = new Map();
    monthlyRawSchedules.value.forEach((s) =>
      map.set(`${s.date}_${s.memberId}`, s.shiftType)
    );
    for (let d = 1; d <= daysInMonth.value; d++) {
      result[d] = {};
      const dateStr = `${monthPrefix}-${String(d).padStart(2, "0")}`,
        dow = new Date(year.value, month.value - 1, d).getDay();
      allMembers.forEach((m) => {
        const key = `${dateStr}_${m.id}`;
        if (scheduleChanges[key] !== undefined)
          result[d][m.id] = scheduleChanges[key];
        else if (map.has(key)) result[d][m.id] = map.get(key);
        else result[d][m.id] = dow === 6 ? "休息" : dow === 0 ? "例假" : "上班";
      });
    }
    return result;
  });

  const getMemberName = (id) =>
    membersData.members.value.find((m) => m.id === id)?.name || "未知";
  const getMemberNickname = (id) => {
    const name = getMemberName(id);
    return name.length > 2 ? name.substring(name.length - 2) : name;
  };

  const finalSchedule = computed(() => {
    const result = JSON.parse(JSON.stringify(baseSchedule.value));
    for (const d in result)
      for (const m in result[d])
        result[d][m] = {
          status: result[d][m],
          colorStatus: result[d][m],
          note: "",
          eventType: null,
          events: [],
          highlightClass: "",
        };
    const monthPrefix = `${year.value}-${String(month.value).padStart(2, "0")}`;
    const events = monthlyEvents.value
      .slice()
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    const formatDateShort = (s) => (s && s.length >= 10 ? s.substring(5) : "");

    const overtimeEvents = events.filter((e) => e.eventType === "加班");
    const otherEvents = events.filter((e) => e.eventType !== "加班");

    otherEvents.forEach((e) => {
      if (!e?.eventType || !e?.date || !e?.memberId) return;
      const day = parseInt(e.date.split("-")[2]),
        memberId = e.memberId;
      if (e.date.startsWith(monthPrefix) && result[day]?.[memberId]) {
        switch (e.eventType) {
          case "請假":
            result[day][memberId].status = e.reason || "請假";
            result[day][memberId].colorStatus = e.reason || "請假";
            result[day][memberId].note =
              e.reason === "事假" && e.description
                ? e.description
                : e.hours
                ? `${e.hours} 小時`
                : "";
            result[day][memberId].eventType = e.eventType;
            break;
          case "代班":
            if (e.isExternalSubstitute) {
              result[day][memberId].status = "休息";
              result[day][memberId].colorStatus = "休息";
              result[day][memberId].note = `${e.externalSubstituteName}代班`;
              result[day][memberId].eventType = e.eventType;
            } else if (e.relatedMemberId) {
              const subId = e.relatedMemberId;
              result[day][memberId].status = "休息";
              result[day][memberId].colorStatus = "休息";
              result[day][memberId].note = `${getMemberNickname(subId)}代班`;
              result[day][memberId].eventType = e.eventType;
              if (result[day]?.[subId]) {
                result[day][subId].status = "上班";
                result[day][subId].colorStatus = "上班";
                result[day][subId].note = `支援${getMemberNickname(memberId)}`;
                result[day][subId].eventType = e.eventType;
              }
            }
            break;
        }
      }
      if (e.eventType === "調假" && e.relatedDate) {
        const day2 = parseInt(e.relatedDate.split("-")[2] || "0");
        if (
          e.date.startsWith(monthPrefix) &&
          e.relatedDate.startsWith(monthPrefix) &&
          result[day]?.[memberId] &&
          result[day2]?.[memberId]
        ) {
          const s1 = { ...result[day][memberId] },
            s2 = { ...result[day2][memberId] };
          result[day][memberId] = s2;
          result[day][memberId].note = `調到<br>${formatDateShort(
            e.relatedDate
          )}`;
          result[day][memberId].eventType = e.eventType;
          result[day2][memberId] = s1;
          result[day2][memberId].note = `調自<br>${formatDateShort(e.date)}`;
          result[day2][memberId].eventType = e.eventType;
        }
      }
      if (e.eventType === "調班" && e.relatedMemberId && e.relatedDate) {
        const A = e.memberId,
          B = e.relatedMemberId;
        const d1 = parseInt(e.date.split("-")[2] || "0"),
          d2 = parseInt(e.relatedDate.split("-")[2] || "0");
        if (
          e.date.startsWith(monthPrefix) &&
          result[d1]?.[A] &&
          result[d1]?.[B]
        ) {
          result[d1][A].status = "休息";
          result[d1][A].colorStatus = "休息";
          result[d1][A].note = `與${getMemberNickname(
            B
          )}換<br>${formatDateShort(e.relatedDate)}`;
          result[d1][A].eventType = e.eventType;
          result[d1][B].status = "上班";
          result[d1][B].colorStatus = "上班";
          result[d1][B].note = `支援${getMemberNickname(A)}`;
          result[d1][B].eventType = e.eventType;
        }
        if (
          e.relatedDate.startsWith(monthPrefix) &&
          result[d2]?.[A] &&
          result[d2]?.[B]
        ) {
          result[d2][A].status = "上班";
          result[d2][A].colorStatus = "上班";
          result[d2][A].note = `支援${getMemberNickname(B)}`;
          result[d2][A].eventType = e.eventType;
          result[d2][B].status = "休息";
          result[d2][B].colorStatus = "休息";
          result[d2][B].note = `與${getMemberNickname(
            A
          )}換<br>${formatDateShort(e.date)}`;
          result[d2][B].eventType = e.eventType;
        }
      }
    });

    overtimeEvents.forEach((e) => {
      if (e.date.startsWith(monthPrefix)) {
        const day = parseInt(e.date.split("-")[2]),
          memberId = e.memberId;
        if (result[day]?.[memberId]) result[day][memberId].events.push(e);
      }
    });

    for (const d in result)
      for (const m in result[d])
        if (result[d][m].status === "歲時儀祭")
          result[d][m].status = "歲時<br>祭儀";
    return result;
  });

  // 匯出班表為 CSV 的函式
  const exportScheduleToCSV = () => {
    const members = filteredMembers.value;
    if (members.length === 0) {
      alert("目前班別沒有成員可匯出。");
      return;
    }

    // 準備標頭
    const headers = ["日期", "星期", ...members.map((m) => m.name)];
    const data = [headers];

    // 準備每一列的資料
    for (let day = 1; day <= daysInMonth.value; day++) {
      const dateStr = `${month.value}/${day}`;
      const dayOfWeek = getDayOfWeek(day);
      const row = [dateStr, dayOfWeek];

      members.forEach((member) => {
        const cell = finalSchedule.value[day]?.[member.id];
        if (cell) {
          let cellText = (cell.status || "").replace(/<br>/g, " "); // 將 HTML 換行符換成空格
          if (cell.note) {
            cellText += ` (${(cell.note || "").replace(/<br>/g, " ")})`;
          }
          row.push(cellText);
        } else {
          row.push("");
        }
      });
      data.push(row);
    }

    const filename = `班表_${activeTeam.value}_${year.value}-${String(
      month.value
    ).padStart(2, "0")}`;
    exportToCsv(filename, data);
  };

  const getQuickEditPrompt = computed(() => {
    if (!isQuickEditMode.value) return "";
    if (quickEditAction.value === "加班") return "請選擇要記錄加班的儲存格";
    if (quickEditAction.value === "代班" && modalEvent.isExternalSubstitute)
      return "請選擇要由「外部人員代班」的儲存格";
    const actionText = {
      請假: "請假",
      代班: "被代班",
      調班: "調班",
      調假: "調假",
    };
    const targetText = {
      代班: "來支援的同事",
      調班: "要交換的對方上班日",
      調假: "要交換的休息日",
    };
    if (selection.step === 1)
      return `請選擇要「${actionText[quickEditAction.value]}」的儲存格`;
    if (selection.step === 2) {
      const sourceInfo = `來源：${getMemberName(
        selection.source.memberId
      )} @ ${selection.source.date.substring(5)}`;
      return `${sourceInfo}\n請選擇「${targetText[quickEditAction.value]}」`;
    }
    return "";
  });

  const loadSchedules = async () => {
    if (!year.value || !month.value) return;
    try {
      Object.keys(scheduleChanges).forEach((k) => delete scheduleChanges[k]);
      const data = await getSchedulesForMonth(year.value, month.value);
      monthlyRawSchedules.value = data;
      const oMap = new Map();
      data.forEach((s) =>
        oMap.set(`${s.date}_${s.memberId}`, {
          id: s.id,
          shiftType: s.shiftType,
        })
      );
      originalSchedulesMap.value = oMap;
    } catch (e) {
      console.error("載入班表失敗：", e);
      alert("班表資料載入失敗！");
    }
  };

  const goToPreviousMonth = () => {
    if (month.value === 1) {
      month.value = 12;
      year.value--;
    } else {
      month.value--;
    }
  };
  const goToNextMonth = () => {
    if (month.value === 12) {
      month.value = 1;
      year.value++;
    } else {
      month.value++;
    }
  };
  const saveChanges = async () => {
    isLoading.value = true;
    try {
      await batchUpdateSchedules(scheduleChanges, originalSchedulesMap.value);
      alert("班表已成功儲存！");
      isBaseEditMode.value = false;
      await loadSchedules();
    } catch (e) {
      console.error("儲存班表失敗：", e);
      alert("班表儲存失敗！");
    } finally {
      isLoading.value = false;
    }
  };
  const discardChanges = () => {
    Object.keys(scheduleChanges).forEach((k) => delete scheduleChanges[k]);
    isBaseEditMode.value = false;
  };
  const isToday = (day) =>
    ymdOf(year.value, month.value, day) === todayString.value;

  const handleMouseOut = () => {
    if (isQuickEditMode.value || isBaseEditMode.value) return;
    Object.keys(highlightedCells).forEach((k) => delete highlightedCells[k]);
  };
  const handleMouseOver = (day, memberId) => {
    if (isQuickEditMode.value || isBaseEditMode.value) return;
    handleMouseOut();
    const event = monthlyEvents.value.find((e) => {
      const d1 = e.date ? parseInt(e.date.split("-")[2]) : 0,
        d2 = e.relatedDate ? parseInt(e.relatedDate.split("-")[2]) : 0;
      if (e.eventType === "加班") return d1 === day && e.memberId === memberId;
      if (e.eventType === "調假")
        return e.memberId === memberId && (d1 === day || d2 === day);
      if (e.eventType === "調班")
        return (
          (d1 === day &&
            (e.memberId === memberId || e.relatedMemberId === memberId)) ||
          (d2 === day &&
            (e.memberId === memberId || e.relatedMemberId === memberId))
        );
      if (e.eventType === "代班")
        return (
          d1 === day &&
          (e.memberId === memberId || e.relatedMemberId === memberId)
        );
      if (e.eventType === "請假") return d1 === day && e.memberId === memberId;
      return false;
    });
    if (!event) return;
    const hClass =
      {
        請假: "cell-highlighted-rose",
        代班: "cell-highlighted-sky",
        調班: "cell-highlighted-teal",
        調假: "cell-highlighted-indigo",
        加班: "cell-highlighted-purple",
      }[event.eventType] || "cell-highlighted-blue";
    const key = (d, m) => `${d}-${m}`;
    if (event.eventType === "加班" || event.eventType === "請假")
      highlightedCells[key(day, memberId)] = hClass;
    else if (event.eventType === "代班") {
      highlightedCells[key(day, event.memberId)] = hClass;
      if (event.relatedMemberId)
        highlightedCells[key(day, event.relatedMemberId)] = hClass;
    } else if (event.eventType === "調假") {
      const d1 = parseInt(event.date.split("-")[2]),
        d2 = parseInt(event.relatedDate.split("-")[2]);
      highlightedCells[key(d1, event.memberId)] = hClass;
      highlightedCells[key(d2, event.memberId)] = hClass;
    } else if (event.eventType === "調班") {
      const d1 = parseInt(event.date.split("-")[2]),
        d2 = parseInt(event.relatedDate.split("-")[2]);
      highlightedCells[key(d1, event.memberId)] = hClass;
      if (event.relatedMemberId)
        highlightedCells[key(d1, event.relatedMemberId)] = hClass;
      if (d2 > 0) {
        highlightedCells[key(d2, event.memberId)] = hClass;
        if (event.relatedMemberId)
          highlightedCells[key(d2, event.relatedMemberId)] = hClass;
      }
    }
  };
  const getHighlightClass = (day, memberId) =>
    highlightedCells[`${day}-${memberId}`] || "";
  const getDayOfWeek = (day) => getDowShort(year.value, month.value, day);

  const startQuickEdit = (action) => {
    isBaseEditMode.value = false;
    resetModalEvent();
    if (action === "代班") {
      showSubstituteTypeModal.value = true;
      return;
    }
    isQuickEditMode.value = true;
    quickEditAction.value = action;
    selection.step = 1;
    selection.source = null;
    selection.target = null;
  };
  const startInternalSubstitute = () => {
    showSubstituteTypeModal.value = false;
    resetModalEvent();
    isQuickEditMode.value = true;
    quickEditAction.value = "代班";
    modalEvent.isExternalSubstitute = false;
    selection.step = 1;
    selection.source = null;
    selection.target = null;
  };
  const startExternalSubstitute = () => {
    showSubstituteTypeModal.value = false;
    resetModalEvent();
    isQuickEditMode.value = true;
    quickEditAction.value = "代班";
    modalEvent.isExternalSubstitute = true;
    selection.step = 1;
    selection.source = null;
    selection.target = null;
  };
  const cancelQuickEdit = () => {
    isBaseEditMode.value = false;
    isQuickEditMode.value = false;
    quickEditAction.value = null;
    selection.step = 0;
    selection.source = null;
    selection.target = null;
    showQuickEditModal.value = false;
    showSubstituteTypeModal.value = false;
    resetModalEvent();
  };
  const handleGridClick = (day, memberId) => {
    if (isBaseEditMode.value) {
      const dateStr = ymdOf(year.value, month.value, day),
        key = `${dateStr}_${memberId}`,
        cycle = ["上班", "休息", "例假"];
      const current = baseSchedule.value[day]?.[memberId] || "上班",
        next = cycle[(cycle.indexOf(current) + 1) % cycle.length];
      scheduleChanges[key] = next;
      return;
    }
    if (!isQuickEditMode.value || !isCellSelectable(day, memberId)) return;
    const date = ymdOf(year.value, month.value, day),
      action = quickEditAction.value;
    if (selection.step === 1) {
      selection.source = { day, memberId, date };
      Object.assign(modalEvent, { date, memberId, eventType: action });
      if (action === "加班") {
        modalEvent.hours = 1;
        showQuickEditModal.value = true;
      } else if (action === "請假") {
        modalEvent.reason = leaveTypes.value[0];
        showQuickEditModal.value = true;
      } else if (action === "代班" && modalEvent.isExternalSubstitute) {
        showQuickEditModal.value = true;
      } else {
        selection.step = 2;
      }
    } else if (selection.step === 2) {
      selection.target = { day, memberId, date };
      if (action === "代班")
        Object.assign(modalEvent, {
          relatedMemberId: memberId,
          isExternalSubstitute: false,
        });
      if (action === "調假")
        Object.assign(modalEvent, {
          relatedMemberId: selection.source.memberId,
          relatedDate: date,
        });
      if (action === "調班")
        Object.assign(modalEvent, {
          relatedMemberId: memberId,
          relatedDate: date,
        });
      showQuickEditModal.value = true;
    }
  };
  const isCellSelectable = (day, memberId) => {
    if (!isQuickEditMode.value) return false;
    if (quickEditAction.value === "加班") return true;
    const status = finalSchedule.value[day]?.[memberId]?.status;
    if (selection.step === 1) return status === "上班";
    if (selection.step === 2) {
      if (
        day === selection.source.day &&
        memberId === selection.source.memberId
      )
        return false;
      const isOff = ["休息", "例假"].includes(status);
      if (quickEditAction.value === "代班")
        return day === selection.source.day && isOff;
      if (quickEditAction.value === "調假")
        return memberId === selection.source.memberId && isOff;
      if (quickEditAction.value === "調班") {
        if (memberId === selection.source.memberId) return false;
        if (status !== "上班") return false;
        const initiatorOnTarget =
          finalSchedule.value[day]?.[selection.source.memberId]?.status;
        if (!["休息", "例假"].includes(initiatorOnTarget)) return false;
        const targetOnSource =
          finalSchedule.value[selection.source.day]?.[memberId]?.status;
        if (!["休息", "例假"].includes(targetOnSource)) return false;
        return true;
      }
    }
    return false;
  };
  const submitQuickEdit = async () => {
    isLoading.value = true;
    try {
      const e = modalEvent;
      if (!e.eventType || !e.memberId || !e.date) {
        alert("資料不完整");
        isLoading.value = false;
        return;
      }
      const payload = {
        date: e.date,
        memberId: e.memberId,
        eventType: e.eventType,
        description: e.description || null,
      };
      if (e.eventType === "加班") {
        payload.hours = Number(e.hours) || 0;
        if (payload.hours <= 0) {
          alert("請輸入加班時數");
          isLoading.value = false;
          return;
        }
      }
      if (e.eventType === "請假") {
        payload.reason = e.reason || "";
        if (!payload.reason) {
          alert("請選擇假別");
          isLoading.value = false;
          return;
        }
        const config = LEAVE_TYPE_CONFIG[payload.reason];
        if (config && config.unit === "hour") {
          payload.hours = Number(e.hours) || 0;
          if (payload.hours <= 0) {
            alert("請輸入請假時數");
            isLoading.value = false;
            return;
          }
        } else {
          payload.hours = null;
        }
        if (payload.reason !== "事假") payload.description = null;
      }
      if (e.eventType === "代班") {
        payload.isExternalSubstitute = !!e.isExternalSubstitute;
        if (payload.isExternalSubstitute) {
          payload.externalSubstituteName = (
            e.externalSubstituteName || ""
          ).trim();
          if (!payload.externalSubstituteName) {
            alert("請輸入外部人員姓名");
            isLoading.value = false;
            return;
          }
          payload.relatedMemberId = null;
        } else {
          payload.relatedMemberId = e.relatedMemberId;
          if (!payload.relatedMemberId) {
            alert("請選擇內部代班成員");
            isLoading.value = false;
            return;
          }
          payload.externalSubstituteName = null;
        }
      }
      if (e.eventType === "調班" || e.eventType === "調假") {
        payload.relatedMemberId = e.relatedMemberId || "";
        payload.relatedDate = e.relatedDate || "";
        if (!payload.relatedMemberId || !payload.relatedDate) {
          alert("請選擇交換對象與日期");
          isLoading.value = false;
          return;
        }
      }
      await apiAddEvent(payload);
      if (eventsData) await eventsData.loadEvents();
      cancelQuickEdit();
    } catch (err) {
      console.error("submitQuickEdit error:", err);
      alert("快速操作失敗");
    } finally {
      isLoading.value = false;
    }
  };
  const getCellClass = (day, memberId) => {
    const key = `${ymdOf(year.value, month.value, day)}_${memberId}`,
      cls = [];
    if (isBaseEditMode.value) {
      cls.push("cursor-pointer", "hover:bg-slate-100");
      if (scheduleChanges[key] !== undefined)
        cls.push("ring-2", "ring-teal-400");
    } else if (isQuickEditMode.value) {
      if (selection.step === 1)
        cls.push(
          isCellSelectable(day, memberId) ? "cell-selectable" : "cell-disabled"
        );
      else if (selection.step === 2) {
        if (
          selection.source &&
          day === selection.source.day &&
          memberId === selection.source.memberId
        )
          cls.push("cell-source");
        else
          cls.push(
            isCellSelectable(day, memberId)
              ? "cell-target-available"
              : "cell-disabled"
          );
      }
    }
    return cls.join(" ");
  };
  const scrollToToday = () => {
    if (isBaseEditMode.value) return;
    const today = new Date();
    if (
      today.getFullYear() !== year.value ||
      today.getMonth() + 1 !== month.value
    )
      return;
    const yesterdayDate = today.getDate() - 1;
    requestAnimationFrame(() => {
      if (
        scrollContainer.value &&
        scheduleTableBody.value &&
        tableHeader.value
      ) {
        const targetDate = yesterdayDate > 0 ? yesterdayDate : 1,
          targetRow = scheduleTableBody.value.querySelector(
            `#day-row-${targetDate}`
          );
        if (targetRow) {
          const headerHeight = tableHeader.value.offsetHeight,
            scrollTop = targetRow.offsetTop - headerHeight;
          scrollContainer.value.scrollTo({
            top: scrollTop,
            behavior: "smooth",
          });
        }
      }
    });
  };

  watch(
    () => modalEvent.isExternalSubstitute,
    (isExternal) => {
      if (isExternal) modalEvent.relatedMemberId = "";
      else modalEvent.externalSubstituteName = "";
    }
  );
  watch(
    () => modalEvent.eventType,
    () => {
      modalEvent.hours = null;
      modalEvent.reason = "";
      modalEvent.relatedMemberId = "";
      modalEvent.externalSubstituteName = "";
      modalEvent.relatedDate = "";
      modalEvent.description = "";
    }
  );
  watch(
    () => modalEvent.reason,
    () => {
      modalEvent.hours = null;
      if (modalEvent.reason !== "事假") modalEvent.description = "";
    }
  );
  watch(
    [finalSchedule, scrollContainer, scheduleTableBody, tableHeader],
    ([s, c, b, h]) => {
      if (c && b && h && Object.keys(s).length > 0) scrollToToday();
    },
    { deep: true, flush: "post" }
  );
  watch([year, month], loadSchedules);

  return {
    year,
    month,
    activeTeam,
    todayString,
    isBaseEditMode,
    daysInMonth,
    currentMonthDisplay,
    filteredMembers,
    finalSchedule,
    hasChanges,
    leaveTypeOptions,
    isQuickEditHourlyLeave,
    scheduleTableBody,
    scrollContainer,
    tableHeader,
    loadSchedules,
    goToPreviousMonth,
    goToNextMonth,
    saveChanges,
    discardChanges,
    isToday,
    handleMouseOver,
    handleMouseOut,
    getHighlightClass,
    getDayOfWeek,
    getCellClass,
    getMemberName,
    isQuickEditMode,
    quickEditAction,
    getQuickEditPrompt,
    startQuickEdit,
    startInternalSubstitute,
    startExternalSubstitute,
    cancelQuickEdit,
    handleGridClick,
    submitQuickEdit,
    exportScheduleToCSV,
    showQuickEditModal,
    showSubstituteTypeModal,
    modalEvent,
  };
}
