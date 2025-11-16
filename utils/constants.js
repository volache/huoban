// /utils/constants.js

export const LEAVE_TYPE_CONFIG = {
  特休: { name: "特休", unit: "hour", convertToHours: true },
  補休: { name: "補休", unit: "hour", convertToHours: false },
  事假: { name: "事假", unit: "hour", convertToHours: true },
  病假: { name: "病假", unit: "hour", convertToHours: true },
  喪假: { name: "喪假", unit: "day", convertToHours: false },
  歲時儀祭: { name: "歲時儀祭", unit: "day", convertToHours: false },
};

export const LEAVE_TYPES = Object.keys(LEAVE_TYPE_CONFIG);

export const EVENT_TYPES = ["請假", "代班", "調班", "調假", "加班"];

export const STATUS_COLORS = {
  休息: "bg-amber-100 text-amber-800",
  例假: "bg-orange-200 text-orange-800",
  休: "bg-slate-200 text-slate-700",
  代班: "bg-sky-100 text-sky-800",
  調班: "bg-teal-100 text-teal-800",
  調假: "bg-indigo-100 text-indigo-800",
  特休: "bg-rose-100 text-rose-800",
  補休: "bg-rose-100 text-rose-800",
  事假: "bg-rose-100 text-rose-800",
  病假: "bg-rose-100 text-rose-800",
  喪假: "bg-rose-100 text-rose-800",
  歲時儀祭: "bg-rose-100 text-rose-800",
  上班: "bg-slate-50 text-slate-700",
};
