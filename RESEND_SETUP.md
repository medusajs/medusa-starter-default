# Resend Email Setup

## ✅ What Was Implemented

Your MedusaJS application now has Resend email integration following the [official Medusa documentation](https://docs.medusajs.com/resources/integrations/guides/resend).

### Changes Made:

1. **Installed Resend SDK**: `yarn add resend`
2. **Created Resend Provider**: `src/modules/resend/service.ts`
3. **Updated medusa-config.ts**: Added Resend notification provider
4. **Updated environment files**: Added Resend configuration examples

### How It Works:

- **Development**: By default, uses local provider (logs emails to console)
- **With Resend API Key**: Uses Resend to send actual emails

## 🚀 Setup Instructions

### Step 1: Create a Resend Account

1. Go to [https://resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your account

### Step 2: Get Your API Key

1. Navigate to [https://resend.com/api-keys](https://resend.com/api-keys)
2. Click **Create API Key**
3. Name it (e.g., "Medusa Development")
4. Copy the API key (starts with `re_`)

### Step 3: Configure Environment Variables

#### For Development (Optional)

If you want to send real emails in development, edit your `.env` file:

```bash
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=onboarding@resend.dev
```

**Important**: `onboarding@resend.dev` can only send emails to your Resend account's email address (the one you signed up with).

If you don't set these variables, emails will be logged to the console instead.

#### For Production

Edit your production environment variables:

```bash
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

**Important**: The domain in `RESEND_FROM_EMAIL` must be verified in Resend.

### Step 4: Verify Your Domain (Production Only)

1. Go to [https://resend.com/domains](https://resend.com/domains)
2. Click **Add Domain**
3. Enter your domain (e.g., `yourdomain.com`)
4. Add the DNS records provided by Resend:
   - TXT record for SPF
   - DKIM records
5. Click **Verify DNS Records**
6. Wait for verification (usually a few minutes)

### Step 5: Restart Your Application

```bash
# Development
npx medusa develop

# Production
npm run build
npm start
```

## 🔍 Testing

### Test in Development (Local Provider - Default)

Without setting `RESEND_API_KEY`:

```bash
npx medusa develop
```

When you send an invoice/offer, check your console for:
```
[Notification] Email sent to: customer@example.com
Subject: Invoice INV-2025-001
```

### Test in Development (Resend - Optional)

With `RESEND_API_KEY` and `RESEND_FROM_EMAIL=onboarding@resend.dev` set:

```bash
npx medusa develop
```

Check your Resend account email inbox for the emails.

### Test in Production

With production environment variables set:
```bash
SENDGRID_API_KEY=re_xxx npm run build && npm start
```

Check your Resend dashboard and recipient inbox.

## 📊 Monitoring

- View sent emails: [https://resend.com/emails](https://resend.com/emails)
- Check API usage: [https://resend.com/overview](https://resend.com/overview)
- Monitor delivery rates and bounces

## 💰 Pricing

**Resend Pricing:**
- Free tier: 3,000 emails/month
- $20/month: 50,000 emails
- $80/month: 100,000 emails

See full pricing: [https://resend.com/pricing](https://resend.com/pricing)

## 🐛 Troubleshooting

### Emails not sending?

1. **Check API key**: Ensure `RESEND_API_KEY` is set correctly and starts with `re_`
2. **Verify from address**: Must be from a verified domain (or onboarding@resend.dev)
3. **Check logs**: Look for errors in console or Resend dashboard
4. **Test address**: For onboarding@resend.dev, ensure you're sending to your Resend account email

### Development emails not appearing?

- By default, development uses local provider (logs to console)
- Set `RESEND_API_KEY` if you want real emails in development
- Remember: onboarding@resend.dev can only send to YOUR Resend account email

### Common Errors:

**"Invalid API key"**
- Ensure the key starts with `re_`
- Check for extra spaces or quotes
- Verify key is active in Resend dashboard

**"From address not allowed"**
- Use a verified domain for production
- For testing, use `onboarding@resend.dev` (only sends to your account email)
- Must verify domain in Resend for custom domains

**"Failed to send email"**
- Check Resend dashboard for error details
- Verify recipient email is valid
- Check spam folder

## 📚 Resources

- [Resend Documentation](https://resend.com/docs)
- [MedusaJS Resend Integration Guide](https://docs.medusajs.com/resources/integrations/guides/resend)
- [MedusaJS Notification Module](https://docs.medusajs.com/resources/infrastructure-modules/notification)

## ✨ Summary

**For Development (Recommended)**:
- ✅ No setup needed
- ✅ Uses local provider by default
- ✅ Emails logged to console

**For Production**:
1. ✅ Get Resend API key
2. ✅ Verify your domain in Resend
3. ✅ Set environment variables
4. ✅ Deploy and test

Your Resend email service is ready to use!

