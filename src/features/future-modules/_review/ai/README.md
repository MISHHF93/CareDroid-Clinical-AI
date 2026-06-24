# Future AI Module Review

Legacy and future AI assets should be moved here only after their tests, routes, and package contracts are updated.

Classified review candidates from the AI harmonization pass:

- `src/pages/AiModelsPage.jsx`, `src/pages/AiCommandCenterDashboard.jsx`, `src/pages/CareDroidBrainDashboard.jsx`, `src/pages/AiEvaluationDashboard.jsx`: legacy general platform AI pages; not mounted by the active CareDroid route tree.
- `src/pages/tools/*Ai.jsx`: legacy clinical tool AI pages. Some calculator/helper concepts may be curated later into CareDroid workflow launchers, but they are not active ED Copilot routes.
- `src/data/aiModelRegistry.js`: legacy model marketplace/config display; not used by active CareDroid AI.
- `src/services/aiCommandCenterApi.js`, `src/services/careDroidBrainService.js`: legacy platform AI clients.
- `backend/src/modules/ai`, `backend/src/modules/ai-gateway`, `backend/src/modules/rag`, `backend/src/modules/moe-router`: backend AI foundation and RAG modules. These remain in place because the active chat service imports them; future work should narrow them to CareDroid capabilities before archiving.

Do not re-enable legacy generic medical chatbot surfaces in the active product. Active AI belongs to CareDroid as an operational support layer.
