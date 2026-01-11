# MDJ Practice Manager - API Integration Guide

## Overview

This guide will help you configure external API integrations to unlock the full functionality of MDJ Practice Manager.

## 🤖 OpenAI Integration (MDJ Assist)

### What it enables:
- Intelligent AI assistant for practice management
- Natural language queries about your data
- Smart recommendations and insights
- Automated task prioritization

### Setup Steps:

1. **Get API Key:**
   - Visit: https://platform.openai.com/api-keys
   - Sign in or create an account
   - Click "Create new secret key"
   - Copy the key (starts with `sk-`)

2. **Configure in MDJ:**
   - Add to `.env` file: `OPENAI_API_KEY=${OPENAI_API_KEY}
   - Or run: `./setup-integrations.sh`

3. **Test Integration:**
   - Open MDJ Practice Manager
   - Click the MDJ Assist button (floating button)
   - Try asking: "Show me my active clients"

### Usage Examples:
```
"Which clients have overdue tasks?"
"What's my total annual revenue?"
"Show me upcoming compliance deadlines"
"Create a summary of this week's priorities"
```

## 🏢 Companies House Integration

### What it enables:
- Import UK company data automatically
- Sync director and shareholder information
- Auto-generate compliance deadlines
- Keep company information up-to-date

### Setup Steps:

1. **Get API Key:**
   - Visit: https://developer.company-information.service.gov.uk/
   - Register for an account
   - Create an application
   - Copy your API key

2. **Configure in MDJ:**
   - Add to `.env` file: `COMPANIES_HOUSE_API_KEY=your-key-here`
   - Or run: `./setup-integrations.sh`

3. **Test Integration:**
   - Go to Companies House section
   - Search for a UK company
   - Import company data

### Features Available:
- Company search by name or number
- Import company details and structure
- Sync directors and shareholders
- Automatic compliance calendar creation
- Regular data synchronization

## 🔒 Security Configuration

### JWT Secret:
- Automatically generated during setup
- Used for secure authentication
- Should be unique and kept secret

### Environment Variables:
```bash
# Required
NODE_ENV=development
DATA_DIR=./mdj-data
JWT_SECRET=your-generated-secret

# API Integrations
OPENAI_API_KEY=${OPENAI_API_KEY}
COMPANIES_HOUSE_API_KEY=your-ch-key

# Optional
HMRC_API_KEY=your-hmrc-key
SENTRY_DSN=your-sentry-dsn
```

## 🚀 Quick Setup

Run the interactive setup script:
```bash
./setup-integrations.sh
```

This will guide you through configuring all integrations.

## 🧪 Testing Your Setup

### Test OpenAI Integration:
1. Open MDJ Practice Manager
2. Click MDJ Assist (floating button)
3. Ask: "What can you help me with?"
4. Should get an AI-powered response

### Test Companies House Integration:
1. Go to Companies House section
2. Search for "Tesco PLC" or company number "00445790"
3. Should see company details
4. Try importing the company

## 🔧 Troubleshooting

### OpenAI Issues:
- **Invalid API Key**: Check key format (starts with `sk-`)
- **Rate Limits**: OpenAI has usage limits
- **Billing**: Ensure your OpenAI account has billing set up

### Companies House Issues:
- **Invalid API Key**: Verify key from developer portal
- **Rate Limits**: 600 requests per 5 minutes
- **Company Not Found**: Try different search terms

### General Issues:
- **Environment Variables**: Restart application after changes
- **Network**: Check internet connection
- **Logs**: Check browser console for error messages

## 📊 Usage Monitoring

### OpenAI Usage:
- Monitor at: https://platform.openai.com/usage
- Set up billing alerts
- Track API costs

### Companies House Usage:
- Free tier: 600 requests per 5 minutes
- Monitor usage in developer portal
- No billing required for basic usage

## 🔄 Updating Configuration

### Adding New Keys:
1. Update `.env` file
2. Restart the application
3. Test the integration

### Rotating Keys:
1. Generate new key from provider
2. Update `.env` file
3. Restart application
4. Verify functionality

## 🎯 Best Practices

### Security:
- Never commit API keys to version control
- Use environment variables for all secrets
- Rotate keys regularly
- Monitor usage for unusual activity

### Performance:
- Cache API responses when possible
- Implement rate limiting
- Handle API errors gracefully
- Use offline fallbacks

### Cost Management:
- Monitor API usage regularly
- Set up billing alerts
- Implement usage limits
- Cache expensive operations

## 📞 Support

### OpenAI Support:
- Documentation: https://platform.openai.com/docs
- Community: https://community.openai.com/
- Status: https://status.openai.com/

### Companies House Support:
- Documentation: https://developer.company-information.service.gov.uk/api/docs/
- Support: https://find-and-update.company-information.service.gov.uk/help/contact-us

### MDJ Practice Manager:
- Check logs in browser console
- Review configuration in `.env` file
- Test with demo data first