# CloudflareDynDNSWorker

A Cloudflare Worker that handles Dynamic DNS (DDNS) update requests from a Fritzbox router and automatically updates multiple DNS A records in Cloudflare.

## Features

- ✅ Handles DDNS POST requests from Fritzbox routers
- ✅ Updates multiple DNS A records simultaneously
- ✅ Basic authentication for security
- ✅ Validates IP addresses before updating
- ✅ Skips updates if IP hasn't changed
- ✅ Compatible with DynDNS2 update protocol

## Prerequisites

- A Cloudflare account with a domain/zone
- Node.js and npm installed (for development)
- Wrangler CLI installed (`npm install -g wrangler`)
- A Fritzbox router or compatible DDNS client

## Setup

### 1. Clone the Repository

```bash
git clone https://github.com/flxwly/CloudflareDynDNSWorker.git
cd CloudflareDynDNSWorker
npm install
```

### 2. Configure DNS Records in Cloudflare

Create the DNS A records you want to update in your Cloudflare zone. For example:
- `home.example.com`
- `vpn.example.com`

### 3. Get Cloudflare API Token

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Use the "Edit zone DNS" template
4. Select your specific zone
5. Copy the generated token

### 4. Get Cloudflare Zone ID

1. Go to your domain overview in Cloudflare dashboard
2. Scroll down to find your Zone ID in the right sidebar
3. Copy the Zone ID

### 5. Configure the Worker

Edit `wrangler.toml` and set your variables:

```toml
[vars]
DNS_ENTRIES = "home.example.com,vpn.example.com"
ZONE_ID = "your-zone-id-here"
```

### 6. Set Secrets

Set the required secrets using Wrangler:

```bash
# Cloudflare API token
wrangler secret put CF_API_TOKEN

# DDNS authentication credentials (used by Fritzbox)
wrangler secret put DDNS_USERNAME
wrangler secret put DDNS_PASSWORD
```

### 7. Deploy the Worker

```bash
npm run deploy
```

After deployment, you'll get a worker URL like: `https://cloudflare-dyndns-worker.your-account.workers.dev`

## Fritzbox Configuration

### Configure DynDNS in Fritzbox

1. Log in to your Fritzbox web interface
2. Go to **Internet** → **Permit Access** → **DynDNS**
3. Enable DynDNS
4. Select "Custom" as the DynDNS provider
5. Configure the following settings:

   - **Update URL**: `https://cloudflare-dyndns-worker.your-account.workers.dev?myip=<ipaddr>`
   - **Domain Name**: `home.example.com` (one of your DNS entries)
   - **Username**: The username you set with `DDNS_USERNAME`
   - **Password**: The password you set with `DDNS_PASSWORD`

6. Click "Apply"

The Fritzbox will now automatically send updates to your Cloudflare Worker whenever your IP address changes.

## How It Works

1. Fritzbox detects an IP address change
2. Fritzbox sends a POST request to the worker with the new IP
3. Worker validates the Basic Authentication credentials
4. Worker validates the IP address format
5. Worker updates all configured DNS A records in Cloudflare
6. Worker responds with success or error status

### Response Codes

The worker follows the DynDNS2 protocol response format:

- `good <IP>` - Update successful
- `badparam` - Invalid parameters
- `badauth` - Authentication failed (401)
- `dnserr` - DNS update failed
- `911` - Server configuration error

## Development

### Local Development

```bash
npm run dev
```

This starts a local development server where you can test the worker.

### Testing

You can test the worker using curl:

```bash
curl -X POST \
  -u "your-username:your-password" \
  "https://cloudflare-dyndns-worker.your-account.workers.dev?myip=1.2.3.4"
```

Expected response: `good 1.2.3.4`

## Security

- The worker uses Basic Authentication to protect against unauthorized updates
- Store your credentials as secrets (never commit them to the repository)
- The API token should have minimal permissions (only DNS edit for the specific zone)
- Consider using Cloudflare Access for additional security layers

## Configuration Reference

### Environment Variables (wrangler.toml)

| Variable | Description | Example |
|----------|-------------|---------|
| `DNS_ENTRIES` | Comma-separated list of DNS records to update | `home.example.com,vpn.example.com` |
| `ZONE_ID` | Cloudflare Zone ID | `abc123...` |

### Secrets (set via wrangler secret put)

| Secret | Description |
|--------|-------------|
| `CF_API_TOKEN` | Cloudflare API token with DNS edit permissions |
| `DDNS_USERNAME` | Username for Fritzbox authentication |
| `DDNS_PASSWORD` | Password for Fritzbox authentication |

## Troubleshooting

### Worker returns 401 Unauthorized
- Check that DDNS_USERNAME and DDNS_PASSWORD are correctly set
- Verify credentials in Fritzbox configuration

### Worker returns "dnserr"
- Verify CF_API_TOKEN has correct permissions
- Check that DNS records exist in Cloudflare
- Check worker logs: `wrangler tail`

### Worker returns "911"
- Check that ZONE_ID, CF_API_TOKEN, and DNS_ENTRIES are configured
- Verify secrets are properly set

### DNS not updating
- Check Fritzbox logs for DDNS update status
- View worker logs: `wrangler tail`
- Verify DNS record names match exactly (case-sensitive)

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.