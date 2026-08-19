import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { recordBackendAuditTelemetry } from '../../common/observability/platform-telemetry-sink';
import { AuditLog, AuditAction } from './entities/audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  /**
   * Calculate SHA-256 hash of an audit log entry
   * This is used for creating immutable chain of audit logs
   */
  private calculateHash(data: {
    userId?: string;
    action: AuditAction;
    resource: string;
    ipAddress: string;
    timestamp: Date;
    previousHash?: string;
    metadata?: Record<string, any>;
  }): string {
    const content = JSON.stringify({
      ...data,
      userId: data.userId ?? undefined,
      metadata: data.metadata ?? undefined,
      previousHash: data.previousHash || '0', // First entry has '0' as previous hash
    });
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Log an audit entry with hash chaining for integrity verification
   */
  async log(data: {
    userId?: string;
    workspaceId?: string;
    organizationId?: string;
    actorUserId?: string;
    targetUserId?: string;
    membershipId?: string;
    action: AuditAction;
    resource: string;
    ipAddress: string;
    userAgent: string;
    phiAccessed?: boolean;
    metadata?: Record<string, any>;
    details?: Record<string, any>;
  }) {
    // Get the last audit log to get its hash for chaining
    const [lastLog] = await this.auditRepository.find({
      order: { timestamp: 'DESC' },
      take: 1,
    });

    let timestamp = new Date();
    if (lastLog?.timestamp && timestamp <= lastLog.timestamp) {
      timestamp = new Date(lastLog.timestamp.getTime() + 1);
    }

    const previousHash = lastLog?.hash || '0'; // Genesis block uses '0'

    // Calculate hash for this entry
    const hash = this.calculateHash({
      userId: data.userId,
      action: data.action,
      resource: data.resource,
      ipAddress: data.ipAddress,
      timestamp,
      previousHash,
      metadata: data.metadata,
    });

    const auditLog = this.auditRepository.create({
      ...data,
      timestamp,
      hash,
      previousHash,
      integrityVerified: true, // Assume valid when first created
    });

    const saved = await this.auditRepository.save(auditLog);
    recordBackendAuditTelemetry({
      action: data.action,
      resource: data.resource,
      userId: data.userId,
      phiAccessed: data.phiAccessed,
      organizationId: data.organizationId,
      metadata: data.metadata,
    });
    return saved;
  }

  /**
   * Verify the integrity of the entire audit log chain
   * Returns true if all hashes match correctly, false if tampering detected
   *
   * HEAL-347.23: the chain is deliberately GLOBAL, not per-organization --
   * log() (above) chains every new entry off the single most recent log
   * across ALL orgs, regardless of which org wrote it. That makes the chain
   * harder to selectively tamper with, but it also means the tamper-check
   * math can only be computed correctly over the full, unfiltered log set --
   * filtering the *query* by organizationId would break the hash comparison
   * (each entry's previousHash refers to whatever log, from any org, was
   * written immediately before it). So this still walks every log to get a
   * correct isValid/integrityVerified result, but when a caller passes
   * `organizationId` (every real caller now does -- see the controller),
   * the RETURNED totalLogs/tamperedLogs are filtered down to just that
   * org's own logs. Before this, GET /audit/verify-integrity (gated by the
   * ordinary per-hospital ADMIN-held VERIFY_AUDIT_INTEGRITY permission, not
   * a platform-only role) returned every org's tampered log ids and the
   * platform-wide total log count to any hospital's local admin.
   */
  async verifyIntegrity(organizationId?: string): Promise<{
    isValid: boolean;
    totalLogs: number;
    tamperedLogs: string[];
    message: string;
  }> {
    const allLogs = await this.auditRepository.find({
      order: { timestamp: 'ASC' },
    });

    if (allLogs.length === 0) {
      return {
        isValid: true,
        totalLogs: 0,
        tamperedLogs: [],
        message: 'No audit logs to verify',
      };
    }

    const tamperedEntries: { logId: string; organizationId: string | null; message: string }[] = [];
    let previousHash = '0'; // Genesis block

    for (let i = 0; i < allLogs.length; i++) {
      const log = allLogs[i];

      // Recalculate the expected hash
      const expectedHash = this.calculateHash({
        userId: log.userId ?? undefined,
        action: log.action,
        resource: log.resource,
        ipAddress: log.ipAddress,
        timestamp: log.timestamp,
        previousHash,
        metadata: log.metadata,
      });

      // Verify hash matches
      if (log.hash !== expectedHash) {
        tamperedEntries.push({
          logId: log.id,
          organizationId: log.organizationId ?? null,
          message: `Log ID ${log.id}: Hash mismatch (expected ${expectedHash}, got ${log.hash})`,
        });
      }

      // Verify chain is intact
      if (log.previousHash !== previousHash) {
        tamperedEntries.push({
          logId: log.id,
          organizationId: log.organizationId ?? null,
          message: `Log ID ${log.id}: Chain broken (expected previousHash ${previousHash}, got ${log.previousHash})`,
        });
      }

      previousHash = log.hash;
    }

    const chainIsValid = tamperedEntries.length === 0;

    // Update integrityVerified flag for all logs -- this DB write is a
    // genuine whole-chain maintenance operation, unrelated to what this
    // call returns to its caller, so it stays scoped to the real global
    // result regardless of the organizationId filter below.
    if (chainIsValid) {
      await this.auditRepository
        .createQueryBuilder()
        .update(AuditLog)
        .set({ integrityVerified: true })
        .execute();
    } else {
      // Mark all logs as unverified if chain is broken
      await this.auditRepository
        .createQueryBuilder()
        .update(AuditLog)
        .set({ integrityVerified: false })
        .execute();
    }

    const scopedTotalLogs = organizationId
      ? allLogs.filter((log) => log.organizationId === organizationId).length
      : allLogs.length;
    const scopedTamperedLogs = (
      organizationId
        ? tamperedEntries.filter((entry) => entry.organizationId === organizationId)
        : tamperedEntries
    ).map((entry) => entry.message);
    const scopedIsValid = scopedTamperedLogs.length === 0;

    return {
      isValid: scopedIsValid,
      totalLogs: scopedTotalLogs,
      tamperedLogs: scopedTamperedLogs,
      message: scopedIsValid
        ? 'All audit logs verified successfully'
        : `Tampering detected in ${scopedTamperedLogs.length} logs`,
    };
  }

  async findByUser(userId: string, limit = 100, organizationId?: string) {
    return this.auditRepository.find({
      where: { userId, ...(organizationId ? { organizationId } : {}) },
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  async findPhiAccess(startDate: Date, endDate: Date, organizationId?: string) {
    const query = this.auditRepository
      .createQueryBuilder('log')
      .where('log.phiAccessed = :phiAccessed', { phiAccessed: true })
      .andWhere('log.timestamp >= :startDate', { startDate })
      .andWhere('log.timestamp <= :endDate', { endDate })
      .orderBy('log.timestamp', 'DESC');

    if (organizationId) {
      query.andWhere('log.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find all logs by action type
   */
  async findByAction(action: AuditAction, limit = 100, organizationId?: string) {
    return this.auditRepository.find({
      where: { action, ...(organizationId ? { organizationId } : {}) },
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  /**
   * Find all logs within a date range
   */
  async findByDateRange(startDate: Date, endDate: Date, organizationId?: string) {
    const query = this.auditRepository
      .createQueryBuilder('log')
      .where('log.timestamp >= :startDate', { startDate })
      .andWhere('log.timestamp <= :endDate', { endDate })
      .orderBy('log.timestamp', 'DESC');

    if (organizationId) {
      query.andWhere('log.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find logs by user within date range
   */
  async findByUserAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
    organizationId?: string,
  ) {
    const query = this.auditRepository
      .createQueryBuilder('log')
      .where('log.userId = :userId', { userId })
      .andWhere('log.timestamp >= :startDate', { startDate })
      .andWhere('log.timestamp <= :endDate', { endDate })
      .orderBy('log.timestamp', 'DESC');

    if (organizationId) {
      query.andWhere('log.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }
}
