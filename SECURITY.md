# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Automagent, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, email security concerns to the maintainers. Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We aim to acknowledge reports within 48 hours and provide a fix within 7 days for critical issues.

## Supported Versions

| Package | Version | Supported |
|---------|---------|-----------|
| `@automagent/schema` | 0.2.x | Yes |
| `automagent` (CLI) | 0.3.x | Yes |

## Security Practices

- Credentials stored with `0o600` file permissions
- HTTPS enforced for hub communication by default
- PKCE used in OAuth login flow
- No secrets embedded in published packages
