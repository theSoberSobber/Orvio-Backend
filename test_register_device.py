#!/usr/bin/env python3
import requests
import json
import time

# Base URL for our API
BASE_URL = "http://localhost:3000"

# Test phone number
PHONE_NUMBER = "+1234567890"
FCM_TOKEN = "test_fcm_token_123"

# ANSI colors for console output
GREEN = "\033[92m"
RED = "\033[91m"
BLUE = "\033[94m"
YELLOW = "\033[93m"
RESET = "\033[0m"

def print_header(text):
    print(f"\n{BLUE}{'=' * 50}")
    print(f"    {text}")
    print(f"{'=' * 50}{RESET}\n")

def print_success(text):
    print(f"{GREEN}✓ {text}{RESET}")

def print_error(text):
    print(f"{RED}✗ {text}{RESET}")

def print_info(text):
    print(f"{YELLOW}ℹ {text}{RESET}")

def test_send_otp():
    print_header("Step 1: Sending OTP")
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/sendOtp",
            json={"phoneNumber": PHONE_NUMBER},
            headers={"Content-Type": "application/json"}
        )
        
        data = response.json()
        print_info(f"Response: {json.dumps(data, indent=2)}")
        
        if (response.status_code == 200 or response.status_code == 201) and "transactionId" in data:
            print_success(f"Successfully received transaction ID (Status: {response.status_code})")
            return data["transactionId"]
        else:
            print_error(f"Failed to get transaction ID. Status code: {response.status_code}")
            return None
    except Exception as e:
        print_error(f"Error sending OTP: {str(e)}")
        return None

def test_verify_otp(transaction_id, otp_code="123456"):
    print_header("Step 2: Verifying OTP")
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/verifyOtp",
            json={"transactionId": transaction_id, "userInputOtp": otp_code},
            headers={"Content-Type": "application/json"}
        )
        
        try:
            data = response.json()
            print_info(f"Response: {json.dumps(data, indent=2)}")
            
            if response.status_code == 201:
                if "accessToken" in data and "refreshToken" in data:
                    print_success("Successfully verified OTP and received tokens")
                    return data
                else:
                    print_error("Missing tokens in response")
            else:
                print_error(f"Failed to verify OTP. Status code: {response.status_code}")
        except json.JSONDecodeError:
            print_error(f"Invalid JSON response: {response.text}")
        
        return None
    except Exception as e:
        print_error(f"Error verifying OTP: {str(e)}")
        return None

def test_register_device(tokens):
    print_header("Step 3: Registering Device")
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/register",
            json={"phoneNumber": PHONE_NUMBER, "fcmToken": FCM_TOKEN},
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {tokens['accessToken']}"
            }
        )
        
        try:
            data = response.json()
            print_info(f"Response: {json.dumps(data, indent=2)}")
            
            if response.status_code == 201 or response.status_code == 200:
                print_success("Successfully registered device")
                return True
            else:
                print_error(f"Failed to register device. Status code: {response.status_code}")
        except json.JSONDecodeError:
            print_error(f"Invalid JSON response: {response.text}")
        
        return False
    except Exception as e:
        print_error(f"Error registering device: {str(e)}")
        return False

def test_otp_after_device_registration():
    print_header("Step 4: Testing OTP After Device Registration")
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/sendOtp",
            json={"phoneNumber": PHONE_NUMBER},
            headers={"Content-Type": "application/json"}
        )
        
        data = response.json()
        print_info(f"Response: {json.dumps(data, indent=2)}")
        
        if (response.status_code == 200 or response.status_code == 201) and "transactionId" in data:
            print_success(f"Successfully received transaction ID (Status: {response.status_code})")
            print_info("Check server logs to see if bootstrap mode is bypassed")
            return data["transactionId"]
        else:
            print_error(f"Failed to get transaction ID. Status code: {response.status_code}")
            return None
    except Exception as e:
        print_error(f"Error sending OTP: {str(e)}")
        return None

def run_test():
    print_header("DEVICE REGISTRATION AND OTP TEST")
    
    # Step 1: Send OTP
    transaction_id = test_send_otp()
    if not transaction_id:
        return
    
    # Step 2: Wait a moment to ensure processing
    print_info("Waiting 2 seconds...")
    time.sleep(2)
    
    # Step 3: Verify with bootstrap OTP
    tokens = test_verify_otp(transaction_id)
    if not tokens:
        return
    
    # Step 4: Register device
    if not test_register_device(tokens):
        return
    
    # Step 5: Wait a moment to ensure processing
    print_info("Waiting 2 seconds...")
    time.sleep(2)
    
    # Step 6: Test OTP after device registration
    test_otp_after_device_registration()
    
    print_header("TEST COMPLETED")

if __name__ == "__main__":
    run_test() 