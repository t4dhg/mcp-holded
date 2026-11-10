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

This project is an MCP server that talks to the Holded API v2 on behalf of whoever runs it. Holded is a live accounting system, so the following are in scope:

- Any tool action listed under "Operations that require confirmation" in the README executing without `confirm: true`, or a destructive API call reachable from a tool action that is not on that list. A structural test (`confirmation-coverage.test.ts`) is meant to make this impossible; a way around it is a vulnerability.
- `holded_request` sending a `POST`, `PUT`, `PATCH`, or `DELETE` without `confirm: true`, or accepting a path that escapes the configured API prefix
- Leaking the API key into logs, error messages, or tool responses
- Any way for a tool argument to reach a host other than the configured Holded base URL, including through a redirect
- Reading a file for upload without `confirm: true`, or overwriting an existing file through `output_path`

Out of scope:

- Vulnerabilities in the Holded API itself. Report those to Holded.
- The server acting on instructions from whoever controls the MCP client. The client is trusted by design; run this server only with a client and a Holded API key you control. The confirmation gate reduces accidents; it is not an authorization boundary.

## Supply chain

Releases are staged by CI through npm trusted publishing (OIDC, no long-lived token anywhere) and only become installable after a maintainer approves the exact staged artifact with 2FA. Provenance attestations are attached automatically. Verify a release with `npm view @t4dhg/mcp-holded dist.shasum` against the workflow log.

## Operational notes

- The API key grants whatever the Holded API grants it. Keep it in your MCP client's `env` block and never commit it. `.mcp.json` and `.env*` are git-ignored here. The server can start and list its tools without a key. It checks for the key before sending an API request.
- The server stores nothing and logs only to stderr, and only when `DEBUG=true`. The key is never logged.
