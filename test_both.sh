#!/bin/bash

echo "========== analyst1 =========="
CSRF1=$(curl -s -c c1.txt -b c1.txt 'https://finsight-pro-ai.vercel.app/api/auth/csrf' | jq -r '.csrfToken')
curl -s -c c1.txt -b c1.txt -X POST 'https://finsight-pro-ai.vercel.app/api/auth/callback/credentials' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d "email=analyst1@finsight.internal&password=Analyst1!&csrfToken=$CSRF1&callbackUrl=/" -o /dev/null
echo "Session:"
curl -s -c c1.txt -b c1.txt 'https://finsight-pro-ai.vercel.app/api/auth/session' | jq '{email: .user.email, id: .user.id}'
echo "Data:"
curl -s -c c1.txt -b c1.txt 'https://finsight-pro-ai.vercel.app/api/dashboard' | jq '.analyses[] | {company: .company_name, user_id: .user_id, created: .created_at}'

echo ""
echo "========== analyst2 =========="
CSRF2=$(curl -s -c c2.txt -b c2.txt 'https://finsight-pro-ai.vercel.app/api/auth/csrf' | jq -r '.csrfToken')
curl -s -c c2.txt -b c2.txt -X POST 'https://finsight-pro-ai.vercel.app/api/auth/callback/credentials' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d "email=analyst2@finsight.internal&password=Analyst2!&csrfToken=$CSRF2&callbackUrl=/" -o /dev/null
echo "Session:"
curl -s -c c2.txt -b c2.txt 'https://finsight-pro-ai.vercel.app/api/auth/session' | jq '{email: .user.email, id: .user.id}'
echo "Data:"
curl -s -c c2.txt -b c2.txt 'https://finsight-pro-ai.vercel.app/api/dashboard' | jq '.analyses[] | {company: .company_name, user_id: .user_id, created: .created_at}'
