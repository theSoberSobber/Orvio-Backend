import requests
import json

BASE_URL = "http://localhost:3000"

def getMe(headers):
    res = requests.get(f"{BASE_URL}/auth/me", headers=headers).json()
    print(json.dumps(res, indent=2))

L = requests.post(f"{BASE_URL}/auth/signup", json={"phoneNumber": "+919770483089"})
tid = L.json()["transactionId"]
print("Transaction Id: ", tid)

M = requests.post(f"{BASE_URL}/auth/verify-otp", json={"transactionId": tid ,"userInputOtp": "123456"})
refreshToken = M.json()["refreshToken"]
accessToken = M.json()["accessToken"]

print("Refresh Token: ", refreshToken)
print("Access Token: ", accessToken)

headers = {
    "Authorization": f"Bearer {accessToken}"
}

accessToken = requests.post(f"{BASE_URL}/auth/refresh", json={"refreshToken": refreshToken}).json()["accessToken"]

getMe(headers=headers)

N = requests.post(f"{BASE_URL}/auth/register", json={"deviceHash": "test_device_hash" ,"fcmToken": "test_device_token"}, headers=headers)

getMe(headers=headers)

# O = requests.post(f"{BASE_URL}/auth/signOut", headers=headers)

# getMe(headers=headers)

# P = requests.post(f"{BASE_URL}/auth/signOutAll", headers=headers)

# getMe(headers=headers) # valid for another 10 mins till the JWT Lasts

# # TODO: FIX THIS BEFORE WORKING ON THE APP!!! 
# # OTHERWISE API INTERCEPTOR WON'T WORK!!!
# # should not be able to
# # but why is it 500!!!!
# # it should be 403!!! (forbidden)
# # and otherwise 401 (unauthorized)

# N = requests.post(f"{BASE_URL}/auth/register", json={"deviceHash": "test_device_hash" ,"fcmToken": "test_device_token"}, headers=headers)

# print(N.text)