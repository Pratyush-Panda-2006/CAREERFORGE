# 🔒 Security Policy

PRISMA LABS takes the security of our application, infrastructure, and open-source ecosystem seriously. We appreciate the efforts of security researchers and contributors who help maintain a safe environment for everyone.

---

## 1. Automated Security Guardrails & Infrastructure

To protect our core platform and contributors, our repository enforces automated security mechanisms:

- 🛡️ **CodeQL SAST Scanning** ([`.github/workflows/codeql.yml`](.github/workflows/codeql.yml)): Performs continuous Static Application Security Testing (SAST) for JavaScript & TypeScript vulnerabilities on all pull requests and pushes to `main`.
- 🔒 **PR Scope Protection & Syntax Checks** ([`.github/workflows/pr-guardrails.yml`](.github/workflows/pr-guardrails.yml)): Automatically blocks Pull Requests from modifying core platform code outside `public/showcase/` and rejects unsafe code patterns (`eval()`, `document.cookie`, unencrypted HTTP script sources).

---

## 2. Supported Versions

We actively support and release security updates for the following versions:

| Version / Branch | Supported | Security Patch Status |
|---|---|---|
| `main` (Latest) | ✅ Yes | Actively Monitored & Patched |
| `< 1.0.0` | ❌ No | Deprecated |

---

## 3. Reporting a Vulnerability

**Please do NOT report security vulnerabilities through public GitHub issues.**

If you believe you have discovered a security vulnerability in PRISMA LABS or any of our showcase projects, please report it responsibly to our security response team:

📧 **Security Response Email**: `security@prismalabs.io`

### Please include the following details in your report:
1. **Description**: Clear description of the vulnerability and its potential impact.
2. **Steps to Reproduce**: Detailed steps, proof-of-concept (PoC) scripts, or screenshots.
3. **Affected Component**: Specify affected file, route, or showcase project directory.
4. **Suggested Fix**: Optional recommendation for mitigating the issue.

---

## 4. Response Timelines & Disclosure Policy

- ⏱️ **Acknowledgment**: We will acknowledge receipt of your vulnerability report within **24 hours**.
- 🔍 **Triage & Validation**: Our security team will investigate and validate the report within **48 hours**.
- 🛠️ **Remediation**: Validated security vulnerabilities will be patched within **7 business days**.
- 📢 **Coordinated Disclosure**: We request that reporters refrain from public disclosure until an official security advisory and patch have been released.

Thank you for helping keep PRISMA LABS and our open-source community secure!
