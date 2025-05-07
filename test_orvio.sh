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

# Function to show help
show_help() {
  echo -e "Usage: $0 [command]"
  echo -e ""
  echo -e "Commands:"
  echo -e "  help        Show this help message"
  echo -e "  build       Rebuild and restart the application"
  echo -e "  stop        Stop all containers"
  echo -e "  start       Start all containers"
  echo -e "  logs        Show logs"
  echo -e "  test        Run tests"
  echo -e "  update-db   Update database schema"
  echo -e ""
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

# Function to start containers
start_app() {
  echo -e "${YELLOW}Starting all containers...${NC}"
  docker compose up -d
  echo -e "${GREEN}Containers started.${NC}"
}

# Function to show logs
show_logs() {
  echo -e "${YELLOW}Showing application logs...${NC}"
  docker compose logs -f
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

# Function to update the database schema
update_database() {
  echo -e "${YELLOW}Updating database schema...${NC}"
  
  # Wait for PostgreSQL to be ready
  echo -e "${YELLOW}Waiting for PostgreSQL to be ready...${NC}"
  MAX_ATTEMPTS=30
  ATTEMPT=0
  
  while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT+1))
    
    if docker exec postgres pg_isready -U postgres | grep -q "accepting connections"; then
      echo -e "${GREEN}PostgreSQL is ready.${NC}"
      break
    else
      echo -e "${YELLOW}PostgreSQL not ready yet. Waiting... (Attempt $ATTEMPT/$MAX_ATTEMPTS)${NC}"
      sleep 2
    fi
    
    if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
      echo -e "${RED}PostgreSQL did not become ready in time. Exiting.${NC}"
      return 1
    fi
  done
  
  # Apply the database update script
  echo -e "${YELLOW}Applying database updates...${NC}"
  cat ./apps/credit-faucet/update_db.sql | docker exec -i postgres psql -U postgres
  
  echo -e "${GREEN}Database update completed.${NC}"
}

# Main script
if [ -z "$1" ]; then
  show_help
  exit 0
fi

case "$1" in
  help)
    show_help
    ;;
  build)
    check_docker
    rebuild_app
    ;;
  start)
    check_docker
    start_app
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
  update-db)
    check_docker
    update_database
    ;;
  *)
    echo -e "${RED}Unknown command: $1${NC}"
    show_help
    exit 1
    ;;
esac

exit 0 