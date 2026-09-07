## What this changes

## Why

## Checklist

- [ ] `npm run lint && npm run typecheck && npm run format:check && npm test && npm run build` passes
- [ ] Any new endpoint has an anonymised fixture in `src/__tests__/fixtures`
- [ ] Any new destructive action has a `checkConfirmation` call and an entry in `OPERATION_POLICIES`
- [ ] Any new resource or prompt is documented in `README.md` and `llms.txt`, and the surface test passes
- [ ] No API key, `pat_` token or customer data in the diff
