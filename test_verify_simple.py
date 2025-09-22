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

def test_sendOtp():
    print_header("Testing Send OTP with Verification URL")
    
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

def run_test():
    print_header("VERIFICATION URL TEST")
    
    # Step 1: Send OTP
    transaction_id = test_sendOtp()
    if not transaction_id:
        return
    
    print_info("Now check the server logs for the verification URL")
    print_info("Look for a line containing: [createVerificationUrl] Created verification URL:")
    print_info("Open that URL in your browser to see the verification page")
    
    print_header("TEST COMPLETED")

if __name__ == "__main__":
    run_test() 