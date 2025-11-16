// /firebase-config.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// 從 window.env 組裝 firebaseConfig
const firebaseConfig = {
  apiKey: window.env?.VUE_APP_FIREBASE_API_KEY,
  authDomain: window.env?.VUE_APP_FIREBASE_AUTH_DOMAIN,
  projectId: window.env?.VUE_APP_FIREBASE_PROJECT_ID,
  storageBucket: window.env?.VUE_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: window.env?.VUE_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: window.env?.VUE_APP_FIREBASE_APP_ID,
};

// 安全性檢查
if (!firebaseConfig.projectId) {
  if (window.location.hostname.includes("vercel.app")) {
    alert("Firebase 設定未載入！請檢查 Vercel 的環境變數與 Build Command。");
    throw new Error("Firebase config is not loaded on Vercel.");
  }
  console.warn(
    "Firebase config not found. Local development assumes firebase-config.local.js is used."
  );
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
