# Quick Start Guide

This guide will get your Cloudflare DDNS Worker up and running in 5 minutes.

## Prerequisites Checklist

- [ ] Cloudflare account with a domain
- [ ] Node.js installed
- [ ] DNS A records created in Cloudflare (e.g., `home.example.com`)

## Step 1: Install Dependencies

```bash
npm install -g wrangler
npm install
```

## Step 2: Get Your Cloudflare Credentials

1. **Zone ID**: Dashboard → Select your domain → Copy Zone ID from sidebar
2. **API Token**: Dashboard → My Profile → API Tokens → Create Token → "Edit zone DNS" template

## Step 3: Configure

Edit `wrangler.toml`:
```toml
[vars]
DNS_ENTRIES = "home.example.com,vpn.example.com"  # Your DNS records
ZONE_ID = "abc123..."  # Your Zone ID
```

## Step 4: Set Secrets

```bash
wrangler secret put CF_API_TOKEN      # Paste your API token
wrangler secret put DDNS_USERNAME     # Choose a username
wrangler secret put DDNS_PASSWORD     # Choose a password
```

## Step 5: Deploy

```bash
npm run deploy
```

You'll get a URL like: `https://cloudflare-dyndns-worker.your-account.workers.dev`

## Step 6: Configure Fritzbox

1. Internet → Permit Access → DynDNS
2. Enable DynDNS
3. Provider: **Custom**
4. Update URL: `https://your-worker-url.workers.dev?myip=<ipaddr>`
5. Domain: `home.example.com`
6. Username & Password: From Step 4

## Test It

```bash
curl -X POST -u "username:password" \
  "https://your-worker-url.workers.dev?myip=1.2.3.4"
```

Expected: `good 1.2.3.4`

## Verify

Check your DNS records in Cloudflare dashboard - they should now show the new IP!

## Troubleshooting

- **401 Unauthorized**: Check username/password
- **dnserr**: Verify API token permissions
- **911**: Check ZONE_ID and DNS_ENTRIES configuration
- **View logs**: `wrangler tail`

That's it! Your DDNS worker is now active. 🎉
