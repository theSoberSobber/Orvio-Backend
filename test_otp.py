#!/usr/bin/env python3
import requests
import json
import time

# Base URL for our API
BASE_URL = "http://localhost:3000"

# Test phone number
PHONE_NUMBER = "+1234567890"

# ANSI colors for console output
GREEN = "\033[92m"
RED = "\033[91m"
BLUE = "\033[94m"
YELLOW = "\033[93m"
RESET = "\033[0m"

access_token = None

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
    print_header("Testing Send OTP Endpoint")
    
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
    global access_token
    print_header(f"Testing Verify OTP Endpoint with OTP: {otp_code}")
    
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
                    access_token = data["accessToken"]
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

def test_service_send_otp():
    print_header("Testing /service/sendOtp Endpoint with orgName")
    try:
        payload = {
            "phoneNumber": PHONE_NUMBER,
            "orgName": "Test Organization"
        }
        response = requests.post(
            f"{BASE_URL}/service/sendOtp",
            json=payload,
            headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
        )
        data = response.json()
        print_info(f"Response: {json.dumps(data, indent=2)}")
        if (response.status_code == 200 or response.status_code == 201) and "tid" in data:
            print_success(f"Successfully received TID (Status: {response.status_code})")
            return data["tid"]
        else:
            print_error(f"Failed to get TID. Status code: {response.status_code}")
            return None
    except Exception as e:
        print_error(f"Error sending service OTP: {str(e)}")
        return None

def run_test():
    print_header("OTP SERVICE TEST")
    
    # Step 1: Send OTP
    transaction_id = test_send_otp()
    if not transaction_id:
        return
    
    # Step 2: Wait a moment to ensure processing
    print_info("Waiting 2 seconds...")
    time.sleep(2)
    
    # Step 3: Verify with bootstrap OTP
    tokens = test_verify_otp(transaction_id)
    
    if tokens:
        print_header("TEST SUCCESSFUL!")
    else:
        print_header("TEST FAILED!")
    
    # Step 4: Service check with orgName
    test_service_send_otp()

if __name__ == "__main__":
    run_test() 