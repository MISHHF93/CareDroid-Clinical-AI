import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
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

    return this.auditRepository.save(auditLog);
  }

  /**
   * Verify the integrity of the entire audit log chain
   * Returns true if all hashes match correctly, false if tampering detected
   */
  async verifyIntegrity(): Promise<{
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

    const tamperedLogs: string[] = [];
    let previousHash = '0'; // Genesis block

    for (let i = 0; i < allLogs.length; i++) {
      const log = allLogs[i];

      // Recalculate the expected hash
      const expectedHash = this.calculateHash({
        userId: log.userId,
        action: log.action,
        resource: log.resource,
        ipAddress: log.ipAddress,
        timestamp: log.timestamp,
        previousHash,
        metadata: log.metadata,
      });

      // Verify hash matches
      if (log.hash !== expectedHash) {
        tamperedLogs.push(
          `Log ID ${log.id}: Hash mismatch (expected ${expectedHash}, got ${log.hash})`,
        );
      }

      // Verify chain is intact
      if (log.previousHash !== previousHash) {
        tamperedLogs.push(
          `Log ID ${log.id}: Chain broken (expected previousHash ${previousHash}, got ${log.previousHash})`,
        );
      }

      previousHash = log.hash;
    }

    const isValid = tamperedLogs.length === 0;

    // Update integrityVerified flag for all logs
    if (isValid) {
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

    return {
      isValid,
      totalLogs: allLogs.length,
      tamperedLogs,
      message: isValid
        ? 'All audit logs verified successfully'
        : `Tampering detected in ${tamperedLogs.length} logs`,
    };
  }

  async findByUser(userId: string, limit = 100, organizationId?: string) {
    return this.auditRepository.find({
      where: { userId, ...(organizationId ? { organizationId } : {}) },
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  async findPhiAccess(_startDate: Date, _endDate: Date, organizationId?: string) {
    return this.auditRepository.find({
      where: {
        phiAccessed: true,
        ...(organizationId ? { organizationId } : {}),
      },
      order: { timestamp: 'DESC' },
    });
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
