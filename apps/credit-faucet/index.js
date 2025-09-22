const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');
const { Pool } = require('pg');
const Redis = require('ioredis');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Database connection
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'postgres',
  port: process.env.POSTGRES_PORT || 5432,
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'postgres'
});

// Redis connection
const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT || 6379,
});

// Cashfree API credentials
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || 'test_app_id';
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY || 'test_secret_key';
const CASHFREE_API_URL = process.env.CASHFREE_API_URL || 'https://sandbox.cashfree.com/pg';

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', (req, res) => {
  res.render('index');
});

// Buy credits page
app.get('/buy-credits', (req, res) => {
  res.render('buy-credits');
});

// Redeem cashback points page
app.get('/redeem-cashback', (req, res) => {
  res.render('redeem-cashback');
});

// API to get user info
app.get('/api/user/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    
    const query = 'SELECT id, credits, "cashbackPoints", "creditMode" FROM "user" WHERE "phoneNumber" = $1';
    const result = await pool.query(query, [phoneNumber]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API to create payment order
app.post('/api/create-order', async (req, res) => {
  try {
    const { userId, phoneNumber, credits, amount } = req.body;
    
    // Check if user exists
    const userQuery = 'SELECT id, "phoneNumber" FROM "user" WHERE id = $1';
    const userResult = await pool.query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Create order in Cashfree
    const orderId = `ORDER_${Date.now()}_${userId.substr(0, 8)}`;
    const returnUrl = `${req.protocol}://${req.get('host')}/payment-callback?order_id=${orderId}&userId=${userId}&credits=${credits}`;
    
    const orderPayload = {
      order_id: orderId,
      order_amount: amount,
      order_currency: "INR",
      order_note: `Purchase of ${credits} credits`,
      customer_details: {
        customer_id: userId,
        customer_name: `User_${userId.substr(0, 8)}`,
        customer_email: "customer@example.com", // Required by Cashfree
        customer_phone: phoneNumber.replace('+', '')
      },
      order_meta: {
        return_url: returnUrl,
        notify_url: `${req.protocol}://${req.get('host')}/webhook/cashfree`
      }
    };
    
    const apiVersion = "2022-09-01";
    const response = await axios.post(`${CASHFREE_API_URL}/orders`, orderPayload, {
      headers: {
        'x-client-id': CASHFREE_APP_ID,
        'x-client-secret': CASHFREE_SECRET_KEY,
        'x-api-version': apiVersion,
        'Content-Type': 'application/json'
      }
    });
    
    // Store order details in Redis for callback verification
    await redis.set(`order:${orderId}`, JSON.stringify({
      userId,
      credits,
      amount,
      status: 'PENDING'
    }), 'EX', 3600); // Expire after 1 hour
    
    // Return the payment session ID to the frontend
    res.json({
      orderId,
      sessionId: response.data.payment_session_id,
      orderStatus: response.data.order_status
    });
  } catch (error) {
    console.error('Error creating order:', error.response?.data || error.message || error);
    res.status(500).json({ error: 'Failed to create payment order', details: error.response?.data || error.message });
  }
});

// Payment callback from Cashfree
app.get('/payment-callback', async (req, res) => {
  try {
    const { order_id, userId, credits } = req.query;
    
    // Verify the order status with Cashfree
    const response = await axios.get(`${CASHFREE_API_URL}/orders/${order_id}`, {
      headers: {
        'x-client-id': CASHFREE_APP_ID,
        'x-client-secret': CASHFREE_SECRET_KEY,
        'x-api-version': '2022-09-01'
      }
    });
    
    console.log('Order verification response:', response.data);
    
    if (response.data.order_status === 'PAID') {
      // Get order details from Redis
      const orderDetailsStr = await redis.get(`order:${order_id}`);
      let orderDetails;
      
      if (!orderDetailsStr) {
        console.error(`Order details not found for order ID: ${order_id}`);
        // If Redis data is missing, use query params as fallback
        orderDetails = { userId, credits, amount: '0.00', status: 'PENDING' };
      } else {
        orderDetails = JSON.parse(orderDetailsStr);
      }
      
      // Only update if the status is still PENDING
      if (orderDetails.status === 'PENDING') {
        // Update user credits
        const updateQuery = 'UPDATE "user" SET credits = credits + $1 WHERE id = $2';
        await pool.query(updateQuery, [parseInt(orderDetails.credits), orderDetails.userId]);
        
        // Update order status in Redis
        await redis.set(`order:${order_id}`, JSON.stringify({
          ...orderDetails,
          status: 'COMPLETED',
          verifiedAt: new Date().toISOString()
        }), 'EX', 86400); // Keep for 24 hours
      }
      
      return res.render('payment-success', {
        credits: orderDetails.credits,
        amount: response.data.order_amount
      });
    }
    
    res.render('payment-failed', { orderId: order_id });
  } catch (error) {
    console.error('Error processing payment callback:', error.response?.data || error.message || error);
    res.render('payment-failed', { orderId: req.query.order_id || 'Unknown' });
  }
});

// API to redeem cashback points
app.post('/api/redeem-cashback', async (req, res) => {
  try {
    const { userId, upiId, pointsToRedeem, transactionId, userInputOtp } = req.body;
    
    // Parse pointsToRedeem as a float to handle decimal values
    const pointsToRedeemNum = parseFloat(pointsToRedeem);
    
    // Check if user has enough cashback points
    const userQuery = 'SELECT "cashbackPoints", "phoneNumber" FROM "user" WHERE id = $1';
    const userResult = await pool.query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Parse cashbackPoints as a float to handle decimal values
    const cashbackPoints = parseFloat(userResult.rows[0].cashbackPoints);
    const phoneNumber = userResult.rows[0].phoneNumber;
    
    // Add back minimum points requirement (10 points)
    if (cashbackPoints < pointsToRedeemNum || pointsToRedeemNum < 10) {
      return res.status(400).json({ 
        error: 'Invalid redemption request',
        message: `You don't have enough cashback points or minimum 10 points required. You have ${cashbackPoints.toFixed(2)} points available.`
      });
    }
    
    // Verify OTP if provided
    if (!transactionId || !userInputOtp) {
      return res.status(400).json({
        error: 'OTP verification required',
        message: 'Please complete OTP verification before redeeming cashback points'
      });
    }
    
    // Verify OTP with the backend API
    try {
      const otpVerificationResponse = await axios.post('http://api-gateway:3000/auth/verifyOtp', {
        transactionId: transactionId,
        userInputOtp: userInputOtp
      });
      
      if (otpVerificationResponse.status !== 201) {
        return res.status(401).json({
          error: 'OTP verification failed',
          message: 'Invalid OTP. Please try again.'
        });
      }
    } catch (error) {
      console.error('OTP verification error:', error.response?.data || error.message);
      return res.status(401).json({
        error: 'OTP verification failed',
        message: error.response?.data?.message || 'Invalid OTP. Please try again.'
      });
    }
    
    // Redeem the points
    const updateQuery = 'UPDATE "user" SET "cashbackPoints" = "cashbackPoints" - $1 WHERE id = $2';
    await pool.query(updateQuery, [pointsToRedeemNum, userId]);
    
    // Convert points to INR (1 point = 0.3 INR)
    const amountInRupees = (pointsToRedeemNum * 0.3).toFixed(2);
    
    // Create beneficiary and initiate payout via Cashfree
    const beneficiaryId = `BENE_${Date.now()}_${userId.substr(0, 8)}`;
    
    // Add beneficiary
    const beneficiaryPayload = {
      beneId: beneficiaryId,
      name: `User_${userId.substr(0, 8)}`,
      email: 'user@example.com', // Placeholder email
      phone: phoneNumber.replace(/\+/, ''), // Remove + from phone number
      address1: 'User Address', // Placeholder address
      vpa: upiId,
      bankAccount: '', // Not required for UPI
      ifsc: ''  // Not required for UPI
    };
    
    await axios.post(`${CASHFREE_API_URL}/payout/addBeneficiary`, beneficiaryPayload, {
      headers: {
        'x-client-id': CASHFREE_APP_ID,
        'x-client-secret': CASHFREE_SECRET_KEY,
        'x-api-version': '2022-09-01',
        'Content-Type': 'application/json'
      }
    });
    
    // Request payout
    const payoutId = `PAYOUT_${Date.now()}_${userId.substr(0, 8)}`;
    const payoutPayload = {
      beneId: beneficiaryId,
      amount: amountInRupees,
      transferId: payoutId,
      transferMode: 'upi',
      remarks: `Cashback redemption for ${pointsToRedeemNum.toFixed(2)} points`
    };
    
    const payoutResponse = await axios.post(`${CASHFREE_API_URL}/payout/requestTransfer`, payoutPayload, {
      headers: {
        'x-client-id': CASHFREE_APP_ID,
        'x-client-secret': CASHFREE_SECRET_KEY,
        'x-api-version': '2022-09-01',
        'Content-Type': 'application/json'
      }
    });
    
    res.json({
      success: true,
      pointsRedeemed: pointsToRedeemNum,
      amountTransferred: amountInRupees,
      payoutId: payoutId,
      status: payoutResponse.data.status
    });
  } catch (error) {
    console.error('Error redeeming cashback:', error);
    res.status(500).json({ error: 'Failed to redeem cashback points' });
  }
});

// Webhook for Cashfree payment notifications
app.post('/webhook/cashfree', async (req, res) => {
  try {
    const event = req.body;
    console.log('Received webhook from Cashfree:', event);
    
    // Verify the webhook signature if provided
    // This is a simplified example - in production, you should verify the signature
    
    if (event.order && event.order.order_id && event.data && event.data.payment && event.data.payment.payment_status === 'SUCCESS') {
      const orderId = event.order.order_id;
      
      // Get order details from Redis
      const orderDetailsStr = await redis.get(`order:${orderId}`);
      if (!orderDetailsStr) {
        console.error(`Order details not found for order ID: ${orderId}`);
        return res.status(404).json({ error: 'Order not found' });
      }
      
      const orderDetails = JSON.parse(orderDetailsStr);
      
      // Only process if the order is still pending
      if (orderDetails.status === 'PENDING') {
        // Update user credits
        const updateQuery = 'UPDATE "user" SET credits = credits + $1 WHERE id = $2';
        await pool.query(updateQuery, [orderDetails.credits, orderDetails.userId]);
        
        // Update order status in Redis
        await redis.set(`order:${orderId}`, JSON.stringify({
          ...orderDetails,
          status: 'COMPLETED',
          paymentInfo: event.data.payment
        }), 'EX', 86400); // Keep for 24 hours
        
        console.log(`Credits added for order ${orderId}: ${orderDetails.credits} credits to user ${orderDetails.userId}`);
      } else {
        console.log(`Order ${orderId} already processed, current status: ${orderDetails.status}`);
      }
    }
    
    // Always return 200 OK to acknowledge receipt of the webhook
    res.status(200).json({ status: 'Webhook received' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    // Still return 200 to acknowledge receipt
    res.status(200).json({ status: 'Webhook received with errors' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Credit Faucet service running on port ${PORT}`);
});

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
}); 