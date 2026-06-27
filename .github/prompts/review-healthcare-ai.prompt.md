# Review Healthcare AI Safety

Review CareDroid changes from a healthcare AI safety perspective.

Focus on:
- AI must not present itself as a final medical authority.
- Clinical outputs must require licensed clinician review.
- Recommendations must include confidence, reasoning, warnings, and next actions.
- Red flags and incomplete data must be visible.
- UI must provide accept, modify, and dismiss/override controls.
- Logs must not include patient names, MRNs, free-text complaints, notes, vitals values tied to identity, phone numbers, email addresses, or secrets.
- Frontend components must not call AI providers directly.

Prefer precise findings with file and line references. Suggest small incremental fixes that preserve existing behavior.
