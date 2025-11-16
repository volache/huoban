// /views/MembersView.js

const { inject, computed } = Vue;

export default {
  name: "MembersView",
  setup() {
    const membersData = inject("members");

    const openAddMember = () => {
      if (membersData) {
        membersData.showAddMemberModal.value = true;
      }
    };

    const teamTabs = computed(() =>
      (membersData?.teams.value || []).map((t) => ({ value: t, text: t }))
    );

    return { membersData, openAddMember, teamTabs };
  },
  template: `
    <div v-if="membersData" class="flex flex-col h-full">
      <div class="flex justify-between items-center mb-4 shrink-0">
        <h2 class="text-2xl font-bold text-slate-700">成員管理</h2>

        <div class="flex items-center gap-2">
          <transition name="fade">
            <round-icon-button
              v-if="membersData.isOrderChanged.value"
              @click="membersData.handleSaveOrder"
              icon="fa-save"
              title="儲存順序"
              variant="secondary"
            />
          </transition>
          <round-icon-button icon="fa-user-plus" title="新增成員" variant="primary" @click="openAddMember" />
        </div>
      </div>

      <team-tabs v-if="membersData.teams.value.length > 1" v-model="membersData.activeTeam.value" :tabs="teamTabs" />

      <div class="flex-1 overflow-y-auto pr-2 -mr-2">
        <transition name="fade" mode="out-in">
          <transition-group 
            :key="membersData.activeTeam.value"
            v-if="membersData.filteredMembers.value.length > 0" 
            tag="ul" 
            name="list" 
            class="space-y-3" 
            :ref="(el) => membersData.memberListElement.value = el">
            <li v-for="member in membersData.filteredMembers.value" :key="member.id" class="p-4 bg-white rounded-xl shadow-md flex justify-between items-center transition-shadow hover:shadow-lg cursor-grab active:cursor-grabbing">
              <div class="flex items-center">
                <i class="fa-solid fa-grip-vertical text-slate-400 mr-4 text-lg"></i>
                <div>
                  <p class="text-lg">
                    <span class="font-bold text-slate-800">{{ member.name }}</span>
                    <span class="text-sm text-slate-500 ml-2">（{{ member.title }}）</span>
                  </p>
                  <p class="text-base text-teal-600 font-semibold">{{ member.team }}</p>
                </div>
              </div>
              
              <div class="flex items-center gap-2">
                <button @click="membersData.handleToggleStatus(member)" class="text-white font-semibold py-1 px-3 rounded-full text-xs flex items-center gap-1.5" :class="member.status === '在職' ? 'bg-green-500 hover:bg-green-600' : 'bg-slate-400 hover:bg-slate-500'">
                  <i class="fa-solid fa-xs" :class="member.status === '在職' ? 'fa-check' : 'fa-times'"></i>
                  {{ member.status }}
                </button>
                
                <div class="flex items-center space-x-1">
                  <button @click.stop="membersData.openEditModal(member)" class="text-sky-500 hover:text-sky-700 w-8 h-8 rounded-full hover:bg-sky-100 transition-colors" title="編輯成員">
                    <i class="fa-solid fa-pen-to-square"></i>
                  </button>

                  <button @click.stop="membersData.handleDeleteMember(member.id, member.name)" class="text-red-500 hover:text-red-700 w-8 h-8 rounded-full hover:bg-red-100 transition-colors" title="刪除成員">
                    <i class="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              </div>
            </li>
          </transition-group>
          <p v-else class="text-slate-500 text-center py-8">此班別尚無成員資料，請點右上角新增。</p>
        </transition>
      </div>
    </div>
  `,
};
