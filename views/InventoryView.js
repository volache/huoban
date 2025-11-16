// /views/InventoryView.js

const { ref, inject, watch, computed, nextTick } = Vue;

const PLACEHOLDER =
  "data:image/svg+xml;utf8,\
  <svg xmlns='http://www.w3.org/2000/svg' width='160' height='120'>\
    <rect width='100%' height='100%' rx='8' ry='8' fill='%23e2e8f0'/>\
    <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'\
      font-family='sans-serif' font-size='12' fill='%2364748b'>No Image</text>\
  </svg>";

export default {
  name: "InventoryView",
  setup() {
    const members = inject("members");
    const inventory = inject("inventory");

    const initialTeam = computed(() => members?.teams.value?.[0] ?? "");
    const currentTeam = ref(initialTeam.value);

    watch(
      initialTeam,
      (newVal) => {
        if (newVal && !currentTeam.value) {
          currentTeam.value = newVal;
        }
      },
      { immediate: true }
    );

    const showHistory = ref(false);
    const snapshots = ref([]);
    const selectedSnapshot = ref(null);
    const showAddItemModal = ref(false);
    const newItemFile = ref(null);
    const newItemFileName = ref("");
    const showImageModal = ref(false);
    const zoomImageSrc = ref("");
    const currentItemForModal = ref(null);

    const filteredInventories = computed(() => {
      if (!currentTeam.value || !inventory) return [];
      return inventory.filteredInventories(currentTeam.value).value;
    });

    const initSortable = () => {
      if (!inventory?.inventoryListElement.value) return;
      const sortableInstance = Sortable.get(
        inventory.inventoryListElement.value
      );
      if (sortableInstance) sortableInstance.destroy();

      new Sortable(inventory.inventoryListElement.value, {
        animation: 150,
        handle: ".drag-handle",
        onEnd: (evt) => {
          const movedItem = filteredInventories.value.splice(
            evt.oldIndex,
            1
          )[0];
          filteredInventories.value.splice(evt.newIndex, 0, movedItem);
          inventory.isOrderChanged.value = true;
        },
      });
    };

    watch(currentTeam, async () => {
      await nextTick();
      initSortable();
    });

    watch(
      () => inventory?.inventoryListElement.value,
      (newEl) => {
        if (newEl) initSortable();
      }
    );

    async function handleAdd() {
      inventory.newItem.value.team = currentTeam.value;
      await inventory.addItem(newItemFile.value);
      newItemFile.value = null;
      newItemFileName.value = "";
      showAddItemModal.value = false;
    }

    async function handleImageChange(item, e) {
      const file = e.target.files?.[0];
      if (!file || !item) return;
      const base64 = await inventory.updateItemImage(
        currentTeam.value,
        item.id,
        file
      );
      if (base64) {
        item.imageData = base64;
        item.imageUrl = null;
        zoomImageSrc.value = itemImageSrc(item);
      }
      e.target.value = "";
    }

    async function openHistory() {
      snapshots.value = await inventory.getSnapshots(currentTeam.value);
      selectedSnapshot.value = snapshots.value?.[0] || null;
      showHistory.value = true;
    }

    const teamTabs = computed(() =>
      (members?.teams.value || []).map((t) => ({ value: t, text: t }))
    );

    function tsToLocal(ts) {
      if (!ts?.seconds) return "";
      return new Date(ts.seconds * 1000).toLocaleString("zh-TW", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: true,
      });
    }

    const snapshotOptions = computed(() => {
      return snapshots.value.map((s) => ({
        value: s,
        text: tsToLocal(s.createdAt),
      }));
    });

    function itemImageSrc(item) {
      if (item.imageUrl) return item.imageUrl;
      if (item.imageData) return `data:image/jpeg;base64,${item.imageData}`;
      return PLACEHOLDER;
    }

    function openImageModal(item) {
      currentItemForModal.value = item;
      zoomImageSrc.value = itemImageSrc(item);
      showImageModal.value = true;
    }

    function onPickNewFile(e) {
      const f = e.target.files?.[0] || null;
      newItemFile.value = f;
      newItemFileName.value = f ? f.name : "";
    }

    async function handleDeleteSnapshot(snapshot) {
      const newSnapshots = await inventory.deleteSnapshot(
        snapshot,
        currentTeam.value
      );
      if (newSnapshots) {
        snapshots.value = newSnapshots;
        selectedSnapshot.value = newSnapshots[0] || null;
      }
    }

    return {
      inventory,
      filteredInventories,
      currentTeam,
      teamTabs,
      PLACEHOLDER,
      showAddItemModal,
      newItemFile,
      newItemFileName,
      currentItemForModal,
      showImageModal,
      zoomImageSrc,
      showHistory,
      snapshots,
      selectedSnapshot,
      snapshotOptions,
      handleAdd,
      handleImageChange,
      openHistory,
      tsToLocal,
      itemImageSrc,
      openImageModal,
      onPickNewFile,
      handleDeleteSnapshot,
    };
  },
  template: `
  <div v-if="inventory" class="flex flex-col h-full">
    <div class="shrink-0 space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold text-slate-700">庫存盤點</h2>
        <div class="flex items-center gap-2">
          <transition name="fade">
            <round-icon-button
              v-if="inventory.isOrderChanged.value"
              @click="inventory.saveInventoryOrder(filteredInventories)"
              icon="fa-save"
              title="儲存順序"
              variant="secondary"
            />
          </transition>
          <round-icon-button icon="fa-clock-rotate-left" title="歷史紀錄" @click="openHistory" />
          <round-icon-button icon="fa-camera" title="立即快照" @click="inventory.createMonthlySnapshot(currentTeam)" />
          <round-icon-button icon="fa-plus" title="新增物品" variant="primary" @click="showAddItemModal = true" />
        </div>
      </div>

      <team-tabs v-model="currentTeam" :tabs="teamTabs" />

      <div>
        <div class="relative">
          <i class="fa-solid fa-search text-slate-400 absolute top-1/2 left-3 -translate-y-1/2"></i>
          <input v-model.trim="inventory.searchQuery.value" type="text" placeholder="搜尋物品名稱..."
                class="w-full p-2 pl-9 border rounded-lg bg-white" />
        </div>
        <p class="text-xs text-slate-500 text-right mt-1 pr-1">共 {{ filteredInventories.length }} 項物品</p>
      </div>
    </div>

    <div class="flex-1 overflow-auto bg-white rounded-xl shadow-md mt-4">
      <transition name="fade" mode="out-in">
        <table :key="currentTeam" class="w-full text-sm">
          <thead class="sticky top-0 bg-white text-slate-600 z-10 border-b-2 border-slate-200">
            <tr>
              <th class="p-2 border-b-2 border-slate-200 font-bold w-7"></th> 
              <th class="p-2 border-b-2 border-slate-200 font-bold">圖片</th>
              <th class="p-2 border-b-2 border-slate-200 font-bold text-left">物品</th>
              <th class="p-2 border-b-2 border-slate-200 font-bold text-center w-12">數量</th>
              <th class="p-2 border-b-2 border-slate-200 font-bold text-center w-12">單位</th>
              <th class="p-2 border-b-2 border-slate-200 font-bold whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody :ref="(el) => inventory.inventoryListElement.value = el">
            <tr v-if="filteredInventories.length === 0">
              <td colspan="6" class="text-center py-6 text-slate-500">
                {{ !currentTeam ? '載入中...' : (inventory.searchQuery.value ? '找不到符合條件的物品' : '此班別尚無庫存資料') }}
              </td>
            </tr>
            <tr v-for="item in filteredInventories" :key="item.id" class="border-b last:border-0 hover:bg-slate-50">
              <td class="px-1 py-2 text-center">
                <i class="fa-solid fa-grip-vertical text-slate-400 drag-handle"
                  :class="{ 'cursor-grab active:cursor-grabbing': !inventory.searchQuery.value, 'cursor-not-allowed text-slate-200': inventory.searchQuery.value }"
                  :title="inventory.searchQuery.value ? '清除搜尋後才能排序' : '拖曳排序'"></i>
              </td>
              <td class="px-[0.375rem] py-2">
                <div class="w-16 h-12 bg-slate-100 rounded-md overflow-hidden flex items-center justify-center">
                  <img :src="itemImageSrc(item)" alt="thumb"
                      class="max-w-full max-h-full object-contain cursor-pointer transition-transform hover:scale-105"
                      @click="openImageModal(item)" />
                </div>
              </td>
              <td class="px-[0.375rem] py-2">
                <input v-model="item.itemName" @blur="inventory.renameItem(item.id, item.itemName, item.unit)" class="w-full p-1 border rounded-lg" />
              </td>
              <td class="px-[0.375rem] py-2 text-right">
                <input type="number" v-model.number="item.quantity" @change="inventory.updateItemQty(item.id, item.quantity)"
                      class="w-full text-right border rounded-lg p-1" />
              </td>
              <td class="px-[0.375rem] py-2 text-center">
                <input v-model="item.unit" @blur="inventory.renameItem(item.id, item.itemName, item.unit)" class="w-full text-center border rounded-lg p-1" />
              </td>
              <td class="px-[0.375rem] py-2 text-center">
                <button @click="inventory.deleteItem(item)" class="text-red-500 hover:text-red-700 w-8 h-8 rounded-full hover:bg-red-100 transition-colors" title="刪除">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </transition>
    </div>

    <!-- Modals -->
    <base-modal v-model="showAddItemModal" title="新增物品">
      <div class="space-y-4">
        <input v-model="inventory.newItem.value.itemName" placeholder="物品名稱" class="w-full p-2 border rounded-lg" />
        <div class="flex gap-2">
          <input v-model.number="inventory.newItem.value.quantity" type="number" placeholder="數量" class="w-28 p-2 border rounded-lg text-right" />
          <input v-model="inventory.newItem.value.unit" placeholder="單位" class="flex-1 p-2 border rounded-lg min-w-0" />
        </div>
        <div class="flex items-center gap-2">
          <input id="inv-new-file" type="file" accept="image/*" class="hidden" @change="onPickNewFile" />
          <label for="inv-new-file"
                 class="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer shadow-sm">
            <i class="fa-solid fa-upload text-slate-600"></i>
            <span class="text-sm text-slate-700">選擇圖片</span>
          </label>
          <span class="flex-1 truncate text-sm text-slate-500 text-right">
            {{ newItemFileName || '未選擇任何檔案' }}
          </span>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end space-x-3">
          <button @click="showAddItemModal = false" class="bg-slate-200 text-slate-700 font-semibold py-2 px-4 text-sm rounded-lg hover:bg-slate-300">
            取消
          </button>
          <button @click="handleAdd" class="bg-teal-600 text-white font-semibold py-2 px-4 text-sm rounded-lg shadow-md hover:bg-teal-700">
            確認新增
          </button>
        </div>
      </template>
    </base-modal>
    <base-modal v-model="showImageModal" :closable="true" :title="'圖片預覽'">
      <input :id="'modal-img-chg-'+currentItemForModal?.id" type="file" accept="image/*" class="hidden" 
             @change="(e) => handleImageChange(currentItemForModal, e)" />
      
      <div class="w-full flex items-center justify-center py-2">
        <img :src="zoomImageSrc" class="max-w-full max-h-[70vh] object-contain" />
      </div>
      <template #footer>
        <div class="flex justify-between items-center w-full">
            <label :for="'modal-img-chg-'+currentItemForModal?.id"
                   class="bg-sky-500 text-white font-semibold py-2 px-4 text-sm rounded-lg hover:bg-sky-600 cursor-pointer">
              更換圖片
            </label>
            <button @click="showImageModal=false" class="bg-slate-200 text-slate-700 font-semibold py-2 px-4 text-sm rounded-lg hover:bg-slate-300">
              關閉
            </button>
        </div>
      </template>
    </base-modal>
    <base-modal v-model="showHistory" :title="'歷史紀錄'" width-class="max-w-lg">
      <div v-if="snapshots && snapshots.length" class="space-y-3">
        <div class="flex items-center gap-2">
          <label class="text-slate-600 shrink-0">版本：</label>
          <custom-select
            v-model="selectedSnapshot"
            :options="snapshotOptions"
            placeholder="選擇歷史版本"
            class="w-full"
           />
           <button v-if="selectedSnapshot" @click="handleDeleteSnapshot(selectedSnapshot)" class="text-red-500 hover:text-red-700 w-10 h-10 rounded-full hover:bg-red-100 transition-colors shrink-0" title="刪除此快照">
              <i class="fa-solid fa-trash-can"></i>
            </button>
        </div>
        <div class="max-h-[50vh] overflow-auto">
          <table class="w-full text-sm">
            <thead class="sticky top-0 bg-slate-100 text-slate-600">
              <tr>
                <th class="p-2 text-left">物品</th>
                <th class="p-2 text-right">數量</th>
                <th class="p-2">單位</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in (selectedSnapshot?.items || [])" :key="row.itemName" class="border-b last:border-0">
                <td class="p-2">{{ row.itemName }}</td>
                <td class="p-2 text-right">{{ row.quantity }}</td>
                <td class="p-2 text-center">{{ row.unit }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <p v-else class="text-slate-500">尚無快照記錄。</p>
      <template #footer>
        <div class="flex justify-between items-center">
            <button v-if="selectedSnapshot" @click="inventory.exportSnapshotToCSV(selectedSnapshot)" class="bg-sky-500 text-white font-semibold py-2 px-4 text-sm rounded-lg hover:bg-sky-600">
              匯出此快照
            </button>
            <div v-else></div> <!-- 佔位元素以維持版面 -->
            <button @click="showHistory=false" class="bg-slate-200 text-slate-700 font-semibold py-2 px-4 text-sm rounded-lg hover:bg-slate-300">
              關閉
            </button>
        </div>
      </template>
    </base-modal>
  </div>
  `,
};
