#!/usr/bin/env python3
import requests
import json
import time
import webbrowser

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
    print_header("1. Sending OTP Request")
    
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

def register_device(access_token):
    print_header("2. Registering Device")
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/register",
            json={"phoneNumber": PHONE_NUMBER, "fcmToken": FCM_TOKEN},
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access_token}"
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

def test_verification_flow():
    print_header("3. Testing OTP With Verification URL")
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/sendOtp",
            json={"phoneNumber": PHONE_NUMBER},
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code != 201 and response.status_code != 200:
            print_error(f"Failed to send OTP. Status code: {response.status_code}")
            return None
        
        data = response.json()
        transaction_id = data["transactionId"]
        print_success(f"OTP sent with transaction ID: {transaction_id}")
        
        # Check device logs for verification URL
        print_info("Checking logs for verification URL...")
        time.sleep(2)
        
        log_response = requests.get(
            f"{BASE_URL}/service/logs", 
            params={"transactionId": transaction_id}
        )
        
        if log_response.status_code != 200:
            print_error("Couldn't fetch logs to extract verification URL")
            print_info("You'll need to check the server logs manually for the verification URL")
            return None
        
        logs = log_response.json()
        
        # Try to extract verification URL from logs
        verification_url = None
        for log in logs:
            if "verificationUrl" in log:
                verification_url = log["verificationUrl"]
                break
                
        if verification_url:
            print_success(f"Found verification URL: {verification_url}")
            print_info("Opening verification URL in browser...")
            webbrowser.open(verification_url)
            return verification_url
        else:
            print_error("Verification URL not found in logs")
            print_info("Check server logs manually for the verification URL")
            return None
        
    except Exception as e:
        print_error(f"Error in verification flow: {str(e)}")
        return None

def run_test():
    print_header("VERIFICATION URL TEST")
    
    # Test the verification flow
    verification_url = test_verification_flow()
    
    # If verification_url is None, we couldn't automatically extract it
    if not verification_url:
        print_info("Since we couldn't extract the verification URL automatically, here's what to do:")
        print_info("1. Check the server logs for a line containing '[createVerificationUrl]'")
        print_info("2. Look for the URL after 'Created verification URL:'")
        print_info("3. Open that URL in your browser to see the verification page")
    
    print_header("TEST COMPLETED")

if __name__ == "__main__":
    run_test() 