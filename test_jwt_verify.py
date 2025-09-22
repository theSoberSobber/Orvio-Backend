#!/usr/bin/env python3
import requests
import json
import jwt
import sys

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

def verify_jwt(token, secret='your_jwt_secret'):
    try:
        # Verify the JWT token
        decoded = jwt.decode(token, secret, algorithms=['HS256'])
        print_success("JWT verification successful")
        print_info(f"Decoded payload: {json.dumps(decoded, indent=2)}")
        return decoded
    except Exception as e:
        print_error(f"JWT verification failed: {str(e)}")
        return None

def test_verification_endpoint(url):
    try:
        response = requests.get(url)
        if response.status_code == 200:
            print_success(f"Verification endpoint returned status code: {response.status_code}")
            print_info("HTML content preview (first 200 chars):")
            print(response.text[:200] + "...")
            return True
        else:
            print_error(f"Verification endpoint returned error: {response.status_code}")
            print(response.text)
            return False
    except Exception as e:
        print_error(f"Error accessing verification endpoint: {str(e)}")
        return False

def main():
    print_header("JWT VERIFICATION TEST")
    
    if len(sys.argv) < 2:
        print_error("Please provide the verification URL as an argument")
        print_info("Example: python test_jwt_verify.py http://localhost:3000/verify/your-token-here")
        return
    
    verification_url = sys.argv[1]
    print_info(f"Testing verification URL: {verification_url}")
    
    # Extract the token part from the URL
    parts = verification_url.split('/verify/')
    if len(parts) != 2:
        print_error("Invalid verification URL format. Expected format: http://host/verify/token")
        return
    
    token = parts[1]
    print_info(f"Extracted JWT token: {token[:20]}...")
    
    # Verify the JWT token
    payload = verify_jwt(token)
    if not payload:
        return
    
    # Test the verification endpoint
    print_header("TESTING VERIFICATION ENDPOINT")
    test_verification_endpoint(verification_url)
    
    print_header("TEST COMPLETED")

if __name__ == "__main__":
    main() 