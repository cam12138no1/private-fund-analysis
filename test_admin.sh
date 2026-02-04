#!/bin/bash
# 测试 admin

CSRF=$(curl -s -c cookies_admin.txt -b cookies_admin.txt 'https://finsight-pro-ai.vercel.app/api/auth/csrf' | jq -r '.csrfToken')
echo "CSRF Token: $CSRF"

# 登录 admin
curl -s -c cookies_admin.txt -b cookies_admin.txt \
  -X POST 'https://finsight-pro-ai.vercel.app/api/auth/callback/credentials' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d "email=admin@example.com&password=admin123&csrfToken=$CSRF&callbackUrl=https://finsight-pro-ai.vercel.app/dashboard" \
  -o /dev/null -w "HTTP Status: %{http_code}\n"

# 检查session
echo ""
echo "=== admin Session ==="
curl -s -c cookies_admin.txt -b cookies_admin.txt 'https://finsight-pro-ai.vercel.app/api/auth/session' | jq .

# 获取 admin 的数据
echo ""
echo "=== admin 的数据 ==="
curl -s -c cookies_admin.txt -b cookies_admin.txt 'https://finsight-pro-ai.vercel.app/api/dashboard' | jq '.analyses[] | {company: .company_name, user_id: .user_id}'
