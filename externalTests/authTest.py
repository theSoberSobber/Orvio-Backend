import requests

# Constants
BASE_URL = "http://localhost:3000/auth"
PHONE_NUMBER = "1234567890"
CORRECT_OTP = "123456"

# Store tokens globally for testing
access_token = None
refresh_token = None

def print_response(response):
    """ Helper function to print response details. """
    print(f"Status Code: {response.status_code}")
    try:
        print(f"Response JSON: {response.json()}")
    except:
        print(f"Response Text: {response.text}")

def test_signup():
    """ Test user signup (OTP request). """
    url = f"{BASE_URL}/signup"
    payload = {"phoneNumber": PHONE_NUMBER}
    response = requests.post(url, json=payload)
    print("Signup Response:")
    print_response(response)
    assert response.status_code == 201, "Signup failed!"
    return response.json().get("transactionId")

def test_verify_otp(transaction_id):
    """ Test OTP verification (login). """
    global access_token, refresh_token
    url = f"{BASE_URL}/verify-otp"
    payload = {"transactionId": transaction_id, "userInputOtp": CORRECT_OTP}
    response = requests.post(url, json=payload)
    print("Verify OTP Response:")
    print_response(response)
    assert response.status_code == 201, "OTP verification failed!"
    
    data = response.json()
    access_token = data.get("accessToken")
    refresh_token = data.get("refreshToken")

def test_protected_route():
    """ Test accessing protected route with valid/invalid tokens. """
    global access_token
    url = f"{BASE_URL}/me"
    
    # Valid token
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.get(url, headers=headers)
    print("Protected Route (Valid Token) Response:")
    print_response(response)
    assert response.status_code == 200, "Protected route failed with valid token!"

    # Invalid token
    headers = {"Authorization": "Bearer invalid_token"}
    response = requests.get(url, headers=headers)
    print("Protected Route (Invalid Token) Response:")
    print_response(response)
    assert response.status_code == 401, "Invalid token should not be accepted!"

def test_refresh_token():
    """ Test refreshing access token. """
    global refresh_token, access_token
    url = f"{BASE_URL}/refresh"
    payload = {"refreshToken": refresh_token}
    response = requests.post(url, json=payload)
    print("Refresh Token Response:")
    print_response(response)
    
    assert response.status_code == 200, "Token refresh failed!"
    access_token = response.json().get("accessToken")

def test_invalid_refresh_token():
    """ Test refresh with an invalid token. """
    url = f"{BASE_URL}/refresh"
    payload = {"refreshToken": "invalid_refresh_token"}
    response = requests.post(url, json=payload)
    print("Invalid Refresh Token Response:")
    print_response(response)
    assert response.status_code == 403, "Invalid refresh token should be rejected!"

# Run tests in order
if __name__ == "__main__":
    transaction_id = test_signup()
    test_verify_otp(transaction_id)
    test_protected_route()
    test_refresh_token()
    test_invalid_refresh_token()
