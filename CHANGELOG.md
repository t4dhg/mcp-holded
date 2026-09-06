# Changelog

All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-09-06

### Changed

- `holded_request` now requires `confirm: true` for `DELETE` and `PUT`. Without it the tool sends nothing and returns the exact method, URL and body it would have sent. A model acting on a mistaken or injected instruction could previously delete or overwrite any Holded record in one step.

### Added

- `SECURITY.md` and GitHub private vulnerability reporting.
- CI on Node 18 to 24 (`node --test` plus a syntax check) and a publish workflow that stages releases to npm through trusted publishing for a human to approve; no npm token is stored anywhere.
- This changelog.

## [1.0.0] - 2026-07-21

- Initial release.
