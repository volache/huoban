// main.js

const { createApp, ref, computed, provide, watch } = Vue;

import BaseModal from "./components/BaseModal.js";
import CustomDatePicker from "./components/CustomDatePicker.js";
import CustomSelect from "./components/CustomSelect.js";
import EventCard from "./components/EventCard.js";
import FilterBar from "./components/FilterBar.js";
import RoundIconButton from "./components/RoundIconButton.js";
import TeamTabs from "./components/TeamTabs.js";

import { useAuth } from "./composables/useAuth.js";
import { useMembers } from "./composables/useMembers.js";
import { useEvents } from "./composables/useEvents.js";
import { useQuotas } from "./composables/useQuotas.js";
import { useDashboard } from "./composables/useDashboard.js";
import { useInventory } from "./composables/useInventory.js";
import LoginView from "./views/LoginView.js";
import MembersView from "./views/MembersView.js";
import EventsView from "./views/EventsView.js";
import QuotasView from "./views/QuotasView.js";
import DashboardView from "./views/DashboardView.js";
import InventoryView from "./views/InventoryView.js";
import { STATUS_COLORS } from "./utils/constants.js";

const app = createApp({
  setup() {
    // --- 1. 應用程式核心狀態 ---
    const isLoading = ref(false);
    const activeView = ref("dashboard");
    const isDataInitialized = ref(false);
    provide("isLoading", isLoading);

    // --- 2. 同步建立所有模組實例（依賴注入） ---
    const authData = useAuth();
    const membersData = useMembers(isLoading);
    const inventoryData = useInventory(isLoading, membersData);
    const eventsData = useEvents(isLoading, membersData);
    const quotasData = useQuotas(isLoading, membersData, eventsData);
    const dashboardData = useDashboard(isLoading, membersData, eventsData);

    // --- 3. 同步提供（Provide）模組實例 ---
    provide("auth", authData);
    provide("members", membersData);
    provide("events", eventsData);
    provide("quotas", quotasData);
    provide("inventory", inventoryData);
    provide("dashboard", dashboardData);
    provide("getStatusColor", (status) => STATUS_COLORS[status] || "bg-white");

    // --- 4. 核心初始化與登出邏輯 ---
    const initializeAppLogic = async () => {
      isLoading.value = true;
      try {
        await membersData.loadMembers();
        // 平行獲取剩餘資料
        await Promise.all([
          eventsData.loadEvents(),
          quotasData.loadQuotas(),
          inventoryData.loadInventories(),
          dashboardData.loadSchedules(),
        ]);
      } catch (error) {
        console.error("應用程式初始化失敗：", error);
        alert("應用程式資料載入失敗，請重新整理頁面。");
      } finally {
        isDataInitialized.value = true;
        isLoading.value = false;
      }
    };

    watch(
      authData.user,
      (newUser) => {
        if (newUser && !isDataInitialized.value) {
          initializeAppLogic();
        } else if (!newUser) {
          isDataInitialized.value = false;
          activeView.value = "dashboard";
        }
      },
      { immediate: true }
    );

    // --- 5. UI 相關 computed 與函式 ---
    const isAppLoading = computed(() => {
      // 初始驗證時，或登入後且資料尚未初始化完成時，顯示 Loading
      return (
        authData.isInitializing.value ||
        (authData.user.value && !isDataInitialized.value)
      );
    });

    const views = {
      dashboard: DashboardView,
      members: MembersView,
      events: EventsView,
      quotas: QuotasView,
      inventory: InventoryView,
    };
    const activeViewComponent = computed(() => views[activeView.value]);

    const navigateTo = (view) => {
      activeView.value = view;
      // 導航時自動關閉可能開啟的 Modal
      if (membersData) membersData.showAddMemberModal.value = false;
      if (eventsData) eventsData.showAddEventModal.value = false;
      if (dashboardData) dashboardData.cancelQuickEdit();
    };

    const navButtonClass = (viewName) => [
      "flex",
      "flex-col",
      "items-center",
      "justify-center",
      "flex-1",
      "py-2",
      "transition-colors",
      activeView.value === viewName
        ? "text-teal-600 font-bold"
        : "text-slate-500 hover:text-teal-500",
    ];

    // 為 Modal 的 v-model 建立可寫入的 computed 屬性
    const showAddMemberModal = computed({
      get: () => membersData.showAddMemberModal.value,
      set: (v) => {
        membersData.showAddMemberModal.value = v;
      },
    });
    const showEditMemberModal = computed({
      get: () => membersData.showEditMemberModal.value,
      set: (v) => {
        membersData.showEditMemberModal.value = v;
      },
    });
    const showAddEventModal = computed({
      get: () => eventsData.showAddEventModal.value,
      set: (v) => {
        eventsData.showAddEventModal.value = v;
      },
    });
    const showQuickEditModal = computed({
      get: () => dashboardData.showQuickEditModal.value,
      set: (v) => {
        dashboardData.showQuickEditModal.value = v;
      },
    });
    const showSubstituteTypeModal = computed({
      get: () => dashboardData.showSubstituteTypeModal.value,
      set: (v) => {
        dashboardData.showSubstituteTypeModal.value = v;
      },
    });

    return {
      auth: authData,
      isDataInitialized,
      isAppLoading,
      activeView,
      activeViewComponent,
      navigateTo,
      navButtonClass,

      // 直接傳遞模組實例，供 Modal 內部邏輯使用
      membersData,
      eventsData,
      dashboardData,
      inventoryData,

      // 傳遞 v-model 用的 computed 屬性
      showAddMemberModal,
      showEditMemberModal,
      showAddEventModal,
      showQuickEditModal,
      showSubstituteTypeModal,

      LoginView,
    };
  },
});

app.component("BaseModal", BaseModal);
app.component("CustomDatePicker", CustomDatePicker);
app.component("CustomSelect", CustomSelect);
app.component("EventCard", EventCard);
app.component("FilterBar", FilterBar);
app.component("RoundIconButton", RoundIconButton);
app.component("TeamTabs", TeamTabs);

app.component("LoginView", LoginView);
app.component("MembersView", MembersView);
app.component("EventsView", EventsView);
app.component("QuotasView", QuotasView);
app.component("DashboardView", DashboardView);
app.component("InventoryView", InventoryView);

app.mount("#app");
