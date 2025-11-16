// /composables/useInventory.js

const { ref, watch, computed, nextTick } = Vue;
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
  orderBy,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "../firebase-config.js";
import { deleteSnapshot as apiDeleteSnapshot } from "../firebase-api/firebase.js";
import { exportToCsv } from "../utils/export.js";

async function compressImage(file, maxWidth = 800, quality = 0.7) {
  if (!file || !file.type.startsWith("image/")) return null;
  const img = new Image();
  const url = URL.createObjectURL(file);
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = url;
  });
  const scale = Math.min(1, maxWidth / img.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) =>
    canvas.toBlob(
      (blob) => {
        URL.revokeObjectURL(url);
        resolve(blob);
      },
      "image/jpeg",
      quality
    )
  );
}
async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function useInventory(isLoading, membersData) {
  const inventories = ref([]);
  const newItem = ref({
    team: "",
    itemName: "",
    quantity: 0,
    unit: "",
    imageUrl: null,
    imageData: null,
  });
  const searchQuery = ref("");
  const inventoryListElement = ref(null);
  const isOrderChanged = ref(false);

  const filteredInventories = (currentTeam) =>
    computed(() => {
      let result = inventories.value;
      if (currentTeam)
        result = result.filter((item) => item.team === currentTeam);
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        result = result.filter((item) =>
          item.itemName.toLowerCase().includes(query)
        );
      }
      return result;
    });

  async function loadInventories() {
    try {
      const qy = query(
        collection(db, "inventories"),
        orderBy("team"),
        orderBy("displayOrder")
      );
      const snap = await getDocs(qy);
      inventories.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (err) {
      if (err.code === "failed-precondition") {
        console.warn(
          "Firestore 'inventories' index missing. Using fallback query..."
        );
        try {
          const fallbackQuery = query(collection(db, "inventories"));
          const snap = await getDocs(fallbackQuery);
          const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          data.sort(
            (a, b) =>
              (a.team || "").localeCompare(b.team || "") ||
              (a.displayOrder || 0) - (b.displayOrder || 0)
          );
          inventories.value = data;
        } catch (fallbackErr) {
          console.error("Fallback query failed:", fallbackErr);
          alert("讀取庫存清單失敗。");
          inventories.value = [];
        }
      } else {
        console.error("loadInventories error:", err);
        alert("讀取庫存清單失敗。");
        inventories.value = [];
      }
    }
  }

  async function addItem(file) {
    if (!newItem.value.itemName || !newItem.value.team) return;
    isLoading.value = true;
    try {
      let imageData = null;
      if (file) {
        const blob = (await compressImage(file)) ?? file;
        imageData = await blobToBase64(blob);
      }
      const itemsInSameTeam = inventories.value.filter(
        (i) => i.team === newItem.value.team
      );
      await addDoc(collection(db, "inventories"), {
        team: newItem.value.team,
        itemName: newItem.value.itemName.trim(),
        quantity: Number(newItem.value.quantity) || 0,
        unit: newItem.value.unit.trim(),
        imageUrl: null,
        imageData,
        displayOrder: itemsInSameTeam.length,
        updatedAt: serverTimestamp(),
      });
      await loadInventories();
      newItem.value = {
        team: newItem.value.team,
        itemName: "",
        quantity: 0,
        unit: "",
        imageUrl: null,
        imageData: null,
      };
    } catch (err) {
      console.error("addItem error:", err);
      alert("新增物品失敗。");
    } finally {
      isLoading.value = false;
    }
  }

  async function saveInventoryOrder(itemsInCurrentTeam) {
    isLoading.value = true;
    try {
      const batch = writeBatch(db);
      itemsInCurrentTeam.forEach((item, index) =>
        batch.update(doc(db, "inventories", item.id), { displayOrder: index })
      );
      await batch.commit();
      isOrderChanged.value = false;
      await loadInventories();
      alert("庫存順序已儲存！");
    } catch (err) {
      console.error("saveInventoryOrder error:", err);
      alert("儲存順序失敗。");
    } finally {
      isLoading.value = false;
    }
  }

  async function updateItemQty(id, qty) {
    try {
      await updateDoc(doc(db, "inventories", id), {
        quantity: Number(qty),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("updateItemQty error:", err);
      alert("更新數量失敗。");
    }
  }

  async function renameItem(id, itemName, unit) {
    try {
      await updateDoc(doc(db, "inventories", id), {
        itemName: (itemName || "").trim(),
        unit: (unit || "").trim(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("renameItem error:", err);
      alert("更新名稱或單位失敗。");
    }
  }

  async function updateItemImage(team, id, file) {
    if (!file) return null;
    try {
      const blob = (await compressImage(file)) ?? file,
        imageData = await blobToBase64(blob);
      await updateDoc(doc(db, "inventories", id), {
        imageData,
        updatedAt: serverTimestamp(),
      });
      return imageData;
    } catch (err) {
      console.error("updateItemImage error:", err);
      alert("上傳圖片失敗。");
      return null;
    }
  }

  async function deleteItem(item) {
    if (!confirm(`確定要刪除物品「${item.itemName}」嗎？此操作無法復原。`))
      return;
    try {
      await deleteDoc(doc(db, "inventories", item.id));
      await loadInventories();
    } catch (err) {
      console.error("deleteItem error:", err);
      alert("刪除物品失敗。");
    }
  }

  async function createMonthlySnapshot(team) {
    if (!team) return;
    if (
      !confirm(
        `確定要為「${team}」建立 ${new Date().getFullYear()}年${
          new Date().getMonth() + 1
        }月 的庫存快照嗎？`
      )
    )
      return;
    try {
      const teamItems = inventories.value.filter((i) => i.team === team);
      const now = new Date(),
        yyyy = now.getFullYear(),
        mm = String(now.getMonth() + 1).padStart(2, "0");
      const items = teamItems.map(
        ({ id, itemName, quantity, unit, imageUrl, imageData }) => ({
          id,
          itemName,
          quantity,
          unit,
          imageUrl: imageUrl || null,
          imageData: imageData || null,
        })
      );
      await addDoc(collection(db, "inventory_snapshots"), {
        team,
        period: `${yyyy}-${mm}`,
        items,
        createdAt: serverTimestamp(),
      });
      alert("快照建立成功！");
    } catch (err) {
      console.error("createMonthlySnapshot error:", err);
      alert("建立快照失敗。");
    }
  }

  async function getSnapshots(team) {
    if (!team) return [];
    try {
      const qy = query(
        collection(db, "inventory_snapshots"),
        where("team", "==", team)
      );
      const snap = await getDocs(qy);
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort(
        (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      );
      return rows;
    } catch (err) {
      console.error("getSnapshots error:", err);
      alert("讀取歷史快照失敗。");
      return [];
    }
  }

  async function deleteSnapshot(snapshot, team) {
    if (
      !snapshot ||
      !confirm(
        `確定要刪除 ${new Date(
          snapshot.createdAt.seconds * 1000
        ).toLocaleString()} 的快照嗎？`
      )
    )
      return;
    try {
      await apiDeleteSnapshot(snapshot.id);
      alert("快照已刪除。");
      return await getSnapshots(team);
    } catch (err) {
      console.error("deleteSnapshot error:", err);
      alert("刪除快照失敗。");
      return null;
    }
  }

  // 匯出盤點快照為 CSV 的函式
  const exportSnapshotToCSV = (snapshot) => {
    if (!snapshot || !snapshot.items || snapshot.items.length === 0) {
      alert("此快照沒有資料可匯出。");
      return;
    }

    const headers = ["物品名稱", "數量", "單位"];
    const data = [headers];

    snapshot.items.forEach((item) => {
      data.push([item.itemName || "", item.quantity || 0, item.unit || ""]);
    });

    const date = new Date(snapshot.createdAt.seconds * 1000);
    const dateString = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const filename = `盤點快照_${snapshot.team}_${dateString}`;
    exportToCsv(filename, data);
  };

  return {
    inventories,
    filteredInventories,
    newItem,
    searchQuery,
    isOrderChanged,
    inventoryListElement,
    loadInventories,
    addItem,
    updateItemQty,
    renameItem,
    updateItemImage,
    deleteItem,
    createMonthlySnapshot,
    getSnapshots,
    deleteSnapshot,
    saveInventoryOrder,
    exportSnapshotToCSV,
  };
}
