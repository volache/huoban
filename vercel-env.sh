#!/bin/bash

# 腳本會在 Vercel 部署環境中執行
# 它會讀取 Vercel 的環境變數，並將它們寫入一個新的 env.js 檔案中

echo "window.env = {" > env.js
echo "  VUE_APP_FIREBASE_API_KEY: \"$VUE_APP_FIREBASE_API_KEY\"," >> env.js
echo "  VUE_APP_FIREBASE_AUTH_DOMAIN: \"$VUE_APP_FIREBASE_AUTH_DOMAIN\"," >> env.js
echo "  VUE_APP_FIREBASE_PROJECT_ID: \"$VUE_APP_FIREBASE_PROJECT_ID\"," >> env.js
echo "  VUE_APP_FIREBASE_STORAGE_BUCKET: \"$VUE_APP_FIREBASE_STORAGE_BUCKET\"," >> env.js
echo "  VUE_APP_FIREBASE_MESSAGING_SENDER_ID: \"$VUE_APP_FIREBASE_MESSAGING_SENDER_ID\"," >> env.js
echo "  VUE_APP_FIREBASE_APP_ID: \"$VUE_APP_FIREBASE_APP_ID\"" >> env.js
echo "};" >> env.js

echo "env.js file generated successfully."