# Frontend AI Integration

Use this prompt when integrating AI output into CareDroid screens.

Rules:
- Use `useCareDroidAI` for frontend requests.
- Render output with components from `src/components/ai`.
- Never render raw JSON.
- Include loading, empty, and error states.
- Show confidence, reasoning, warnings, next actions, and review requirement.
- Keep UI calm, accessible, and clinical.
- Use color for urgency and status only.
- Preserve existing screen layout, route behavior, and component props.

Suggested workflow:
1. Identify the screen's clinical or operational intent.
2. Map existing screen data into one supported CareDroid AI intent.
3. Call the centralized AI node through the hook or service.
4. Render through `AIInsightPanel` or `AIRecommendationCard`.
5. Add focused rendering or fallback tests when behavior changes.
