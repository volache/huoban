// /views/EventsView.js

const { inject, ref, onMounted, onBeforeUnmount } = Vue;

export default {
  name: "EventsView",
  setup() {
    const eventsData = inject("events");
    const showFilters = ref(false);
    const scrollContainer = ref(null);

    const openAddEvent = () => {
      if (eventsData) {
        eventsData.showAddEventModal.value = true;
      }
    };

    const handleScroll = () => {
      if (!scrollContainer.value) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer.value;
      // 提前 100px 觸發
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        eventsData.loadMoreEvents();
      }
    };

    onMounted(() => {
      scrollContainer.value?.addEventListener("scroll", handleScroll);
    });

    onBeforeUnmount(() => {
      scrollContainer.value?.removeEventListener("scroll", handleScroll);
    });

    return { eventsData, showFilters, openAddEvent, scrollContainer };
  },
  template: `
    <div v-if="eventsData" class="flex flex-col h-full">
      <div class="flex justify-between items-center mb-4 shrink-0">
        <h2 class="text-2xl font-bold text-slate-700">差勤事件</h2>
        <div class="flex items-center gap-2">
          <round-icon-button icon="fa-filter" title="篩選" @click="showFilters = !showFilters" />
          <round-icon-button icon="fa-plus" title="新增事件" variant="primary" @click="openAddEvent" />
        </div>
      </div>

      <transition name="fade">
        <filter-bar
          v-if="showFilters"
          :model-value="eventsData.eventFilter"
          @update:model-value="Object.assign(eventsData.eventFilter, $event)"
          :filters="[
            { key:'memberId', type:'select', options: eventsData.memberOptionsForFilter.value, icon:'fa-solid fa-user', placeholder:'篩選成員' },
            { key:'eventType',  type:'select', options: eventsData.eventTypeOptionsForFilter.value, icon:'fa-solid fa-tag',  placeholder:'篩選事件類型' },
          ]"
          @clear="eventsData.clearFilters"
        />
      </transition>

      <div class="flex-1 overflow-y-auto pr-2 -mr-2" ref="scrollContainer">
        <transition-group v-if="eventsData.filteredEvents.value.length" tag="ul" name="list" class="space-y-3">
          <event-card
            v-for="event in eventsData.filteredEvents.value"
            :key="event.id"
            :event="event"
            :memberName="eventsData.getMemberName(event.memberId)"
            :visual="eventsData.getEventVisuals(event.eventType)"
            @delete="(id) => eventsData.handleDeleteEvent(id, \`\${event.date} \${eventsData.getMemberName(event.memberId)} 的 \${event.eventType} 事件\`)"
            @edit="eventsData.openEditEventModal"
          >
            {{ eventsData.formatEventDetails(event) }}
          </event-card>
        </transition-group>
        <p v-else-if="!eventsData.isMoreLoading.value" class="text-slate-500 text-center py-8">
          {{ eventsData.eventFilter.memberId || eventsData.eventFilter.eventType ? '找不到符合條件的事件' : '無事件紀錄' }}
        </p>
        
        <div v-if="eventsData.isMoreLoading.value" class="flex justify-center items-center py-4">
          <i class="fa-solid fa-spinner fa-spin text-slate-500"></i>
          <span class="ml-2 text-slate-500">載入中……</span>
        </div>

        <div v-if="!eventsData.hasMoreEventsToLoad.value && eventsData.filteredEvents.value.length > 0" class="text-center py-4 text-slate-400 text-sm">
          已載入所有紀錄
        </div>
      </div>
    </div>
  `,
};
