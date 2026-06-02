# Safety & Responsible Use

This document outlines the safety architecture, ethical constraints, and mitigation strategies implemented in **Qwen Chat Gateway**.

## Safety Principles

Our focus is to make Qwen's capabilities more accessible to developers in a responsible, transparent manner. We explicitly avoid "stealth" bot behaviors, scrapers, bypasses, or bulk-automation strategies.

```
       +---------------------------------------------+
       |             Qwen Chat Gateway               |
       +---------------------------------------------+
              |                               |
    [Allowed Controls]                [Blocked Behaviors]
     - Visible Browser (Default)       - CAPTCHA / Bot Bypass
     - Concurrency = 1                 - Stealth Spoofing
     - Minimum Interval Wait           - Account Rotation
     - Manual Login Once               - Cookie Extraction
     - Challenge Auto-stop             - Hidden API Scraping
```

---

## 1. Allowed Controls

### Visible Browser by Default
- The gateway opens a visible browser window (`headless: false` by default).
- You can watch every action the browser performs. It is transparent and easy to inspect.

### Persistent User Session
- Uses your local browser profile. You only need to log in manually once.
- The gateway does *not* intercept or store your password, cookies, or secret tokens.

### Max Concurrency = 1
- Requests are handled through a strict FIFO single-threaded queue.
- There are no concurrent browser pages or parallel sessions.

### Minimum Interval Delay
- Enforces a mandatory idle delay between consecutive executions.
- Simulates human pacing and prevents abusive polling behavior.

### Challenge Auto-Stop
- If Qwen Web displays a CAPTCHA, authentication, rate limit, or unusual activity challenge, the gateway halts immediately.
- It does *not* attempt to solve CAPTCHAs, bypass Cloudflare, or retry aggressively.

---

## 2. Prohibited Behaviors (Anti-Abuse)

We explicitly do **not** implement:
- **Stealth Plugins / Fingerprint Spoofing**: We do not disguise Playwright as a generic human browser to bypass anti-bot mechanisms.
- **CAPTCHA Bypass Libraries**: No integration with solvers or OCR bypasses.
- **Hidden API Scraping**: We do not scrape backend API endpoints; we only navigate the web UI as a user would.
- **Proxy/Account Rotation**: We do not support running across multiple accounts or proxies to bypass usage restrictions.
- **Cookie/Token Extraction**: The gateway does not export your cookies to external scripts.

---

## 3. Redacted Logs

To ensure your private credentials do not leak through logs or console history, `redact.ts` sanitizes outputs containing:
- Cookie strings
- Authorization headers
- API keys / tokens
- Custom passwords/secrets
