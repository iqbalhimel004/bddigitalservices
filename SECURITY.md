# Security Guide — BD Digital Services

## DDoS & Infrastructure Protection

The application code includes rate limiting at the API level, but for production deployments we strongly recommend placing the site behind **Cloudflare's free tier** as an additional infrastructure-level shield:

1. Add your domain to Cloudflare (free plan is sufficient).
2. Point your Hostinger DNS nameservers to Cloudflare's nameservers.
3. Enable "Under Attack Mode" if you experience a DDoS event.
4. Turn on the Cloudflare Web Application Firewall (WAF) — the free tier provides basic rules.

This gives you: DDoS mitigation, IP reputation filtering, SSL termination, and global CDN caching with zero extra cost.

## Changing the Admin Secret

The `ADMIN_SECRET` environment variable signs all admin session tokens. Rotate it if you suspect compromise:

1. In your hosting environment (Replit Secrets / Hostinger environment vars), update `ADMIN_SECRET` to a new random string (at least 32 characters).
2. Restart the API server.
3. All existing admin tokens will be immediately invalidated — log in again to get a new token.

Also rotate `ADMIN_USERNAME` and `ADMIN_PASSWORD` if credentials may have been exposed.

## Hostinger Firewall Recommendations

- Block all inbound traffic except ports 80 (HTTP) and 443 (HTTPS).
- Restrict SSH access (port 22) to your own IP addresses only.
- Enable Hostinger's built-in DDoS protection if available on your plan.

## Reporting a Vulnerability

If you discover a security vulnerability, please do **not** open a public GitHub issue. Instead:

1. Email the maintainer directly with a description of the issue, steps to reproduce, and potential impact.
2. Allow reasonable time (up to 14 days) for a fix before any public disclosure.
3. We will acknowledge receipt within 48 hours and keep you updated on the fix timeline.
