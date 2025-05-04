# PowerShell script for running Orvio Backend tests

# Colors for better readability
$Green = [ConsoleColor]::Green
$Blue = [ConsoleColor]::Blue 
$Red = [ConsoleColor]::Red
$Yellow = [ConsoleColor]::Yellow

function Write-ColorMessage {
    param (
        [string]$Message,
        [ConsoleColor]$Color
    )
    Write-Host $Message -ForegroundColor $Color
}

Write-Host "=======================================" -ForegroundColor $Blue
Write-Host "Orvio Backend Test Runner" -ForegroundColor $Blue
Write-Host "=======================================" -ForegroundColor $Blue

# Function to check if Docker is running
function Check-Docker {
    Write-ColorMessage "Checking if Docker is running..." $Yellow
    try {
        docker info | Out-Null
        Write-ColorMessage "Docker is running!" $Green
        return $true
    } catch {
        Write-ColorMessage "Docker is not running! Please start Docker and try again." $Red
        return $false
    }
}

# Function to rebuild and restart the application
function Rebuild-App {
    Write-ColorMessage "Rebuilding and restarting the application..." $Yellow
    docker compose down -v
    docker compose up -d --build
    
    # Wait for application to start
    Write-ColorMessage "Waiting for application to start..." $Yellow
    Start-Sleep -Seconds 10
    Write-ColorMessage "Application should be up now." $Green
}

# Function to show logs
function Show-Logs {
    Write-ColorMessage "Showing application logs..." $Yellow
    docker compose logs -f api-gateway
}

# Function to run tests
function Run-Tests {
    Write-ColorMessage "Running tests..." $Yellow
    python test_all_features.py
    $testResult = $LASTEXITCODE
    
    if ($testResult -eq 0) {
        Write-ColorMessage "Tests passed!" $Green
    } else {
        Write-ColorMessage "Tests failed!" $Red
    }
    
    return $testResult
}

# Function to stop the application
function Stop-App {
    Write-ColorMessage "Stopping the application..." $Yellow
    docker compose down
    Write-ColorMessage "Application stopped." $Green
}

# Main script
$action = $args[0]

if (-not (Check-Docker)) {
    exit 1
}

switch ($action) {
    "build" {
        Rebuild-App
        break
    }
    "logs" {
        Show-Logs
        break
    }
    "test" {
        Run-Tests
        break
    }
    "all" {
        Rebuild-App
        $testResult = Run-Tests
        Show-Logs
        exit $testResult
    }
    "stop" {
        Stop-App
        break
    }
    default {
        Write-ColorMessage "Usage: .\test_orvio.ps1 {build|logs|test|all|stop}" $Yellow
        Write-Host "  build - Rebuild and restart the application"
        Write-Host "  logs  - Show application logs"
        Write-Host "  test  - Run tests"
        Write-Host "  all   - Rebuild, test, and show logs"
        Write-Host "  stop  - Stop the application"
        exit 1
    }
}

exit 0 