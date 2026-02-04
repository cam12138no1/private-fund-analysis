#!/bin/bash
# 测试数据隔离

# 首先获取CSRF token和session
echo "=== 测试 analyst1 登录 ==="
curl -s -c cookies1.txt -b cookies1.txt \
  'https://finsight-pro-ai.vercel.app/api/auth/csrf' | jq .

CSRF1=$(curl -s -c cookies1.txt -b cookies1.txt 'https://finsight-pro-ai.vercel.app/api/auth/csrf' | jq -r '.csrfToken')
echo "CSRF Token: $CSRF1"

# 登录 analyst1
curl -s -c cookies1.txt -b cookies1.txt \
  -X POST 'https://finsight-pro-ai.vercel.app/api/auth/callback/credentials' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d "email=analyst1@finsight.internal&password=Analyst1!&csrfToken=$CSRF1&callbackUrl=https://finsight-pro-ai.vercel.app/dashboard" \
  -o /dev/null -w "HTTP Status: %{http_code}\n"

# 获取 analyst1 的数据
echo ""
echo "=== analyst1 的数据 ==="
curl -s -c cookies1.txt -b cookies1.txt \
  'https://finsight-pro-ai.vercel.app/api/dashboard' | jq '.analyses | length'

curl -s -c cookies1.txt -b cookies1.txt \
  'https://finsight-pro-ai.vercel.app/api/dashboard' | jq '.analyses[] | {company: .company_name, user_id: .user_id}'

