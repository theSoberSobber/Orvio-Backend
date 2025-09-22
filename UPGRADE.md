# Upgrade Guide: Adding Credit Faucet to Existing Deployment

This guide details the steps to safely upgrade your existing Orvio Backend deployment to include the new Credit Faucet service and cashback points functionality.

## 1. Database Schema Update

The new version adds a `cashbackPoints` column to the `user` table. Before deploying the new code, you need to update your database schema:

```bash
# SSH into your server
ssh user@your-server

# Navigate to your project directory
cd path/to/orvio-backend

# Pull the latest code
git pull

# Add the new column to the database without destroying existing data
docker exec -i postgres psql -U postgres -d postgres -c "ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS \"cashbackPoints\" integer DEFAULT 0;"

# Verify the column was added
docker exec -i postgres psql -U postgres -d postgres -c "SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'cashbackPoints';"
```

## 2. Update Environment Variables

Update your `.env` file to include the Cashfree API credentials:

```bash
# Add these lines to your .env file
CASHFREE_APP_ID=your_cashfree_app_id
CASHFREE_SECRET_KEY=your_cashfree_secret_key
CASHFREE_API_URL=https://api.cashfree.com/pg  # Use sandbox URL for testing
```

## 3. Rebuild and Restart

Now that your database and environment variables are set up, you can rebuild and restart the application:

```bash
# Option 1: Using the provided script
./test_orvio.sh build  # Linux/macOS
.\test_orvio.ps1 build  # Windows

# Option 2: Manual commands
docker compose down  # Don't use -v flag to preserve data
docker compose up -d --build
```

## 4. Verify the Upgrade

Make sure everything is working correctly:

```bash
# Check container status
docker ps

# Check logs for any errors
docker compose logs api-gateway
docker compose logs credit-faucet

# Run tests to verify functionality
./test_orvio.sh test  # Linux/macOS
.\test_orvio.ps1 test  # Windows
```

## 5. Access the Credit Faucet UI

The Credit Faucet UI is now available at:

- http://your-server:3001/

Users can purchase credits and redeem cashback points through this interface.

## Troubleshooting

### Issue: Container fails to start
Check the logs for specific errors:
```bash
docker compose logs credit-faucet
```

### Issue: Database column not added correctly
You can manually run the SQL script:
```bash
cat ./apps/credit-faucet/update_db.sql | docker exec -i postgres psql -U postgres
```

### Issue: Cannot connect to Cashfree API
Make sure your environment variables are set correctly in `.env` and that the service can access the internet.

## Rollback Plan

If you encounter serious issues and need to rollback:

```bash
# Stop all containers
docker compose down

# Checkout the previous version
git checkout previous_tag_or_commit

# Start the previous version
docker compose up -d
``` 