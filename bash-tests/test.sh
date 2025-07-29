# auth
export access='from get access token function'

# create app
curl -X POST "https://joaocarvalhosdemos.outsystems.dev/api/app-generation/v1alpha3/jobs" -H "Authorization: Bearer $access" -d '{"prompt": "Recruitment Management System","files": [],"ignoreTenantContext": true}' -H "Content-Type: application/json" | jq

# get status
curl -X GET "https://joaocarvalhosdemos.outsystems.dev/api/app-generation/v1alpha3/jobs/bc99f1dd-59fa-45a4-a5d1-5c674d98a07c" -H "Authorization: Bearer $access" | jq

# generate
curl -X POST "https://joaocarvalhosdemos.outsystems.dev/api/app-generation/v1alpha3/jobs/bc99f1dd-59fa-45a4-a5d1-5c674d98a07c/generation" -H "Authorization: Bearer $access" | jq