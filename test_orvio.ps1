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

function Show-Help {
    Write-Host "Usage: .\test_orvio.ps1 [command]"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  help        Show this help message"
    Write-Host "  build       Rebuild and restart the application"
    Write-Host "  stop        Stop all containers"
    Write-Host "  start       Start all containers"
    Write-Host "  logs        Show logs"
    Write-Host "  test        Run tests"
    Write-Host "  update-db   Update database schema"
    Write-Host ""
}

function Rebuild-App {
    Write-Host "Rebuilding and restarting the application..."
    docker compose down -v
    docker compose up -d --build
}

function Stop-App {
    Write-Host "Stopping all containers..."
    docker compose down
}

function Start-App {
    Write-Host "Starting all containers..."
    docker compose up -d
}

function Show-Logs {
    Write-Host "Showing logs..."
    docker compose logs -f
}

function Run-Tests {
    Write-Host "Running tests..."
    python test_all_features.py
}

function Update-Database {
    Write-Host "Updating database schema..."
    # Wait for PostgreSQL to be ready
    Write-Host "Waiting for PostgreSQL to be ready..."
    $isReady = $false
    $maxAttempts = 30
    $attempt = 0
    
    while (-not $isReady -and $attempt -lt $maxAttempts) {
        $attempt++
        try {
            $result = docker exec postgres pg_isready -U postgres
            if ($result -like "*accepting connections*") {
                $isReady = $true
                Write-Host "PostgreSQL is ready."
            }
            else {
                Write-Host "PostgreSQL not ready yet. Waiting... (Attempt $attempt/$maxAttempts)"
                Start-Sleep -Seconds 2
            }
        }
        catch {
            Write-Host "Error checking PostgreSQL status. Waiting... (Attempt $attempt/$maxAttempts)"
            Start-Sleep -Seconds 2
        }
    }
    
    if (-not $isReady) {
        Write-Host "PostgreSQL did not become ready in time. Exiting."
        return
    }
    
    # Apply the database update script
    Write-Host "Applying database updates..."
    Get-Content -Path "./apps/credit-faucet/update_db.sql" | docker exec -i postgres psql -U postgres
    
    Write-Host "Database update completed."
}

if ($args.Count -eq 0) {
    Show-Help
    return
}

switch ($args[0].ToLower()) {
    "help" {
        Show-Help
    }
    "build" {
        Rebuild-App
    }
    "stop" {
        Stop-App
    }
    "start" {
        Start-App
    }
    "logs" {
        Show-Logs
    }
    "test" {
        Run-Tests
    }
    "update-db" {
        Update-Database
    }
    default {
        Write-Host "Unknown command: $($args[0])"
        Show-Help
    }
}

exit 0 