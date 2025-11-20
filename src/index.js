/**
 * Cloudflare Worker for handling Dynamic DNS updates from Fritzbox
 * 
 * This worker receives DDNS update requests from a Fritzbox router
 * and updates multiple DNS A records in Cloudflare.
 */

export default {
  async fetch(request, env, ctx) {
    // Only accept POST requests
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // Parse the URL to get query parameters
    const url = new URL(request.url);
    const hostname = url.searchParams.get('hostname');
    const myip = url.searchParams.get('myip');

    // Check Basic Authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !isValidAuth(authHeader, env)) {
      return new Response('Unauthorized', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="DDNS Update"'
        }
      });
    }

    // Validate input parameters
    if (!myip) {
      return new Response('badparam', { status: 400 });
    }

    // Validate IP address format
    if (!isValidIPv4(myip)) {
      return new Response('badparam - Invalid IP address', { status: 400 });
    }

    // Get configuration
    const zoneId = env.ZONE_ID;
    const apiToken = env.CF_API_TOKEN;
    const dnsEntries = env.DNS_ENTRIES ? env.DNS_ENTRIES.split(',').map(e => e.trim()) : [];

    if (!zoneId || !apiToken) {
      console.error('Missing ZONE_ID or CF_API_TOKEN configuration');
      return new Response('911', { status: 500 });
    }

    if (dnsEntries.length === 0) {
      console.error('No DNS entries configured');
      return new Response('911', { status: 500 });
    }

    try {
      // Update all configured DNS entries
      const updatePromises = dnsEntries.map(dnsName => 
        updateDNSRecord(zoneId, dnsName, myip, apiToken)
      );

      const results = await Promise.allSettled(updatePromises);
      
      // Check if all updates succeeded
      const allSucceeded = results.every(r => r.status === 'fulfilled');
      
      if (allSucceeded) {
        console.log(`Successfully updated ${dnsEntries.length} DNS records to ${myip}`);
        return new Response('good ' + myip, { status: 200 });
      } else {
        const failures = results.filter(r => r.status === 'rejected');
        console.error(`Failed to update ${failures.length} DNS records:`, failures);
        return new Response('dnserr', { status: 500 });
      }
    } catch (error) {
      console.error('Error updating DNS records:', error);
      return new Response('dnserr', { status: 500 });
    }
  }
};

/**
 * Validate Basic Authentication credentials
 */
function isValidAuth(authHeader, env) {
  const expectedUsername = env.DDNS_USERNAME;
  const expectedPassword = env.DDNS_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    console.error('DDNS_USERNAME or DDNS_PASSWORD not configured');
    return false;
  }

  try {
    // Parse Basic Auth header
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = atob(base64Credentials);
    const [username, password] = credentials.split(':');

    return username === expectedUsername && password === expectedPassword;
  } catch (error) {
    console.error('Error parsing auth header:', error);
    return false;
  }
}

/**
 * Validate IPv4 address format
 */
function isValidIPv4(ip) {
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = ip.match(ipv4Regex);
  
  if (!match) return false;
  
  // Check each octet is 0-255
  for (let i = 1; i <= 4; i++) {
    const octet = parseInt(match[i], 10);
    if (octet < 0 || octet > 255) return false;
  }
  
  return true;
}

/**
 * Update a DNS A record in Cloudflare
 */
async function updateDNSRecord(zoneId, dnsName, ipAddress, apiToken) {
  const baseUrl = 'https://api.cloudflare.com/client/v4';
  
  // First, get the DNS record ID
  const listUrl = `${baseUrl}/zones/${zoneId}/dns_records?type=A&name=${encodeURIComponent(dnsName)}`;
  
  const listResponse = await fetch(listUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!listResponse.ok) {
    const errorText = await listResponse.text();
    throw new Error(`Failed to list DNS records: ${listResponse.status} - ${errorText}`);
  }

  const listData = await listResponse.json();
  
  if (!listData.success || !listData.result || listData.result.length === 0) {
    throw new Error(`DNS record not found: ${dnsName}`);
  }

  const recordId = listData.result[0].id;
  const currentIp = listData.result[0].content;

  // Check if IP is already up to date
  if (currentIp === ipAddress) {
    console.log(`DNS record ${dnsName} already has IP ${ipAddress}, skipping update`);
    return { updated: false, dnsName, ipAddress };
  }

  // Update the DNS record
  const updateUrl = `${baseUrl}/zones/${zoneId}/dns_records/${recordId}`;
  
  const updateResponse = await fetch(updateUrl, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      content: ipAddress
    })
  });

  if (!updateResponse.ok) {
    const errorText = await updateResponse.text();
    throw new Error(`Failed to update DNS record: ${updateResponse.status} - ${errorText}`);
  }

  const updateData = await updateResponse.json();
  
  if (!updateData.success) {
    throw new Error(`DNS update failed: ${JSON.stringify(updateData.errors)}`);
  }

  console.log(`Updated DNS record ${dnsName} from ${currentIp} to ${ipAddress}`);
  return { updated: true, dnsName, ipAddress, oldIp: currentIp };
}
