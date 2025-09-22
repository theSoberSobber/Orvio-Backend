#!/usr/bin/env python3
import requests
import time
import json
import uuid
import base64
import sys
from colorama import init, Fore, Style

# Initialize colorama for colored terminal output
init()

# Base URL for API
BASE_URL = "http://localhost:3000"

# Global variables to store tokens and session data
access_token = None
refresh_token = None
user_id = None
session_id = None
phone_number = "9876543210"  # Test phone number
fcm_token = f"test_fcm_token_{uuid.uuid4()}"
service_tid = None

def print_step(step_number, description):
    """Print a formatted step header"""
    print(f"\n{Fore.BLUE}=== STEP {step_number}: {description} ==={Style.RESET_ALL}")

def print_response(response, description):
    """Print a formatted response"""
    print(f"{Fore.YELLOW}{description}:{Style.RESET_ALL}")
    print(f"Status Code: {response.status_code}")
    try:
        response_data = response.json()
        print(f"Response Body: {json.dumps(response_data, indent=2)}")
        return response_data
    except:
        print(f"Response Body: {response.text}")
        return None

def extract_jwt_payload(token):
    """Extract payload from JWT token"""
    try:
        # JWT is in format header.payload.signature
        payload = token.split('.')[1]
        # Add padding if needed
        payload += '=' * (-len(payload) % 4)
        # Decode base64 and parse JSON
        return json.loads(base64.b64decode(payload).decode('utf-8'))
    except Exception as e:
        print(f"Error extracting JWT payload: {e}")
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
    
    data = {
        "phoneNumber": phone_number,
        "fcmToken": fcm_token
    }
    
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    response = requests.post(f"{BASE_URL}/auth/register", json=data, headers=headers)
    return print_response(response, "Register Device Response")

def test_get_credits():
    """Test getting user's credit balance"""
    print_step(4, "Get Credit Balance")
    
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    response = requests.get(f"{BASE_URL}/service/credits", headers=headers)
    return print_response(response, "Credit Balance Response")

def test_get_credit_mode():
    """Test getting user's credit mode"""
    print_step(5, "Get Credit Mode")
    
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    response = requests.get(f"{BASE_URL}/service/creditMode", headers=headers)
    return print_response(response, "Credit Mode Response")

def test_set_credit_mode(mode):
    """Test setting user's credit mode"""
    print_step(6, f"Set Credit Mode to {mode}")
    
    data = {
        "mode": mode
    }
    
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    response = requests.patch(f"{BASE_URL}/service/creditMode", json=data, headers=headers)
    return print_response(response, "Set Credit Mode Response")

def test_service_send_otp(otpExpiry=None, webhook=None, webhookSecret=None):
    """Test sending OTP via service (uses credits)"""
    print_step(7, "Send OTP via Service (Uses Credits)")
    
    global service_tid
    
    data = {
        "phoneNumber": phone_number
    }
    
    # Build parameter info string
    param_info = []
    
    # Add otpExpiry if provided
    if otpExpiry is not None:
        data["otpExpiry"] = otpExpiry
        param_info.append(f"custom OTP expiry: {otpExpiry} seconds")
    
    # Add webhook if provided
    if webhook is not None:
        data["reportingCustomerWebhook"] = webhook
        param_info.append(f"webhook URL: {webhook}")
    
    # Add webhook secret if provided
    if webhookSecret is not None:
        data["reportingCustomerWebhookSecret"] = webhookSecret
        param_info.append("webhook secret provided")
    
    # Print parameter info if any parameters were set
    if param_info:
        print(f"{Fore.CYAN}Using parameters: {', '.join(param_info)}{Style.RESET_ALL}")
    
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
    print_step(8, "Acknowledge OTP via Service")
    
    if not service_tid:
        print(f"{Fore.RED}No service_tid available. Run test_service_send_otp first.{Style.RESET_ALL}")
        return None
    
    data = {
        "tid": service_tid
    }
    
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    response = requests.post(f"{BASE_URL}/service/ack", json=data, headers=headers)
    return print_response(response, "Service Acknowledge Response")

def test_get_auth_stats():
    """Test getting auth stats (includes credit info)"""
    print_step(9, "Get Auth Stats")
    
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    response = requests.get(f"{BASE_URL}/auth/stats", headers=headers)
    return print_response(response, "Auth Stats Response")

def test_insufficient_credits():
    """Test sending OTP with insufficient credits"""
    print_step(15, "Testing insufficient credits error")
    
    # First, set a very low credit value manually (for testing)
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    # Try to send multiple OTPs to use up credits
    while True:
        # Get current credits
        response = requests.get(f"{BASE_URL}/service/credits", headers=headers)
        credit_data = response.json()
        current_credits = credit_data.get('credits', 0)
        
        print(f"{Fore.CYAN}Current credits: {current_credits}{Style.RESET_ALL}")
        
        if current_credits <= 0:
            break
            
        # Send OTP (use up a credit)
        data = {
            "phoneNumber": phone_number
        }
        requests.post(f"{BASE_URL}/service/sendOtp", json=data, headers=headers)
    
    # Try one more time - should get 402 Payment Required
    data = {
        "phoneNumber": phone_number
    }
    
    response = requests.post(f"{BASE_URL}/service/sendOtp", json=data, headers=headers)
    response_data = print_response(response, "Insufficient Credits Response")
    
    # Check status code
    if response.status_code == 402:
        print(f"{Fore.GREEN}Successfully received 402 Payment Required status for insufficient credits{Style.RESET_ALL}")
    else:
        print(f"{Fore.RED}Expected 402 Payment Required status, got {response.status_code}{Style.RESET_ALL}")
    
    return response_data

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
        
        # Step 4: Get Credit Balance
        test_get_credits()
        
        # Step 5: Get Credit Mode
        test_get_credit_mode()
        
        # Step 6: Set Credit Mode to STRICT
        test_set_credit_mode("strict")
        
        # Step 7: Send OTP via Service (using credits) with custom expiry
        test_service_send_otp(otpExpiry=180)  # 3 minutes expiry
        
        # Wait a moment to let the system process
        print(f"{Fore.CYAN}Waiting 1 second...{Style.RESET_ALL}")
        time.sleep(1)
        
        # Step 8: Get Credit Balance Again
        test_get_credits()
        
        # Step 9: Acknowledge OTP 
        test_service_ack()
        
        # Wait for verification check
        print(f"{Fore.CYAN}Waiting 2 seconds...{Style.RESET_ALL}")
        time.sleep(2)
        
        # Step 10: Get Credit Balance Once More
        test_get_credits()
        
        # Step 11: Set Credit Mode to DIRECT
        test_set_credit_mode("direct")
        
        # Step 12: Send OTP via Service with webhook parameters
        test_webhook_url = "http://example.com/webhook"
        test_webhook_secret = "test_secret_123"
        test_service_send_otp(
            webhook=test_webhook_url,
            webhookSecret=test_webhook_secret
        )
        
        # Step 13: Get Credit Balance Again
        test_get_credits()
        
        # Step 14: Get Auth Stats (includes credit info)
        test_get_auth_stats()
        
        # Step 15: Test insufficient credits handling
        test_insufficient_credits()
        
    except Exception as e:
        print(f"{Fore.RED}Error: {str(e)}{Style.RESET_ALL}")
        return

if __name__ == "__main__":
    main() 