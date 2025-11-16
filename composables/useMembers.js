// /composables/useMembers.js

const { ref, reactive, computed, watch, nextTick } = Vue;
import {
  getMembers,
  addMember,
  updateMember,
  deleteMember,
  updateMemberStatus,
  updateMembersOrder,
} from "/firebase-api/firebase.js";

export function useMembers(isLoading) {
  const members = ref([]);
  const newMember = reactive({ name: "", title: "", team: "" });
  const newTeamName = ref("");
  const newTitleName = ref("");
  const memberListElement = ref(null);
  const isOrderChanged = ref(false);
  const showAddMemberModal = ref(false);

  const showEditMemberModal = ref(false);
  const editingMember = ref(null);

  const activeTeam = ref(null);

  const PREFERRED_TITLE_ORDER = ["領班", "副領班", "班員"];

  const teams = computed(() => {
    const set = new Set(members.value.map((m) => m.team).filter(Boolean));
    return [...set].sort();
  });

  const titles = computed(() => {
    const set = new Set(members.value.map((m) => m.title).filter(Boolean));
    return [...set].sort((a, b) => {
      let indexA = PREFERRED_TITLE_ORDER.indexOf(a);
      let indexB = PREFERRED_TITLE_ORDER.indexOf(b);
      if (indexA === -1) indexA = Infinity;
      if (indexB === -1) indexB = Infinity;
      if (indexA !== indexB) return indexA - indexB;
      return String(a).localeCompare(String(b), "zh-Hant");
    });
  });

  watch(
    teams,
    (t) => {
      if (t && t.length && !activeTeam.value) {
        activeTeam.value = t[0];
      }
    },
    { immediate: true }
  );

  const filteredMembers = computed(() => {
    if (!activeTeam.value) return [];
    return members.value.filter((m) => m.team === activeTeam.value);
  });

  const titleOptions = computed(() => {
    const base = titles.value.map((t) => ({ value: t, text: t }));
    return [...base, { value: "新職稱", text: "⋯⋯新增職稱" }];
  });

  const teamOptions = computed(() => {
    const base = teams.value.map((t) => ({ value: t, text: t }));
    return [...base, { value: "新班別", text: "⋯⋯新增班別" }];
  });

  const initSortable = () => {
    if (!memberListElement.value || !memberListElement.value.$el) return;
    new Sortable(memberListElement.value.$el, {
      animation: 150,
      handle: ".fa-grip-vertical",
      onEnd: (evt) => {
        const movedItem = filteredMembers.value[evt.oldIndex];
        const newVisibleSiblings = [...filteredMembers.value];
        newVisibleSiblings.splice(evt.oldIndex, 1);
        newVisibleSiblings.splice(evt.newIndex, 0, movedItem);
        const otherTeamMembers = members.value.filter(
          (m) => m.team !== activeTeam.value
        );
        members.value = [...otherTeamMembers, ...newVisibleSiblings];
        isOrderChanged.value = true;
      },
    });
  };

  const loadMembers = async () => {
    try {
      members.value = await getMembers();
      isOrderChanged.value = false;
    } catch (e) {
      console.error("載入成員資料失敗：", e);
      alert("載入成員資料失敗！");
    }
  };

  const handleAddMember = async () => {
    const payload = {
      name: newMember.name.trim(),
      title:
        newMember.title === "新職稱"
          ? newTitleName.value.trim()
          : newMember.title,
      team:
        newMember.team === "新班別" ? newTeamName.value.trim() : newMember.team,
      displayOrder: members.value.length,
    };
    if (!payload.name || !payload.title || !payload.team) {
      alert("請填寫所有必填欄位。");
      return;
    }
    if (newMember.title === "新職稱" && !newTitleName.value.trim()) {
      alert("請輸入新職稱名稱。");
      return;
    }
    if (newMember.team === "新班別" && !newTeamName.value.trim()) {
      alert("請輸入新班別名稱。");
      return;
    }
    isLoading.value = true;
    try {
      await addMember(payload);
      showAddMemberModal.value = false;
      newMember.name = "";
      newMember.title = "";
      newMember.team = "";
      newTeamName.value = "";
      newTitleName.value = "";
      await loadMembers();
    } catch (e) {
      console.error("新增成員失敗：", e);
      alert("新增成員失敗！");
    } finally {
      isLoading.value = false;
    }
  };

  const openEditModal = (member) => {
    editingMember.value = JSON.parse(JSON.stringify(member));
    showEditMemberModal.value = true;
  };

  const handleUpdateMember = async () => {
    if (!editingMember.value) return;
    const payload = {
      ...editingMember.value,
      name: editingMember.value.name.trim(),
    };
    if (!payload.name || !payload.title || !payload.team) {
      alert("姓名、職稱與班別為必填欄位。");
      return;
    }
    isLoading.value = true;
    try {
      await updateMember(payload.id, payload);
      showEditMemberModal.value = false;
      editingMember.value = null;
      await loadMembers();
      alert("成員資料已成功更新！");
    } catch (e) {
      console.error("更新成員失敗：", e);
      alert("更新成員失敗！");
    } finally {
      isLoading.value = false;
    }
  };

  const handleDeleteMember = async (memberId, memberName) => {
    if (!confirm(`確定要永久刪除成員「${memberName}」嗎？\n此操作無法復原。`))
      return;
    isLoading.value = true;
    try {
      await deleteMember(memberId);
      await loadMembers();
    } catch (e) {
      console.error("刪除成員失敗：", e);
      alert("刪除成員失敗！");
    } finally {
      isLoading.value = false;
    }
  };

  const handleToggleStatus = async (member) => {
    const newStatus = member.status === "在職" ? "離職" : "在職";
    isLoading.value = true;
    try {
      await updateMemberStatus(member.id, newStatus);
      const m = members.value.find((x) => x.id === member.id);
      if (m) m.status = newStatus;
    } catch (e) {
      console.error("更新狀態失敗：", e);
      alert("更新成員狀態失敗！");
    } finally {
      isLoading.value = false;
    }
  };

  const handleSaveOrder = async () => {
    isLoading.value = true;
    try {
      await updateMembersOrder(members.value);
      isOrderChanged.value = false;
      alert("成員順序已成功儲存！");
    } catch (e) {
      console.error("儲存順序失敗：", e);
      alert("儲存順序失敗！");
    } finally {
      isLoading.value = false;
    }
  };

  watch(memberListElement, (newEl) => {
    if (newEl) initSortable();
  });

  watch(activeTeam, async () => {
    await nextTick();
    if (memberListElement.value && memberListElement.value.$el) {
      const sortableInstance = Sortable.get(memberListElement.value.$el);
      if (sortableInstance) sortableInstance.destroy();
      initSortable();
    }
  });

  return {
    members,
    filteredMembers,
    newMember,
    newTeamName,
    newTitleName,
    memberListElement,
    isOrderChanged,
    showAddMemberModal,
    activeTeam,
    showEditMemberModal,
    editingMember,
    openEditModal,
    handleUpdateMember,
    teams,
    titles,
    titleOptions,
    teamOptions,
    loadMembers,
    handleAddMember,
    handleDeleteMember,
    handleToggleStatus,
    handleSaveOrder,
  };
}
