# CareerLoop Core

CareerLoop is the outcome-learning layer on top of CareerOS. Its North Star is **interviews per application**, not a cosmetic ATS score.

## V1 closed loop

1. **Career Twin** converts Career Memory into an evidence/provenance graph.
2. **Apply / Skip** compares a pasted job URL or description against that graph.
3. **Truth-locked tailoring** reuses the existing CareerOS tailoring/guardrail pipeline and does not add unsupported skills.
4. **Application attribution** stores job source, exact resume ID/version, fit score, and Apply/Consider/Skip decision.
5. **Conversion Intelligence** compares recorded outcomes by role, source, resume version, and fit band.

CareerLoop recommendations deliberately describe observed correlations as experiments rather than causal claims. The engine waits for minimum samples before comparing cohorts.

## Security

Arbitrary job URL extraction is SSRF-hardened: only HTTP(S), no credentials, no localhost/private addresses, DNS checks, manual redirect validation on every hop, response-size limits, and request timeouts.

## Deferred by design

Full auto-apply, broad job discovery, talent marketplace features, and networking automation are not part of this release. The current product is optimized for **apply smarter**, not mass submission.
