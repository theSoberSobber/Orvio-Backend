import requests
import json
import time
import sys
import threading
import select

BASE_URL = "http://localhost:3000"
WAIT_TIME = 20  # Seconds

def log(status, message, data=None):
    """ Logs output in a structured CLI format """
    colors = {"INFO": "\033[94m", "SUCCESS": "\033[92m", "ERROR": "\033[91m", "RESET": "\033[0m"}
    print(f"{colors[status]}[{status}] {message}{colors['RESET']}")
    if data:
        print(json.dumps(data, indent=2))

def getMe(headers):
    """ Fetch user info """
    res = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    log("INFO", "GET /auth/me", res.json())

def wait_or_skip():
    """ Waits 20 seconds but allows skipping by pressing 't' """
    print("\033[93m[WAIT] Waiting 20 seconds... (Press 't' and Enter to skip)\033[0m")
    for _ in range(WAIT_TIME):
        time.sleep(1)
        if sys.stdin in select.select([sys.stdin], [], [], 0)[0]:  # Check for input
            if sys.stdin.read(1).strip().lower() == "t":
                print("\033[92m[SKIP] Skipping wait...\033[0m")
                return

# 1️⃣ Sign Up & OTP Verification
L = requests.post(f"{BASE_URL}/auth/signup", json={"phoneNumber": "+919770483089"})
tid = L.json().get("transactionId")
log("INFO", "Transaction ID received", {"transactionId": tid})
wait_or_skip()

# Wrong OTP Test
wrong_otp_res = requests.post(f"{BASE_URL}/auth/verify-otp", json={"transactionId": tid, "userInputOtp": "000000"})
log("ERROR", "Invalid OTP Attempt", wrong_otp_res.json())
wait_or_skip()

# Correct OTP
M = requests.post(f"{BASE_URL}/auth/verify-otp", json={"transactionId": tid, "userInputOtp": "123456"})
tokens = M.json()
refreshToken = tokens.get("refreshToken")
accessToken = tokens.get("accessToken")
log("SUCCESS", "OTP Verified, Tokens Received", {"accessToken": accessToken, "refreshToken": refreshToken})
wait_or_skip()

# 2️⃣ Access Protected Endpoint
headers = {"Authorization": f"Bearer {accessToken}"}
getMe(headers=headers)
wait_or_skip()

# 3️⃣ Refresh Token
new_access_token_res = requests.post(f"{BASE_URL}/auth/refresh", json={"refreshToken": refreshToken})
if new_access_token_res.status_code == 200:
    accessToken = new_access_token_res.json().get("accessToken")
    headers["Authorization"] = f"Bearer {accessToken}"
    log("SUCCESS", "Access Token Refreshed", {"newAccessToken": accessToken})
else:
    log("ERROR", "Refresh Token Failed", new_access_token_res.json())
wait_or_skip()

# 4️⃣ JWT Expiry Test (Wait 10 sec)
log("INFO", "Waiting 10 seconds for token to expire...")
time.sleep(10)

expired_res = requests.get(f"{BASE_URL}/auth/me", headers=headers)
log("INFO", "Checking expired token response", {"statusCode": expired_res.status_code, "response": expired_res.json()})
wait_or_skip()

# 5️⃣ Wrong Refresh Token Test
wrong_refresh_res = requests.post(f"{BASE_URL}/auth/refresh", json={"refreshToken": "invalid_token"})
log("ERROR", "Invalid Refresh Token Attempt", {"statusCode": wrong_refresh_res.status_code, "response": wrong_refresh_res.json()})
wait_or_skip()

# 6️⃣ Sign Out Test
signout_res = requests.post(f"{BASE_URL}/auth/signOut", headers=headers)
log("SUCCESS" if signout_res.status_code == 200 else "ERROR", "User Signed Out", signout_res.json())
wait_or_skip()

# 7️⃣ Attempt to use expired token again
expired_res = requests.get(f"{BASE_URL}/auth/me", headers=headers)
log("INFO", "Checking token usage after signout", {"statusCode": expired_res.status_code, "response": expired_res.json()})
wait_or_skip()
