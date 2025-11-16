// /views/LoginView.js

const { ref, inject } = Vue;

export default {
  name: "LoginView",
  setup() {
    const auth = inject("auth");
    const email = ref("");
    const password = ref("");
    const isLoggingIn = ref(false);

    const handleLogin = async () => {
      if (!email.value || !password.value) {
        auth.error.value = "請輸入信箱與密碼。";
        return;
      }
      isLoggingIn.value = true;
      await auth.login(email.value, password.value);
      isLoggingIn.value = false;
    };

    return {
      auth,
      email,
      password,
      isLoggingIn,
      handleLogin,
    };
  },
  template: `
    <div class="w-full h-full flex flex-col items-center justify-center p-6 bg-slate-200">
      <div class="w-full max-w-xs">
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-teal-600">夥班 Huoban</h1>
          <p class="text-slate-500 mt-2">團隊勤務排班與庫存管理系統</p>
        </div>
        
        <form @submit.prevent="handleLogin" class="bg-white shadow-xl rounded-xl px-8 pt-6 pb-8 mb-4">
          <div class="mb-4">
            <label class="block text-slate-700 text-sm font-bold mb-2" for="email">
              電子信箱
            </label>
            <input v-model.trim="email"
                   id="email"
                   type="email"
                   placeholder="請輸入電子信箱"
                   class="p-3 w-full border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                   required>
          </div>
          <div class="mb-6">
            <label class="block text-slate-700 text-sm font-bold mb-2" for="password">
              密碼
            </label>
            <input v-model="password"
                   id="password"
                   type="password"
                   placeholder="請輸入密碼"
                   class="p-3 w-full border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                   required>
          </div>

          <transition name="fade">
            <div v-if="auth.error.value" class="mb-4 p-3 bg-rose-100 text-rose-700 rounded-lg text-center text-sm">
              {{ auth.error.value }}
            </div>
          </transition>

          <div class="flex items-center justify-between">
            <button :disabled="isLoggingIn"
                    class="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-colors disabled:bg-slate-400 flex items-center justify-center"
                    type="submit">
              <i v-if="isLoggingIn" class="fa-solid fa-spinner fa-spin mr-2"></i>
              {{ isLoggingIn ? '登入中⋯⋯' : '登入' }}
            </button>
          </div>
        </form>
        <p class="text-center text-slate-500 text-xs">
          &copy;{{ new Date().getFullYear() }} Huoban. All rights reserved.
        </p>
      </div>
    </div>
  `,
};
