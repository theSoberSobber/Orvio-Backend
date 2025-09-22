# Credit Faucet Service

A microservice for managing credits and cashback points for the Orvio Backend.

## Features

- **Buy Credits**: Allows users to purchase credits for Orvio OTP services
- **Redeem Cashback Points**: Enables users to redeem their cashback points to UPI

## Environment Variables

These variables should be set in the `.env` file:

```
# Cashfree API Credentials
CASHFREE_APP_ID=your_cashfree_app_id
CASHFREE_SECRET_KEY=your_cashfree_secret_key
CASHFREE_API_URL=https://sandbox.cashfree.com/pg  # Use production URL for production
```

## API Endpoints

### User Info
- `GET /api/user/:phoneNumber` - Get user information including credits and cashback points

### Credit Purchase
- `POST /api/create-order` - Create a payment order to buy credits

### Cashback Redemption
- `POST /api/redeem-cashback` - Redeem cashback points to UPI

## Pages

- `/` - Home page with options to buy credits or redeem cashback points
- `/buy-credits` - Purchase credits page
- `/redeem-cashback` - Redeem cashback points page
- `/payment-callback` - Callback page for payment completion

## Credits Exchange Rate

- Each credit costs ₹0.3
- Minimum 10 cashback points required for redemption
- Each cashback point is worth ₹0.3 when redeemed

## Integration with Backend

This service integrates with the main Orvio Backend by:
1. Reading user data from the PostgreSQL database
2. Updating credits and cashback points directly in the database
3. Using Redis for temporary storage of order information 