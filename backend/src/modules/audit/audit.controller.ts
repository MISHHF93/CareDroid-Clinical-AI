import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuditService } from './audit.service';
import { AuditAction } from './entities/audit-log.entity';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';

@Controller('audit')
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
export class AuditController {
  private readonly logger = new Logger(AuditController.name);

  constructor(private readonly auditService: AuditService) {}

  /**
   * Get audit logs (admin only)
   * Supports filtering by user, date range, and action type
   */
  @Get('logs')
  @RequirePermission(Permission.VIEW_AUDIT_LOGS)
  async getLogs(@Query() query: any, @Req() _req: any) {
    const { userId, startDate, endDate, action, limit = 100, offset = 0 } = query;
    const organizationId = _req.tenantContext?.organizationId;

    try {
      let logs: any[];

      // Apply filters
      if (userId && startDate && endDate) {
        logs = await this.auditService.findByUserAndDateRange(
          userId,
          new Date(startDate),
          new Date(endDate),
          organizationId,
        );
      } else if (userId) {
        logs = await this.auditService.findByUser(userId, parseInt(limit), organizationId);
      } else if (action) {
        logs = await this.auditService.findByAction(action, parseInt(limit), organizationId);
      } else if (startDate && endDate) {
        logs = await this.auditService.findByDateRange(
          new Date(startDate),
          new Date(endDate),
          organizationId,
        );
      } else {
        // Return all logs (limited)
        logs = [];
      }

      this.logger.log(`Audit logs retrieved: ${logs.length} records`);

      return {
        success: true,
        data: logs.slice(offset, offset + parseInt(limit)),
        total: logs.length,
        offset,
        limit: parseInt(limit),
      };
    } catch (error) {
      this.logger.error(`Error retrieving audit logs: ${error}`);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to retrieve audit logs',
          error: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get audit logs for current user
   */
  @Get('my-logs')
  async getMyLogs(@Query('limit') limit: string = '100', @Req() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      throw new HttpException(
        {
          success: false,
          message: 'Unauthorized',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      const logs = await this.auditService.findByUser(
        userId,
        parseInt(limit),
        req.tenantContext?.organizationId,
      );

      return {
        success: true,
        data: logs,
        total: logs.length,
      };
    } catch (error) {
      this.logger.error(`Error retrieving user audit logs: ${error}`);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to retrieve audit logs',
          error: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get PHI access logs (admin only)
   */
  @Get('phi-access')
  @RequirePermission(Permission.VIEW_AUDIT_LOGS)
  async getPhiAccessLogs(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      const logs = await this.auditService.findPhiAccess(
        startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Default last 7 days
        endDate ? new Date(endDate) : new Date(),
        req.tenantContext?.organizationId,
      );

      return {
        success: true,
        data: logs,
        total: logs.length,
      };
    } catch (error) {
      this.logger.error(`Error retrieving PHI access logs: ${error}`);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to retrieve PHI access logs',
          error: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Verify integrity of audit log chain
   * Returns information about any tampering detected
   */
  @Get('verify-integrity')
  @RequirePermission(Permission.VERIFY_AUDIT_INTEGRITY)
  async verifyIntegrity() {
    try {
      const result = await this.auditService.verifyIntegrity();

      this.logger.log(`Integrity verification complete: ${result.isValid ? 'VALID' : 'TAMPERED'}`);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(`Error verifying audit log integrity: ${error}`);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to verify audit log integrity',
          error: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get summary statistics about audit logs
   * (Total logs, logs by action type, logs by user, etc.)
   */
  @Get('statistics')
  @RequirePermission(Permission.VIEW_AUDIT_LOGS)
  async getStatistics(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      const start = startDate
        ? new Date(startDate)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default last 30 days
      const end = endDate ? new Date(endDate) : new Date();

      const logs = await this.auditService.findByDateRange(
        start,
        end,
        req.tenantContext?.organizationId,
      );

      // Compute statistics
      const logsByAction: Record<string, number> = {};
      const logsByUser: Record<string, number> = {};
      let phiAccessCount = 0;
      let securityEventCount = 0;

      logs.forEach((log) => {
        // Count by action
        logsByAction[log.action] = (logsByAction[log.action] || 0) + 1;

        // Count by user
        if (log.userId) {
          logsByUser[log.userId] = (logsByUser[log.userId] || 0) + 1;
        }

        // Count PHI access
        if (log.phiAccessed) {
          phiAccessCount++;
        }

        // Count security events
        if (log.action === AuditAction.SECURITY_EVENT) {
          securityEventCount++;
        }
      });

      return {
        success: true,
        data: {
          totalLogs: logs.length,
          dateRange: {
            start,
            end,
          },
          logsByAction,
          logsByUser,
          phiAccessCount,
          securityEventCount,
          integrityStatus: (await this.auditService.verifyIntegrity()).isValid
            ? 'VERIFIED'
            : 'TAMPERED',
        },
      };
    } catch (error) {
      this.logger.error(`Error generating audit statistics: ${error}`);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to generate audit statistics',
          error: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Sync offline audit logs to server
   */
  @Post('sync')
  async syncAuditLog(
    @Body()
    body: { action: string; resourceType?: string; resourceId?: string; timestamp?: string },
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.user?.userId;
    const action = Object.values(AuditAction).includes(body.action as AuditAction)
      ? (body.action as AuditAction)
      : AuditAction.SECURITY_EVENT;

    await this.auditService.log({
      userId,
      organizationId: req.tenantContext?.organizationId,
      workspaceId: req.tenantContext?.workspaceId,
      action,
      resource: `${body.resourceType || 'client'}:${body.resourceId || 'unknown'}`,
      ipAddress: req.ip || '0.0.0.0',
      userAgent: req.headers['user-agent'] || 'offline-sync',
      metadata: {
        syncedAt: new Date().toISOString(),
        originalTimestamp: body.timestamp,
      },
    });

    return { success: true };
  }
}
