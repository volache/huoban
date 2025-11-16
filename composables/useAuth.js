// /composables/useAuth.js

const { ref } = Vue;
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth } from "../firebase-config.js";

export function useAuth() {
  const user = ref(null);
  const error = ref(null);
  const isInitializing = ref(true); // 追蹤初始驗證狀態

  // 監聽 Firebase 的驗證狀態變化
  const unsubscribe = onAuthStateChanged(
    auth,
    (currentUser) => {
      user.value = currentUser;
      isInitializing.value = false; // 初始狀態檢查完成
    },
    (err) => {
      console.error("Auth state error:", err);
      error.value = err;
      isInitializing.value = false;
    }
  );

  // 登入函式
  const login = async (email, password) => {
    error.value = null;
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error("Login failed:", err.code);
      switch (err.code) {
        case "auth/invalid-email":
          error.value = "信箱格式不正確。";
          break;
        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential":
          error.value = "信箱或密碼錯誤。";
          break;
        default:
          error.value = "登入時發生未知錯誤。";
          break;
      }
    }
  };

  // 登出函式
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout failed:", err);
      alert("登出失敗，請稍後再試。");
    }
  };

  return {
    user,
    error,
    isInitializing,
    login,
    logout,
  };
}
