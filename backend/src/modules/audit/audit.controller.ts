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
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuditService } from './audit.service';
import { AuditAction } from './entities/audit-log.entity';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { SyncAuditEventDto } from './dto/sync-audit-event.dto';

@Controller('audit')
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
export class AuditController {
  private readonly logger = new Logger(AuditController.name);

  constructor(private readonly auditService: AuditService) {}

  // AUDIT-001: no update/delete route exists on this controller at all --
  // ordinary users genuinely cannot modify or erase audit evidence over the
  // API (the hash chain in AuditService also makes any out-of-band DB
  // tampering detectable, not just preventable via routing). But this route
  // had no rate limit: any authenticated user (any role, any tenant) could
  // flood the same tamper-evident ledger the platform treats as security
  // evidence with an unlimited volume of attacker-chosen SECURITY_EVENT
  // entries -- degrading its practical value (real events buried in noise)
  // without ever touching an existing row. Matches
  // analytics.controller.ts's identical-shape authenticated POST
  // /analytics/events limit (HEAL-347.89).
  @Post('sync')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async syncAuditEvent(@Body() body: SyncAuditEventDto, @Req() req: any) {
    const action = String(body.action || body.eventType || 'client_audit_event');
    const resourceType = String(body.resourceType || 'client');
    const resourceId = body.resourceId ? String(body.resourceId) : 'event';
    const log = await this.auditService.log({
      userId: req.user?.id,
      actorUserId: req.user?.id,
      organizationId: req.tenantContext?.organizationId,
      workspaceId: req.tenantContext?.workspaceId,
      action: AuditAction.SECURITY_EVENT,
      resource: `${resourceType}:${resourceId}`,
      ipAddress: req.ip || req.socket?.remoteAddress || 'unknown',
      userAgent: req.headers?.['user-agent'] || 'unknown',
      metadata: {
        ...body.metadata,
        eventType: action,
        resourceType,
        resourceId,
        clientTimestamp: body.timestamp || null,
      },
    });

    return {
      success: true,
      data: log,
    };
  }

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
  async verifyIntegrity(@Req() req: any) {
    try {
      // HEAL-347.23: VERIFY_AUDIT_INTEGRITY is granted to the ordinary
      // per-hospital ADMIN role, not a platform-only one -- without this
      // scope, any hospital's local admin got every other hospital's
      // tampered-log ids and the platform-wide total log count back.
      const result = await this.auditService.verifyIntegrity(req.tenantContext?.organizationId);

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
          integrityStatus: (
            await this.auditService.verifyIntegrity(req.tenantContext?.organizationId)
          ).isValid
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
}
