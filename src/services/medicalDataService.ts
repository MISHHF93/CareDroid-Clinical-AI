/**
 * Wrapper service for external medical data APIs
 * Provides unified access to FDA, NIH, and PubMed endpoints
 */

import appConfig from '../config/appConfig';
import logger from '../utils/logger';

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  status?: number;
}

class MedicalDataService {
  /**
   * Query FDA OpenData API (drugs, adverse events, etc.)
   * @param endpoint FDA API endpoint (e.g., 'drug/event')
   * @param params Query parameters
   */
  async queryFDA(endpoint: string, params: Record<string, string>): Promise<ApiResponse> {
    const { apiKey, baseUrl } = appConfig.externalApis.fda;

    if (!apiKey) {
      logger.warn('FDA API key not configured');
      return { success: false, error: 'FDA API key not configured' };
    }

    try {
      const queryString = new URLSearchParams({
        ...params,
        api_key: apiKey,
      }).toString();

      const url = `${baseUrl}/${endpoint}.json?${queryString}`;
      logger.debug(`FDA query: ${endpoint}`);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`FDA API error: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('FDA API request failed', error);
      return { success: false, error: message, status: 500 };
    }
  }

  /**
   * Query NIH/NCBI API for genes, proteins, etc.
   * @param database NCBI database (e.g., 'gene', 'protein')
   * @param term Search term
   */
  async queryNIH(database: string, term: string, maxResults: number = 100): Promise<ApiResponse> {
    const { apiKey, baseUrl } = appConfig.externalApis.nih;

    if (!apiKey) {
      logger.warn('NIH API key not configured');
      return { success: false, error: 'NIH API key not configured' };
    }

    try {
      const params = new URLSearchParams({
        db: database,
        term,
        retmax: maxResults.toString(),
        api_key: apiKey,
        rettype: 'json',
      }).toString();

      const url = `${baseUrl}/entrez/eutils/esearch.fcgi?${params}`;
      logger.debug(`NIH query: ${database}/${term}`);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`NIH API error: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('NIH API request failed', error);
      return { success: false, error: message, status: 500 };
    }
  }

  /**
   * Search PubMed for medical literature
   * @param query Search query
   * @param maxResults Maximum results to return
   */
  async searchPubMed(query: string, maxResults: number = 20): Promise<ApiResponse> {
    const { apiKey, baseUrl } = appConfig.externalApis.pubmed;

    if (!apiKey) {
      logger.warn('PubMed API key not configured');
      return { success: false, error: 'PubMed API key not configured' };
    }

    try {
      const encodedQuery = encodeURIComponent(query);
      const url =
        `${baseUrl}/search?term=${encodedQuery}&retmax=${maxResults}&rettype=json&api_key=${apiKey}`;
      logger.debug(`PubMed search: ${query}`);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`PubMed search error: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('PubMed search failed', error);
      return { success: false, error: message, status: 500 };
    }
  }

  /**
   * Check if external APIs are configured
   */
  isConfigured(): { fda: boolean; nih: boolean; pubmed: boolean } {
    return {
      fda: !!appConfig.externalApis.fda.apiKey,
      nih: !!appConfig.externalApis.nih.apiKey,
      pubmed: !!appConfig.externalApis.pubmed.apiKey,
    };
  }
}

export default new MedicalDataService();
