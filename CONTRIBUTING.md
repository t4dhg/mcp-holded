# Contributing

## Development

```bash
npm install
npm run lint
npm run typecheck
npm run format:check
npm test
npm run build
HOLDED_API_KEY=pat_..._... npm run smoke
```

Husky runs lint-staged on commit. CI runs the same checks on Node 18, 20, 22 and 24.

## API-first rule

Never build or change a schema from documentation alone. Fetch real records with GET, compare the keys against the schema, and save an anonymised fixture under `src/__tests__/fixtures` (replace names, emails, tax ids, addresses, bank details and amounts; keep the field set and the types). The schema test parses every fixture and fails on any fixture without a schema entry.

Use GET only when exploring. Do not POST, PUT or DELETE against a production account.

## Adding an action

1. Add the API function in `src/api/<domain>.ts`. Anything that calls `deleteOne`, `put` or `patch`, or one of the destructive POST helpers listed in `confirmation-coverage.test.ts`, is treated as destructive.
2. Add a policy in `src/write-safety.ts`. A destructive operation must have `requiresConfirmation: true`; `checkConfirmation` only accepts names from that table, so a missing entry fails the build.
3. Add the case arm in `src/tools/<domain>.ts`. Destructive arms call `checkConfirmation` before the API call.
4. Add the action to the README tools table and, if gated, to the "Operations that require confirmation" list, in the form `` `holded_<domain>({ action: '<action>' })` ``. The coverage test checks that the README list equals the gated arms in the code.
5. Add tests.

## Releasing

Releases are staged by CI and promoted by a human.

1. Update `CHANGELOG.md` and bump `version` in `package.json`.
2. Commit, then tag and push:

   ```bash
   git tag vX.Y.Z
   git push origin main
   git push origin vX.Y.Z
   ```

3. The `Publish to npm` workflow runs tests and build, then `npm stage publish`. It authenticates over OIDC as a trusted publisher, so there is no npm token in the repository or its secrets. The tarball is uploaded but is not installable yet.
4. Inspect and promote it. This needs npm 11.19.0 or later locally:

   ```bash
   npm stage list @t4dhg/mcp-holded    # find the stage id
   npm stage view <stage-id>           # inspect the metadata and shasum
   npm stage download <stage-id>       # optional: fetch the exact tarball
   npm stage approve <stage-id>        # publish it, proving 2FA here
   ```

   `npm stage reject <stage-id>` discards it instead. Check the `shasum` from `npm stage view` against the one in the workflow log.

   Run `approve` from a real terminal: it needs a TTY for the browser authentication flow and fails with `EOTP` from a non-interactive shell. With an authenticator app, `npm stage approve <stage-id> --otp=123456` works anywhere. A failed approve is harmless; the release stays staged.

5. Confirm it landed by downloading the published tarball, not by trusting the version number:

   ```bash
   npm view @t4dhg/mcp-holded version dist.shasum
   npm pack @t4dhg/mcp-holded@X.Y.Z && tar tzf t4dhg-mcp-holded-X.Y.Z.tgz | head
   ```

If a tag was pushed and the version turns out to be wrong, delete the tag before re-tagging: `git tag -d vX.Y.Z && git push origin --delete vX.Y.Z`.
