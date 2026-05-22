import { CalculatorRecommenderService } from './calculator-recommender.service';

describe('CalculatorRecommenderService', () => {
  it('returns chest pain recommendations using real CareDroid tool ids', () => {
    const service = new CalculatorRecommenderService();

    const result = service.recommend('Chest pain with diaphoresis, elevated troponin, ACS concern');

    expect(result.status).toBe('matched');
    expect(result.recommendations.map((tool) => tool.id)).toEqual([
      'heart-score',
      'timi-ua-nstemi',
      'grace-acs',
      'ascvd-risk',
    ]);
    expect(result.safety.warnings.join(' ')).toMatch(/not diagnose/i);
  });

  it('returns needs_more_context when no calculator context is present', () => {
    const service = new CalculatorRecommenderService();

    const result = service.recommend('general clinical documentation question');

    expect(result.status).toBe('needs_more_context');
    expect(result.recommendations).toEqual([]);
  });
});
