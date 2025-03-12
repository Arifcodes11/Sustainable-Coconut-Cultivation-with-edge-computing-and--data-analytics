#!/bin/bash

# Get the bearer token from the authentication response
auth_response=$(curl 'https://192.168.192.200/api/sonicos/auth' 
  -H 'Accept: application/json, text/plain, */*' 
  -H 'Accept-Language: en-US,en;q=0.9' 
  -H 'Authorization: Basic MVNJMjFDUzAwMzo1T0MwODdSUw==' 
  -H 'Connection: keep-alive' 
  -H 'Content-Type: application/json' 
  -H 'Origin: https://192.168.192.200' 
  -H 'Referer: https://192.168.192.200/' 
  -H 'Sec-Fetch-Dest: empty' 
  -H 'Sec-Fetch-Mode: cors' 
  -H 'Sec-Fetch-Site: same-origin' 
  -H 'User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' 
  -H 'X-SNWL-API-Scope: extended' 
  -H 'X-SNWL-Timer: no-reset' 
  -H 'sec-ch-ua: "Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"' 
  -H 'sec-ch-ua-mobile: ?0' 
  -H 'sec-ch-ua-platform: "Linux"' 
  --data-raw '{"override":false,"snwl":true}' 
  --insecure)

# Extract the bearer token from the JSON response
bearer_token=$(jq -r '.status.info[0].bearer_token' <<< "$auth_response")

# Make the user-status update request with the obtained bearer token
curl 'https://192.168.192.200/api/sonicos/user-status/update' 
  -H 'Accept: application/json, text/plain, */*' 
  -H 'Accept-Language: en-US,en;q=0.9' 
  -H "Authorization: Bearer $bearer_token" 
  -H 'Connection: keep-alive' 
  -H 'Content-Type: application/json' 
  -H 'Origin: https://192.168.192.200' 
  -H 'Referer: https://192.168.192.200/' 
  -H 'Sec-Fetch-Dest: empty' 
  -H 'Sec-Fetch-Mode: cors' 
  -H 'Sec-Fetch-Site: same-origin' 
  -H 'User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' 
  -H 'X-SNWL-API-Scope: extended' 
  -H 'X-SNWL-Timer: no-reset' 
  -H 'sec-ch-ua: "Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"' 
  -H 'sec-ch-ua-mobile: ?0' 
  -H 'sec-ch-ua-platform: "Linux"' 
  --data-raw '{"max_session":700}' 
  --insecure


