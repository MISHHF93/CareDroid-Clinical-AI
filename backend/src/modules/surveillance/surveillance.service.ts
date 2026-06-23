import { Injectable } from '@nestjs/common';
import { buildSurveillanceNexusSnapshot } from './surveillance.data';
import type { SurveillanceNexusSnapshot, SurveillanceRequestLike } from './surveillance.types';

@Injectable()
export class SurveillanceService {
  async getNexusSnapshot(_req: SurveillanceRequestLike): Promise<SurveillanceNexusSnapshot> {
    return buildSurveillanceNexusSnapshot();
  }
}
