# Security Policy

## Supported versions

Security fixes are released for the latest published version of `@t4dhg/mcp-holded`. Older versions are not patched; please upgrade before reporting.

## Reporting a vulnerability

Please report vulnerabilities privately through [GitHub Security Advisories](https://github.com/t4dhg/mcp-holded/security/advisories/new). That opens a private thread and lets the fix and the advisory be published together.

If you cannot use GitHub Security Advisories, open a regular issue that says only that you have a security report and asks for a private channel. Do not include details in a public issue.

Useful things to include:

- The affected file and line, and the version or commit you looked at
- What an attacker can do, and what they need in order to do it
- A minimal reproduction, if you have one

What to expect:

- Acknowledgement within a few days
- An assessment of the report, including where we disagree and why
- Coordination with you on disclosure timing, and credit by name in the advisory and changelog unless you prefer otherwise

## Scope

This project is an MCP server that talks to the Holded API v2 on behalf of whoever runs it. The following are in scope:

- `holded_request` sending a DELETE or PUT without the `confirm: true` its schema requires
- Leaking the API key into logs, error messages, or tool responses
- Any way for a tool argument to reach a host other than the configured Holded base URL

Out of scope:

- Vulnerabilities in the Holded API itself. Report those to Holded.
- The server acting on instructions from whoever controls the MCP client. The client is trusted by design; run this server only with a client and a Holded API key you control.

## Operational notes

- The API key grants whatever the Holded API grants it. Scope it to the least you need, keep it in `.env` or your MCP client's `env` block, and never commit it.
- `holded_request` can reach every write endpoint Holded exposes. Deletes and overwrites are real and irreversible; the confirmation step reduces accidents, it is not an authorization boundary.
