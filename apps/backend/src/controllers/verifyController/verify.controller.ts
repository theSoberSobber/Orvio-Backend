import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import * as jwt from 'jsonwebtoken';

@Controller('verify')
export class VerifyController {
  private readonly publicKey = process.env.JWT_SECRET || 'default-secret-key';

  @Get(':token')
  async verifyMessage(@Param('token') token: string, @Res() res: Response) {
    try {
      // Verify and decode the JWT token
      const decoded = jwt.verify(token, this.publicKey) as { message: string };
      const message = decoded.message;

      // HTML template with retro style
      const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Orvio Message Verification</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            background-color: #f5f5f5;
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            min-height: 100vh;
          }
          header {
            background-color: #fff;
            border-bottom: 1px solid #ddd;
            padding: 15px 0;
            text-align: center;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #0078d7;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            flex: 1;
          }
          .alert {
            background-color: #fff;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 20px;
            margin-bottom: 20px;
          }
          .warning {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
          }
          .warning-icon {
            color: #ff9800;
            font-size: 24px;
            margin-right: 10px;
          }
          .message-box {
            background-color: #f1f1f1;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 15px;
            margin-top: 10px;
            font-family: monospace;
            word-break: break-all;
          }
          .footer {
            background-color: #fff;
            border-top: 1px solid #ddd;
            padding: 15px 0;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
          .bold {
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <header>
          <div class="logo">ORVIO</div>
        </header>
        
        <div class="container">
          <div class="alert">
            <div class="warning">
              <span class="warning-icon">⚠️</span>
              <div>Message Verification</div>
            </div>
            
            <p>This is the original message sent by Orvio:</p>
            
            <div class="message-box">
              ${message}
            </div>
            
            <p>Please compare this with the message you received. If they do not match, the message may not be authentic.</p>
            <p class="bold">For security reasons, always verify important messages.</p>
          </div>
        </div>
        
        <div class="footer">
          © ${new Date().getFullYear()} Orvio. All rights reserved.
        </div>
      </body>
      </html>
      `;

      // Send the HTML response
      res.send(html);
    } catch (error) {
      // If token verification fails, show error page
      const errorHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verification Error</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            background-color: #f5f5f5;
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            min-height: 100vh;
          }
          header {
            background-color: #fff;
            border-bottom: 1px solid #ddd;
            padding: 15px 0;
            text-align: center;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #0078d7;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            flex: 1;
          }
          .alert {
            background-color: #fff;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 20px;
            margin-bottom: 20px;
          }
          .error {
            color: #d32f2f;
            font-weight: bold;
          }
          .footer {
            background-color: #fff;
            border-top: 1px solid #ddd;
            padding: 15px 0;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <header>
          <div class="logo">ORVIO</div>
        </header>
        
        <div class="container">
          <div class="alert">
            <h2 class="error">Verification Failed</h2>
            <p>The verification link is invalid or has expired.</p>
            <p>This message was not sent by Orvio or has been tampered with.</p>
          </div>
        </div>
        
        <div class="footer">
          © ${new Date().getFullYear()} Orvio. All rights reserved.
        </div>
      </body>
      </html>
      `;
      
      res.status(400).send(errorHtml);
    }
  }
} 