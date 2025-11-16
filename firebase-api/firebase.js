// /api/firebase.js

import { db } from "../firebase-config.js";
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  writeBatch,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { normalizeEventData } from "../utils/validators.js";

// ---------- Members ----------
export async function getMembers() {
  const membersCol = collection(db, "members");
  const q = query(membersCol, orderBy("team"), orderBy("displayOrder"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addMember(memberData) {
  const membersCol = collection(db, "members");
  const docRef = await addDoc(membersCol, { ...memberData, status: "在職" });
  return { success: true, id: docRef.id };
}

export async function updateMember(memberId, memberData) {
  const { id, status, ...dataToUpdate } = memberData;
  await updateDoc(doc(db, "members", memberId), dataToUpdate);
  return { success: true };
}

export async function deleteMember(memberId) {
  await deleteDoc(doc(db, "members", memberId));
  return { success: true };
}

export async function updateMemberStatus(memberId, newStatus) {
  await updateDoc(doc(db, "members", memberId), { status: newStatus });
  return { success: true };
}

export async function updateMembersOrder(members) {
  const batch = writeBatch(db);
  members.forEach((m, i) =>
    batch.update(doc(db, "members", m.id), { displayOrder: i })
  );
  await batch.commit();
  return { success: true };
}

// ---------- Schedules ----------
export async function getSchedulesForMonth(year, month) {
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  const nextMonthDate = new Date(year, month, 1);
  const nextMonthStr = `${nextMonthDate.getFullYear()}-${String(
    nextMonthDate.getMonth() + 1
  ).padStart(2, "0")}`;

  const schedulesCol = collection(db, "schedules");
  const qy = query(
    schedulesCol,
    where("date", ">=", monthStr),
    where("date", "<", nextMonthStr)
  );
  const snap = await getDocs(qy);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function batchUpdateSchedules(changes, originalSchedulesMap) {
  const batch = writeBatch(db);
  const schedulesCol = collection(db, "schedules");

  for (const key in changes) {
    const [date, memberId] = key.split("_");
    const newShiftType = changes[key];
    const origin = originalSchedulesMap.get(key);
    const dow = new Date(date).getDay();
    const isWeekend = dow === 0 || dow === 6;
    const defaultStatus = isWeekend ? (dow === 0 ? "例假" : "休息") : "上班";
    const isDefault = newShiftType === defaultStatus;

    if (isDefault) {
      if (origin) batch.delete(doc(db, "schedules", origin.id));
    } else {
      if (origin) {
        if (origin.shiftType !== newShiftType) {
          batch.update(doc(db, "schedules", origin.id), {
            shiftType: newShiftType,
          });
        }
      } else {
        const newDocRef = doc(schedulesCol);
        batch.set(newDocRef, { date, memberId, shiftType: newShiftType });
      }
    }
  }

  await batch.commit();
  return { success: true };
}

// ---------- Events ----------
export async function getEvents(startDate = null) {
  const eventsCol = collection(db, "events");
  const constraints = [orderBy("date", "desc")];
  if (startDate) {
    constraints.push(where("date", ">=", startDate));
  }
  const qy = query(eventsCol, ...constraints);
  const snap = await getDocs(qy);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addEvent(eventData) {
  const cleaned = normalizeEventData(eventData);
  const eventsCol = collection(db, "events");
  const docRef = await addDoc(eventsCol, cleaned);
  return { success: true, id: docRef.id };
}

export async function updateEvent(eventId, eventData) {
  const cleaned = normalizeEventData(eventData);
  const { id, ...dataToUpdate } = cleaned;
  await updateDoc(doc(db, "events", eventId), dataToUpdate);
  return { success: true };
}

export async function deleteEvent(eventId) {
  await deleteDoc(doc(db, "events", eventId));
  return { success: true };
}

// ---------- Quotas ----------
export async function getQuotasForYear(year) {
  const quotasCol = collection(db, "quotas");
  const qy = query(quotasCol, where("year", "==", year));
  const snap = await getDocs(qy);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function batchUpdateQuotas(quotasToUpdate) {
  const batch = writeBatch(db);
  const quotasCol = collection(db, "quotas");
  quotasToUpdate.forEach((q) => {
    const data = {
      totalDays: q.totalDays || 0,
      initialUsedDays: q.initialUsedDays || 0,
      totalHours: q.totalHours || 0,
      initialUsedHours: q.initialUsedHours || 0,
      memberId: q.memberId,
      year: q.year,
      leaveType: q.leaveType,
    };
    if (q.id) {
      batch.update(doc(db, "quotas", q.id), data);
    } else {
      const newRef = doc(quotasCol);
      batch.set(newRef, data);
    }
  });
  await batch.commit();
  return { success: true };
}

// ---------- Inventory Snapshots ----------
export async function deleteSnapshot(snapshotId) {
  await deleteDoc(doc(db, "inventory_snapshots", snapshotId));
  return { success: true };
}
