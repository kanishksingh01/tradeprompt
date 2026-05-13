# Security Policy

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Email **kanishk2607@gmail.com** with:
- A description of the vulnerability
- Steps to reproduce
- Potential impact

You'll receive an acknowledgement within 48 hours.

## Automated Checks

Every push and pull request runs:

| Check | Tool | Threshold |
|---|---|---|
| Dependency CVEs | `npm audit` | High/Critical = fail |
| Static analysis | GitHub CodeQL | Security + Quality queries |
| Secret scanning | TruffleHog | Verified secrets = fail |
| Performance | Lighthouse CI | LCP < 4s, CLS < 0.1 |
| Bundle size | Custom shell | No single chunk > 500 kB |
| Type safety | `tsc --noEmit` | Zero errors |
