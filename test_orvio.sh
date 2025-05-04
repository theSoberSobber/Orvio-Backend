#!/bin/bash

# Colors for better readability
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}Orvio Backend Test Runner${NC}"
echo -e "${BLUE}=======================================${NC}"

# Function to check if Docker is running
check_docker() {
  echo -e "${YELLOW}Checking if Docker is running...${NC}"
  if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Docker is not running! Please start Docker and try again.${NC}"
    exit 1
  fi
  echo -e "${GREEN}Docker is running!${NC}"
}

# Function to rebuild and restart the application
rebuild_app() {
  echo -e "${YELLOW}Rebuilding and restarting the application...${NC}"
  docker compose down -v
  docker compose up -d --build
  
  # Wait for application to start
  echo -e "${YELLOW}Waiting for application to start...${NC}"
  sleep 10
  echo -e "${GREEN}Application should be up now.${NC}"
}

# Function to show logs
show_logs() {
  echo -e "${YELLOW}Showing application logs...${NC}"
  docker compose logs -f api-gateway
}

# Function to run tests
run_tests() {
  echo -e "${YELLOW}Running tests...${NC}"
  python test_all_features.py
  test_result=$?
  
  if [ $test_result -eq 0 ]; then
    echo -e "${GREEN}Tests passed!${NC}"
  else
    echo -e "${RED}Tests failed!${NC}"
  fi
  
  return $test_result
}

# Function to stop the application
stop_app() {
  echo -e "${YELLOW}Stopping the application...${NC}"
  docker compose down
  echo -e "${GREEN}Application stopped.${NC}"
}

# Main script
case "$1" in
  build)
    check_docker
    rebuild_app
    ;;
  logs)
    check_docker
    show_logs
    ;;
  test)
    check_docker
    run_tests
    ;;
  all)
    check_docker
    rebuild_app
    run_tests
    test_result=$?
    show_logs
    exit $test_result
    ;;
  stop)
    check_docker
    stop_app
    ;;
  *)
    echo -e "${YELLOW}Usage: $0 {build|logs|test|all|stop}${NC}"
    echo -e "  build - Rebuild and restart the application"
    echo -e "  logs  - Show application logs"
    echo -e "  test  - Run tests"
    echo -e "  all   - Rebuild, test, and show logs"
    echo -e "  stop  - Stop the application"
    exit 1
    ;;
esac

exit 0 