import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../workspaces/entities/organization.entity';
import {
  MATURITY_PRODUCT_RULES,
  MATURITY_QUESTIONNAIRE,
} from './data/product-catalog-seed.data';
import { MaturityDimension } from './enums/product-catalog.enums';
import { Product } from './entities/product.entity';
import { SubmitMaturityAssessmentDto } from './dto/submit-maturity-assessment.dto';

@Injectable()
export class MaturityAssessmentService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
  ) {}

  getQuestionnaire() {
    return { questions: MATURITY_QUESTIONNAIRE };
  }

  async submitAssessment(dto: SubmitMaturityAssessmentDto) {
    const dimensionScores: Record<string, number> = {};
    const dimensionCounts: Record<string, number> = {};

    for (const answer of dto.answers || []) {
      const question = MATURITY_QUESTIONNAIRE.find((q) => q.id === answer.questionId);
      if (!question) continue;
      const dim = question.dimension;
      dimensionScores[dim] = (dimensionScores[dim] || 0) + answer.value * (question.weight || 1);
      dimensionCounts[dim] = (dimensionCounts[dim] || 0) + (question.weight || 1);
    }

    const dimensions = Object.values(MaturityDimension).map((dim) => {
      const raw = dimensionScores[dim] || 0;
      const count = dimensionCounts[dim] || 1;
      const maxPerQuestion = 4;
      const score = Math.round((raw / (count * maxPerQuestion)) * 100);
      return { dimension: dim, score: Math.min(100, score) };
    });

    const overallScore = Math.round(
      dimensions.reduce((sum, d) => sum + d.score, 0) / Math.max(dimensions.length, 1),
    );

    const applicableRules = MATURITY_PRODUCT_RULES.filter((r) => overallScore >= r.minScore)
      .sort((a, b) => b.minScore - a.minScore);
    const slugSet = new Set<string>();
    applicableRules.forEach((r) => r.productSlugs.forEach((s) => slugSet.add(s)));

    const products = await this.productRepository.find();
    const recommended = products.filter((p) => slugSet.has(p.slug));

    const result = {
      overallScore,
      dimensions,
      recommendedProducts: recommended.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        description: p.description,
        packIds: p.packIds,
      })),
      assessedAt: new Date().toISOString(),
    };

    if (dto.organizationId) {
      const org = await this.organizationRepository.findOne({
        where: { id: dto.organizationId },
      });
      if (!org) throw new NotFoundException('Organization not found');
      org.settings = {
        ...(org.settings || {}),
        maturity: result,
      };
      await this.organizationRepository.save(org);
    }

    return result;
  }
}
