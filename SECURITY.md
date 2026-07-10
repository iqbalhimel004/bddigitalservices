# Security Guide — BD Digital Services

## DDoS & Infrastructure Protection

The application code includes rate limiting at the API level, but for production deployments we strongly recommend placing the site behind **Cloudflare's free tier** as an additional infrastructure-level shield:

1. Add your domain to Cloudflare (free plan is sufficient).
2. Point your Hostinger DNS nameservers to Cloudflare's nameservers.
3. Enable "Under Attack Mode" if you experience a DDoS event.
4. Turn on the Cloudflare Web Application Firewall (WAF) — the free tier provides basic rules.

This gives you: DDoS mitigation, IP reputation filtering, SSL termination, and global CDN caching with zero extra cost.

## Revoking Admin Sessions & Rotating Credentials

Admin sessions are stored **server-side in the database** (`admin_sessions` table) as random opaque IDs delivered via an httpOnly cookie — there is no signing secret. If you suspect compromise:

1. **Invalidate all active sessions:** delete every row in the `admin_sessions` table (`DELETE FROM admin_sessions;`) or restart after rotating credentials. All admins must log in again.
2. **Rotate the admin password:** generate a new bcrypt hash and update the `ADMIN_PASSWORD_HASH` environment variable:
   ```bash
   node -e "const b=require('bcryptjs'); console.log(b.hashSync('new-password', 12))"
   ```
3. Also rotate `ADMIN_USERNAME` if credentials may have been exposed, then restart the API server.

## Visitor IP Anonymization

Visitor analytics never store raw IP addresses — IPs are hashed with SHA-256 using the `IP_HASH_SALT` environment variable. Set it to a random 64-character hex string and keep it out of version control. Rotating it resets unique-visitor de-duplication but does not affect any other functionality.

## Hostinger Firewall Recommendations

- Block all inbound traffic except ports 80 (HTTP) and 443 (HTTPS).
- Restrict SSH access (port 22) to your own IP addresses only.
- Enable Hostinger's built-in DDoS protection if available on your plan.

## Reporting a Vulnerability

If you discover a security vulnerability, please do **not** open a public GitHub issue. Instead:

1. Email the maintainer directly with a description of the issue, steps to reproduce, and potential impact.
2. Allow reasonable time (up to 14 days) for a fix before any public disclosure.
3. We will acknowledge receipt within 48 hours and keep you updated on the fix timeline.
