// /views/EventsView.js

const { inject, ref } = Vue;

export default {
  name: "EventsView",
  setup() {
    const eventsData = inject("events");
    const showFilters = ref(false);

    const openAddEvent = () => {
      if (eventsData) {
        eventsData.showAddEventModal.value = true;
      }
    };

    return { eventsData, showFilters, openAddEvent };
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

      <div class="flex-1 overflow-y-auto pr-2 -mr-2">
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
        <p v-else class="text-slate-500 text-center py-8">
          {{ eventsData.eventFilter.memberId || eventsData.eventFilter.eventType ? '找不到符合條件的事件' : '近 30 天無事件紀錄' }}
        </p>
      </div>
    </div>
  `,
};
