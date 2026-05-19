import { MedicalSource } from '../../rag/dto/medical-source.dto';

/**
 * Clinical Query Prompt Templates
 *
 * Templates for constructing prompts that incorporate RAG-retrieved context
 * for evidence-based clinical responses.
 */

export interface PromptContext {
  /**
   * Retrieved medical knowledge chunks
   */
  retrievedContext: string;

  /**
   * Medical sources for citations
   */
  sources: MedicalSource[];

  /**
   * User's query
   */
  userQuery: string;

  /**
   * Additional conversation context
   */
  conversationHistory?: string;

  /**
   * RAG retrieval confidence (0-1)
   */
  confidence: number;

  /**
   * User role for tailoring response
   */
  userRole?: 'student' | 'nurse' | 'physician' | 'admin';
}

/**
 * Build clinical query prompt with RAG context
 */
export function buildClinicalQueryPrompt(context: PromptContext): string {
  const { retrievedContext, sources, userQuery, conversationHistory, confidence, userRole } =
    context;

  // Different prompts based on confidence level
  if (confidence >= 0.8) {
    // High confidence - strong evidence available
    return `You are an expert clinical assistant with access to authoritative medical guidelines and protocols.

**Retrieved Medical Knowledge:**
${retrievedContext}

**Sources:**
${sources.map((s, i) => `[${i + 1}] ${s.title}${s.organization ? ` - ${s.organization}` : ''}${s.date ? ` (${s.date})` : ''}`).join('\n')}

${conversationHistory ? `**Conversation History:**\n${conversationHistory}\n\n` : ''}**Clinical Query:**
${userQuery}

**Instructions:**
1. Provide an evidence-based response using the retrieved medical knowledge above
2. Include inline citations using [number] format (e.g., "Per ACLS guidelines [1]")
3. If the retrieved context doesn't fully answer the question, clearly state what is covered and what requires additional resources
4. Maintain clinical accuracy and cite sources for all recommendations
5. Include relevant clinical pearls or warnings where appropriate
${userRole === 'student' ? '6. Explain medical concepts clearly for educational purposes\n' : ''}${userRole === 'physician' ? '6. Include advanced clinical considerations and treatment nuances\n' : ''}
**Your Response:**`;
  } else if (confidence >= 0.5) {
    // Moderate confidence - some evidence available
    return `You are a clinical assistant providing information based on available medical evidence.

**Retrieved Medical Knowledge (Moderate Confidence - ${(confidence * 100).toFixed(0)}%):**
${retrievedContext}

**Sources:**
${sources.map((s, i) => `[${i + 1}] ${s.title}${s.organization ? ` - ${s.organization}` : ''}`).join('\n')}

${conversationHistory ? `**Conversation History:**\n${conversationHistory}\n\n` : ''}**Clinical Query:**
${userQuery}

**Instructions:**
1. Provide a response based on the retrieved knowledge, but acknowledge the moderate confidence level
2. Include citations using [number] format where information is sourced
3. Clearly indicate any limitations or areas where the evidence is incomplete
4. Suggest additional resources or consultations if appropriate
5. Add a disclaimer about consulting current guidelines for critical decisions

**Your Response:**`;
  } else {
    // Low confidence - limited evidence
    return `You are a clinical assistant with limited specific evidence for this query.

${retrievedContext ? `**Available Medical Knowledge (Limited - ${(confidence * 100).toFixed(0)}% confidence):**\n${retrievedContext}\n\n` : ''}**Clinical Query:**
${userQuery}

**Instructions:**
1. Acknowledge that specific evidence-based guidelines are limited for this query
2. Provide general clinical principles if appropriate
3. ${retrievedContext ? 'Use any available retrieved knowledge with appropriate citations' : 'Suggest consulting current textbooks, specialists, or institutional protocols'}
4. Include a clear disclaimer about the limitations
5. Recommend seeking guidance from senior clinicians or specialists

**Important Disclaimer:**
Limited evidence-based resources were retrieved for this specific query. The response should reflect general clinical principles rather than specific protocol-based recommendations.

**Your Response:**`;
  }
}

/**
 * Build medical reference prompt
 */
export function buildMedicalReferencePrompt(context: PromptContext): string {
  const { retrievedContext, sources, userQuery, confidence } = context;

  return `You are a medical reference assistant providing educational information.

**Retrieved Medical Knowledge:**
${retrievedContext}

**References:**
${sources.map((s, i) => `[${i + 1}] ${s.title}${s.organization ? ` (${s.organization})` : ''}${s.date ? ` - ${s.date}` : ''}${s.url ? `\nURL: ${s.url}` : ''}`).join('\n\n')}

**Query:**
${userQuery}

**Instructions:**
1. Provide comprehensive educational information based on the retrieved knowledge
2. Include all relevant citations using [number] format
3. Organize information clearly with headings where appropriate
4. Include clinical pearls or key points to remember
5. Add relevant warnings or contraindications
6. Confidence level: ${(confidence * 100).toFixed(0)}%${confidence < 0.7 ? ' - Consider consulting additional sources for comprehensive information' : ''}

**Your Response:**`;
}

/**
 * Build drug information prompt
 */
export function buildDrugInformationPrompt(context: PromptContext): string {
  const { retrievedContext, sources, userQuery } = context;

  return `You are a clinical pharmacology assistant providing drug information.

**Retrieved Drug Information:**
${retrievedContext}

**Sources:**
${sources.map((s, i) => `[${i + 1}] ${s.title}${s.organization ? ` - ${s.organization}` : ''}`).join('\n')}

**Query:**
${userQuery}

**Instructions:**
1. Provide accurate drug information from the retrieved sources
2. Include: indications, dosing, contraindications, adverse effects, and clinical pearls
3. Cite all information using [number] format
4. Highlight critical safety information (black box warnings, serious interactions)
5. Include practical clinical considerations for prescribing/administration

**Your Response:**`;
}

/**
 * Build clinical protocol prompt
 */
export function buildClinicalProtocolPrompt(context: PromptContext): string {
  const { retrievedContext, sources, userQuery } = context;

  return `You are a clinical assistant providing evidence-based protocol information.

**Retrieved Protocol/Guideline:**
${retrievedContext}

**Source:**
${sources.map((s, i) => `[${i + 1}] ${s.title}${s.organization ? ` - ${s.organization}` : ''}${s.date ? ` (${s.date})` : ''}${s.evidenceLevel ? ` - Evidence Level: ${s.evidenceLevel}` : ''}`).join('\n')}

**Query:**
${userQuery}

**Instructions:**
1. Summarize the relevant protocol/guideline information
2. Present information in a clear, step-by-step format where applicable
3. Include all citations using [number] format
4. Highlight any time-sensitive or critical steps
5. Note evidence quality and any controversies in recommendations
6. Include practical implementation tips

**Your Response:**`;
}

/**
 * Add RAG confidence disclaimer
 */
export function addConfidenceDisclaimer(confidence: number): string {
  if (confidence >= 0.8) {
    return '\n\n_This response is based on high-quality evidence from authoritative medical sources._';
  } else if (confidence >= 0.5) {
    return '\n\n_This response is based on available evidence, but may not comprehensively cover all aspects of your query. Consider consulting current guidelines or specialists for critical decisions._';
  } else {
    return '\n\n⚠️ _Limited evidence-based resources were found for this specific query. This response is based on general clinical principles. Please consult current guidelines, textbooks, or specialists for authoritative guidance._';
  }
}

/**
 * Format citations for display
 */
export function formatCitations(sources: MedicalSource[]): string {
  if (sources.length === 0) {
    return '';
  }

  return (
    '\n\n**References:**\n' +
    sources
      .map((source, index) => {
        let citation = `[${index + 1}] ${source.title}`;

        if (source.authors && source.authors.length > 0) {
          citation += `. ${source.authors.join(', ')}`;
        }

        if (source.organization) {
          citation += `. ${source.organization}`;
        }

        if (source.date) {
          citation += `. ${source.date}`;
        }

        if (source.url) {
          citation += `\n    ${source.url}`;
        }

        if (source.evidenceLevel) {
          citation += `\n    Evidence Level: ${source.evidenceLevel}`;
        }

        return citation;
      })
      .join('\n\n')
  );
}
