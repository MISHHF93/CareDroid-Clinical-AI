import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SubmitMaturityAssessmentDto } from './submit-maturity-assessment.dto';

describe('SubmitMaturityAssessmentDto (HEAL-241)', () => {
  it("accepts answers on the questionnaire's real 1-4 scale", async () => {
    const dto = plainToInstance(SubmitMaturityAssessmentDto, {
      answers: [{ questionId: 'q1', value: 3 }],
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects a negative answer value instead of letting it corrupt the maturity score', async () => {
    // MaturityAssessmentService.submitAssessment() multiplies answer.value
    // straight into a running score sum with no floor clamp -- a negative
    // value here previously produced a negative dimension score no client
    // could sensibly render.
    const dto = plainToInstance(SubmitMaturityAssessmentDto, {
      answers: [{ questionId: 'q1', value: -5 }],
    });

    const errors = await validate(dto);

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'answers',
        }),
      ]),
    );
  });

  it("rejects an answer value above the questionnaire's 4-point scale", async () => {
    const dto = plainToInstance(SubmitMaturityAssessmentDto, {
      answers: [{ questionId: 'q1', value: 100 }],
    });

    const errors = await validate(dto);

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'answers',
        }),
      ]),
    );
  });
});
