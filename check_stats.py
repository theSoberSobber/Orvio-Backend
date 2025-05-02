import requests
import json

# Use the access token from the test_ack.py output
access_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI5MDJkYjJmOS1kMjJmLTQyNjktODAzZi0wNTdiZmJhNGE1NDQiLCJpYXRDdXN0b20iOiIxNzQ2MTkwNjE0NDk1Iiwic2Vzc2lvbklkIjoiMDI2MDQ2OTktMGNhYi00YmM5LThjNTctZmIwZGFiNDc4ODhjIiwiaWF0IjoxNzQ2MTkwNjE0LCJleHAiOjE3NDYxOTEyMTR9.uEoLKnzgZxPm3bYfe7A7uNyCnBPSdqmQrwkfTKiDjpY"

# Make the request to the stats endpoint
response = requests.get(
    "http://localhost:3000/auth/stats",
    headers={"Authorization": f"Bearer {access_token}"}
)

# Print the status code and response
print(f"Status Code: {response.status_code}")
try:
    data = response.json()
    print("Response Body:")
    print(json.dumps(data, indent=2))
    
    # Check if our new metrics are present
    if response.status_code == 200:
        device_metrics = data.get("provider", {}).get("currentDevice", {})
        print("\nMetrics we're looking for:")
        print(f"messageSentSuccessfully: {device_metrics.get('messageSentSuccessfully', 'Not found')}")
        print(f"messageTried: {device_metrics.get('messageTried', 'Not found')}")
except:
    print("Response Body:")
    print(response.text) 