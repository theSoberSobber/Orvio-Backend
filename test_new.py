#!/usr/bin/env python3
import requests
import time
import json
import uuid
import hashlib
import random
import sys
from colorama import init, Fore, Style

# Initialize colorama for colored terminal output
init()

# Base URL for API
# BASE_URL = "http://localhost:3000"
BASE_URL = "https://backend-orvio.1110777.xyz"
# Global variables to store tokens and session data
access_token = None
refresh_token = None
user_id = None
session_id = None
api_key = None
phone_number = "9876543210"  # Test phone number
fcm_token = f"test_fcm_token_{uuid.uuid4()}"
service_tid = None

def print_step(step_number, description):
    """Print a formatted step header"""
    print(f"\n{Fore.BLUE}=== STEP {step_number}: {description} ==={Style.RESET_ALL}")

def print_response(response, label=None):
    """Print the API response with formatting"""
    if label:
        print(f"{Fore.CYAN}{label}:{Style.RESET_ALL}")
    
    print(f"{Fore.GREEN}Status Code: {response.status_code}{Style.RESET_ALL}")
    try:
        json_data = response.json()
        print(f"{Fore.YELLOW}Response Body:{Style.RESET_ALL} {json.dumps(json_data, indent=2)}")
        return json_data
    except:
        print(f"{Fore.YELLOW}Response Body:{Style.RESET_ALL} {response.text}")
        return None

def extract_jwt_payload(token):
    """Extract the payload from a JWT token without verification"""
    if not token:
        return None
    
    parts = token.split('.')
    if len(parts) != 3:
        return None
    
    payload_b64 = parts[1] + "=" * ((4 - len(parts[1]) % 4) % 4)  # Add padding
    try:
        import base64
        payload = json.loads(base64.b64decode(payload_b64).decode('utf-8'))
        return payload
    except:
        print(f"{Fore.RED}Failed to decode JWT payload.{Style.RESET_ALL}")
        return None

def test_auth_send_otp():
    """Test sending OTP for authentication"""
    print_step(1, "Send OTP for Authentication")
    
    data = {
        "phoneNumber": phone_number
    }
    
    response = requests.post(f"{BASE_URL}/auth/sendOtp", json=data)
    return print_response(response, "Send OTP Response")

def test_auth_verify_otp(transaction_id):
    """Test verifying OTP for authentication"""
    print_step(2, "Verify OTP for Authentication")
    
    global access_token, refresh_token, user_id, session_id
    
    data = {
        "transactionId": transaction_id,
        "userInputOtp": "123456"  # Hardcoded OTP from the code
    }
    
    response = requests.post(f"{BASE_URL}/auth/verifyOtp", json=data)
    response_data = print_response(response, "Verify OTP Response")
    
    if response.status_code == 201 and response_data:
        access_token = response_data.get('accessToken')
        refresh_token = response_data.get('refreshToken')
        
        # Extract user_id and session_id from JWT payload
        payload = extract_jwt_payload(access_token)
        if payload:
            user_id = payload.get('userId')
            session_id = payload.get('sessionId')
            print(f"{Fore.CYAN}Extracted from JWT:{Style.RESET_ALL} user_id={user_id}, session_id={session_id}")
    
    return response_data

def test_register_device():
    """Test registering a device"""
    print_step(3, "Register Device")
    
    global api_key
    
    data = {
        "phoneNumber": phone_number,  # Using phone number for device registration
        "fcmToken": fcm_token
    }
    
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    response = requests.post(f"{BASE_URL}/auth/register", json=data, headers=headers)
    response_data = print_response(response, "Register Device Response")
    
    if response.status_code == 201 and response_data:
        api_key = response_data.get('apiKey')
    
    return response_data

def test_get_user_profile():
    """Test getting user profile"""
    print_step(4, "Get User Profile")
    
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    return print_response(response, "User Profile Response")

def test_create_api_key():
    """Test creating a new API key"""
    print_step(5, "Create API Key")
    
    global api_key
    
    data = {
        "name": f"Test API Key {uuid.uuid4()}"
    }
    
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    response = requests.post(f"{BASE_URL}/auth/apiKey/createNew", json=data, headers=headers)
    response_data = print_response(response, "Create API Key Response")
    
    if response.status_code == 201:
        api_key = response_data  # The response is already the refresh token which is the API key
    
    return response_data

def test_get_api_keys():
    """Test getting all API keys for the user"""
    print_step(6, "Get All API Keys")
    
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    response = requests.get(f"{BASE_URL}/auth/apiKey/getAll", headers=headers)
    response_data = print_response(response, "Get API Keys Response")
    
    # If we don't have an API key yet, try to get it from the response
    global api_key
    if not api_key and response.status_code == 200 and response_data:
        for key in response_data:
            if key.get('session') and key['session'].get('refreshToken'):
                api_key = key['session']['refreshToken']
                break
    
    return response_data

def test_refresh_token():
    """Test refreshing the access token"""
    print_step(7, "Refresh Access Token")
    
    global access_token
    
    data = {
        "refreshToken": refresh_token
    }
    
    response = requests.post(f"{BASE_URL}/auth/refresh", json=data)
    response_data = print_response(response, "Refresh Token Response")
    
    if response.status_code in [200, 201] and response_data:
        access_token = response_data.get('accessToken')
    
    return response_data

def test_service_send_otp():
    """Test sending OTP via service"""
    print_step(8, "Send OTP via Service")
    
    global service_tid
    
    data = {
        "phoneNumber": phone_number
    }
    
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    response = requests.post(f"{BASE_URL}/service/sendOtp", json=data, headers=headers)
    response_data = print_response(response, "Service Send OTP Response")
    
    if response.status_code in [200, 201] and response_data:
        service_tid = response_data.get('tid')
    
    return response_data

def test_service_ack():
    """Test acknowledging OTP via service"""
    print_step(9, "Acknowledge OTP via Service")
    
    if not service_tid:
        print(f"{Fore.RED}No service_tid available. Run test_service_send_otp first.{Style.RESET_ALL}")
        return None
    
    data = {
        "tid": service_tid,
        "sessionId": session_id
    }
    
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    response = requests.post(f"{BASE_URL}/service/ack", json=data, headers=headers)
    return print_response(response, "Service Acknowledge Response")

def test_service_verify_otp():
    """Test verifying OTP via service"""
    print_step(10, "Verify OTP via Service")
    
    if not service_tid:
        print(f"{Fore.RED}No service_tid available. Run test_service_send_otp first.{Style.RESET_ALL}")
        return None
    
    data = {
        "tid": service_tid,
        "userInputOtp": "123456"  # Hardcoded OTP from the code
    }
    
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    response = requests.post(f"{BASE_URL}/service/verifyOtp", json=data, headers=headers)
    return print_response(response, "Service Verify OTP Response")

def test_revoke_api_key():
    """Test revoking an API key"""
    print_step(11, "Revoke API Key")
    
    if not api_key:
        print("No api_key available. Run test_create_api_key first.")
        return
    
    data = {
        "apiKey": api_key
    }
    
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    response = requests.post(f"{BASE_URL}/auth/apiKey/revoke", json=data, headers=headers)
    return print_response(response, "Revoke API Key Response")

def test_get_stats():
    """Test getting user stats"""
    print_step(12, "Get User Stats")
    
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    response = requests.get(f"{BASE_URL}/auth/stats", headers=headers)
    return print_response(response, "Get Stats Response")

def test_sign_out():
    """Test signing out"""
    print_step(13, "Sign Out")
    
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    response = requests.post(f"{BASE_URL}/auth/signOut", headers=headers)
    return print_response(response, "Sign Out Response")

def test_sign_out_all():
    """Test signing out from all sessions"""
    print_step(14, "Sign Out All")
    
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    response = requests.post(f"{BASE_URL}/auth/signOutAll", headers=headers)
    return print_response(response, "Sign Out All Response")

def main():
    """Main function to run all tests"""
    try:
        # Step 1: Send OTP
        send_otp_response = test_auth_send_otp()
        if not send_otp_response or 'transactionId' not in send_otp_response:
            print(f"{Fore.RED}Failed to get transaction ID{Style.RESET_ALL}")
            return
        
        # Step 2: Verify OTP
        verify_otp_response = test_auth_verify_otp(send_otp_response['transactionId'])
        if not verify_otp_response or not access_token:
            print(f"{Fore.RED}Failed to verify OTP{Style.RESET_ALL}")
            return
        
        # Step 3: Register Device
        test_register_device()
        
        # Step 4: Get User Profile
        test_get_user_profile()
        
        # Step 5: Create API Key
        test_create_api_key()
        
        # Step 6: Get All API Keys
        test_get_api_keys()
        
        # Step 7: Refresh Token
        test_refresh_token()
        
        # Step 8: Send OTP via Service
        test_service_send_otp()
        
        # Step 9: Acknowledge OTP via Service
        test_service_ack()
        
        # Step 10: Verify OTP via Service
        test_service_verify_otp()
        
        # Step 11: Revoke API Key
        test_revoke_api_key()
        
        # Step 12: Get User Stats
        test_get_stats()
        
        # Step 13: Sign Out
        test_sign_out()
        
        # Step 14: Sign Out All
        test_sign_out_all()
        
    except Exception as e:
        print(f"{Fore.RED}Error: {str(e)}{Style.RESET_ALL}")
        return

if __name__ == "__main__":
    main() 
