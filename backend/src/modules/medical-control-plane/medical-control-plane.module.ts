/**
 * Medical Control Plane Module
 *
 * The "clinical brain" of CareDroid - middleware layer between user input and AI/tools.
 *
 * Components:
 * - Intent Classifier: 3-phase pipeline (keyword → NLU → LLM) ✅
 * - Tool Orchestrator: Clinical tool execution and coordination ✅
 * - RAG Engine: (To be implemented in Batch 6)
 * - Emergency Detector: (Integrated in Intent Classifier) ✅
 */

import { Module } from '@nestjs/common';
import { IntentClassifierModule } from './intent-classifier/intent-classifier.module';
import { ToolOrchestratorModule } from './tool-orchestrator/tool-orchestrator.module';

@Module({
  imports: [IntentClassifierModule, ToolOrchestratorModule],
  exports: [IntentClassifierModule, ToolOrchestratorModule],
})
export class MedicalControlPlaneModule {}
