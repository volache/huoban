// /utils/date.js

export const fmtYMD = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

export const ymdOf = (y, m, d) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export const getDowShort = (y, m, d) =>
  new Intl.DateTimeFormat("zh-TW", { weekday: "short" })
    .format(new Date(y, m - 1, d))
    .replace("週", "");
