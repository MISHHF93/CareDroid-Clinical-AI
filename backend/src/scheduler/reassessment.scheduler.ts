import cron, { type ScheduledTask } from 'node-cron';
import { Logger } from '@nestjs/common';
import { reassessmentService } from '../services/reassessment.service';
import { UnifiedPatient as Patient } from '../models/unified-patient.model';

const logger = new Logger('ReassessmentScheduler');

export class ReassessmentScheduler {
  private job: ScheduledTask | null = null;

  start(): void {
    this.job = cron.schedule('* * * * *', async () => {
      try {
        const overduePatients = await reassessmentService.getPatientsNeedingReassessment();

        for (const patient of overduePatients) {
          // Add alert for overdue reassessment
          const minutesOverdue = Math.floor(
            (Date.now() - (patient.next_reassessment_due?.getTime() || Date.now())) / 60000,
          );

          if (minutesOverdue > 0) {
            await Patient.findByIdAndUpdate(patient._id, {
              $addToSet: {
                alerts: `Reassessment overdue by ${minutesOverdue} minutes (DPS ${patient.dps_score})`,
              },
            });
          }
        }

        if (overduePatients.length > 0) {
          logger.log(`${overduePatients.length} patients need reassessment`);
        }
      } catch (error) {
        logger.error('Reassessment sweep failed', error instanceof Error ? error.stack : error);
      }
    });
  }

  stop(): void {
    if (this.job) {
      this.job.stop();
      this.job = null;
    }
  }
}

export const reassessmentScheduler = new ReassessmentScheduler();
