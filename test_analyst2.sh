#!/bin/bash
# 测试 analyst2

CSRF2=$(curl -s -c cookies2.txt -b cookies2.txt 'https://finsight-pro-ai.vercel.app/api/auth/csrf' | jq -r '.csrfToken')
echo "CSRF Token: $CSRF2"

# 登录 analyst2
curl -s -c cookies2.txt -b cookies2.txt \
  -X POST 'https://finsight-pro-ai.vercel.app/api/auth/callback/credentials' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d "email=analyst2@finsight.internal&password=Analyst2!&csrfToken=$CSRF2&callbackUrl=https://finsight-pro-ai.vercel.app/dashboard" \
  -o /dev/null -w "HTTP Status: %{http_code}\n"

# 检查session
echo ""
echo "=== analyst2 Session ==="
curl -s -c cookies2.txt -b cookies2.txt 'https://finsight-pro-ai.vercel.app/api/auth/session' | jq .

# 获取 analyst2 的数据
echo ""
echo "=== analyst2 的数据 ==="
curl -s -c cookies2.txt -b cookies2.txt 'https://finsight-pro-ai.vercel.app/api/dashboard' | jq .
