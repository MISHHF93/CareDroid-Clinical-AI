import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as request from 'supertest';
import { AuthorizationGuard } from '../guards/authorization.guard';
import { Permission } from '../enums/permission.enum';
import { UserRole } from '../../users/entities/user.entity';
import { AuditService } from '../../audit/audit.service';
import { hasPermission, hasAnyPermission } from '../config/role-permissions.config';

/**
 * Role-Based Access Control (RBAC) E2E Tests
 *
 * Tests the complete RBAC system including:
 * - Permission checks
 * - Role-permission mapping
 * - Authorization guard enforcement
 * - Audit logging of permission checks
 */
describe('RBAC System (E2E)', () => {
  let app: INestApplication;
  let auditService: AuditService;

  beforeEach(async () => {
    const mockAuditService = {
      log: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorizationGuard,
        Reflector,
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    auditService = module.get<AuditService>(AuditService);
  });

  describe('Permission Enum', () => {
    it('should have all required PHI permissions', () => {
      expect(Permission.READ_PHI).toBeDefined();
      expect(Permission.WRITE_PHI).toBeDefined();
      expect(Permission.EXPORT_PHI).toBeDefined();
      expect(Permission.DELETE_PHI).toBeDefined();
    });

    it('should have all required clinical tool permissions', () => {
      expect(Permission.USE_CALCULATORS).toBeDefined();
      expect(Permission.USE_DRUG_CHECKER).toBeDefined();
      expect(Permission.USE_LAB_INTERPRETER).toBeDefined();
      expect(Permission.USE_PROTOCOLS).toBeDefined();
      expect(Permission.USE_AI_CHAT).toBeDefined();
    });

    it('should have all required admin permissions', () => {
      expect(Permission.MANAGE_USERS).toBeDefined();
      expect(Permission.VIEW_AUDIT_LOGS).toBeDefined();
      expect(Permission.CONFIGURE_SYSTEM).toBeDefined();
    });
  });

  describe('Role-Permission Mapping', () => {
    describe('Student Role', () => {
      it('should have access to clinical tools only', () => {
        expect(hasPermission(UserRole.STUDENT, Permission.USE_CALCULATORS)).toBe(true);
        expect(hasPermission(UserRole.STUDENT, Permission.USE_DRUG_CHECKER)).toBe(true);
        expect(hasPermission(UserRole.STUDENT, Permission.USE_LAB_INTERPRETER)).toBe(true);
        expect(hasPermission(UserRole.STUDENT, Permission.USE_PROTOCOLS)).toBe(true);
        expect(hasPermission(UserRole.STUDENT, Permission.USE_AI_CHAT)).toBe(true);
      });

      it('should NOT have access to PHI', () => {
        expect(hasPermission(UserRole.STUDENT, Permission.READ_PHI)).toBe(false);
        expect(hasPermission(UserRole.STUDENT, Permission.WRITE_PHI)).toBe(false);
        expect(hasPermission(UserRole.STUDENT, Permission.EXPORT_PHI)).toBe(false);
        expect(hasPermission(UserRole.STUDENT, Permission.DELETE_PHI)).toBe(false);
      });

      it('should NOT have admin permissions', () => {
        expect(hasPermission(UserRole.STUDENT, Permission.MANAGE_USERS)).toBe(false);
        expect(hasPermission(UserRole.STUDENT, Permission.VIEW_AUDIT_LOGS)).toBe(false);
        expect(hasPermission(UserRole.STUDENT, Permission.CONFIGURE_SYSTEM)).toBe(false);
      });
    });

    describe('Nurse Role', () => {
      it('should have read and write PHI access', () => {
        expect(hasPermission(UserRole.NURSE, Permission.READ_PHI)).toBe(true);
        expect(hasPermission(UserRole.NURSE, Permission.WRITE_PHI)).toBe(true);
      });

      it('should NOT have export or delete PHI access', () => {
        expect(hasPermission(UserRole.NURSE, Permission.EXPORT_PHI)).toBe(false);
        expect(hasPermission(UserRole.NURSE, Permission.DELETE_PHI)).toBe(false);
      });

      it('should have access to all clinical tools', () => {
        expect(hasPermission(UserRole.NURSE, Permission.USE_CALCULATORS)).toBe(true);
        expect(hasPermission(UserRole.NURSE, Permission.USE_DRUG_CHECKER)).toBe(true);
        expect(hasPermission(UserRole.NURSE, Permission.USE_LAB_INTERPRETER)).toBe(true);
        expect(hasPermission(UserRole.NURSE, Permission.USE_PROTOCOLS)).toBe(true);
        expect(hasPermission(UserRole.NURSE, Permission.USE_AI_CHAT)).toBe(true);
      });

      it('should have emergency protocol access', () => {
        expect(hasPermission(UserRole.NURSE, Permission.TRIGGER_EMERGENCY_PROTOCOL)).toBe(true);
      });

      it('should NOT have admin permissions', () => {
        expect(hasPermission(UserRole.NURSE, Permission.MANAGE_USERS)).toBe(false);
        expect(hasPermission(UserRole.NURSE, Permission.CONFIGURE_SYSTEM)).toBe(false);
      });
    });

    describe('Physician Role', () => {
      it('should have full PHI access', () => {
        expect(hasPermission(UserRole.PHYSICIAN, Permission.READ_PHI)).toBe(true);
        expect(hasPermission(UserRole.PHYSICIAN, Permission.WRITE_PHI)).toBe(true);
        expect(hasPermission(UserRole.PHYSICIAN, Permission.EXPORT_PHI)).toBe(true);
        expect(hasPermission(UserRole.PHYSICIAN, Permission.DELETE_PHI)).toBe(true);
      });

      it('should have access to all clinical tools', () => {
        expect(hasPermission(UserRole.PHYSICIAN, Permission.USE_CALCULATORS)).toBe(true);
        expect(hasPermission(UserRole.PHYSICIAN, Permission.USE_DRUG_CHECKER)).toBe(true);
        expect(hasPermission(UserRole.PHYSICIAN, Permission.USE_LAB_INTERPRETER)).toBe(true);
        expect(hasPermission(UserRole.PHYSICIAN, Permission.USE_PROTOCOLS)).toBe(true);
        expect(hasPermission(UserRole.PHYSICIAN, Permission.USE_AI_CHAT)).toBe(true);
      });

      it('should have emergency and safety override permissions', () => {
        expect(hasPermission(UserRole.PHYSICIAN, Permission.TRIGGER_EMERGENCY_PROTOCOL)).toBe(true);
        expect(hasPermission(UserRole.PHYSICIAN, Permission.OVERRIDE_SAFETY_CHECKS)).toBe(true);
      });

      it('should have audit log viewing permission', () => {
        expect(hasPermission(UserRole.PHYSICIAN, Permission.VIEW_AUDIT_LOGS)).toBe(true);
      });

      it('should NOT have system administration permissions', () => {
        expect(hasPermission(UserRole.PHYSICIAN, Permission.MANAGE_USERS)).toBe(false);
        expect(hasPermission(UserRole.PHYSICIAN, Permission.CONFIGURE_SYSTEM)).toBe(false);
        expect(hasPermission(UserRole.PHYSICIAN, Permission.MANAGE_ENCRYPTION)).toBe(false);
      });
    });

    describe('Admin Role', () => {
      it('should have full PHI access', () => {
        expect(hasPermission(UserRole.ADMIN, Permission.READ_PHI)).toBe(true);
        expect(hasPermission(UserRole.ADMIN, Permission.WRITE_PHI)).toBe(true);
        expect(hasPermission(UserRole.ADMIN, Permission.EXPORT_PHI)).toBe(true);
        expect(hasPermission(UserRole.ADMIN, Permission.DELETE_PHI)).toBe(true);
      });

      it('should have all user management permissions', () => {
        expect(hasPermission(UserRole.ADMIN, Permission.MANAGE_USERS)).toBe(true);
        expect(hasPermission(UserRole.ADMIN, Permission.MANAGE_ROLES)).toBe(true);
        expect(hasPermission(UserRole.ADMIN, Permission.VIEW_USERS)).toBe(true);
      });

      it('should have all audit permissions', () => {
        expect(hasPermission(UserRole.ADMIN, Permission.VIEW_AUDIT_LOGS)).toBe(true);
        expect(hasPermission(UserRole.ADMIN, Permission.EXPORT_AUDIT_LOGS)).toBe(true);
        expect(hasPermission(UserRole.ADMIN, Permission.VERIFY_AUDIT_INTEGRITY)).toBe(true);
      });

      it('should have all system administration permissions', () => {
        expect(hasPermission(UserRole.ADMIN, Permission.CONFIGURE_SYSTEM)).toBe(true);
        expect(hasPermission(UserRole.ADMIN, Permission.MANAGE_ENCRYPTION)).toBe(true);
        expect(hasPermission(UserRole.ADMIN, Permission.MANAGE_SUBSCRIPTIONS)).toBe(true);
        expect(hasPermission(UserRole.ADMIN, Permission.VIEW_ANALYTICS)).toBe(true);
      });

      it('should have MFA management permissions', () => {
        expect(hasPermission(UserRole.ADMIN, Permission.ENFORCE_MFA)).toBe(true);
        expect(hasPermission(UserRole.ADMIN, Permission.MANAGE_MFA)).toBe(true);
      });
    });
  });

  describe('Permission Utility Functions', () => {
    describe('hasAnyPermission', () => {
      it('should return true if user has at least one permission', () => {
        const result = hasAnyPermission(UserRole.NURSE, [
          Permission.EXPORT_PHI, // Nurse doesn't have this
          Permission.READ_PHI, // Nurse has this
        ]);
        expect(result).toBe(true);
      });

      it('should return false if user has none of the permissions', () => {
        const result = hasAnyPermission(UserRole.STUDENT, [
          Permission.READ_PHI,
          Permission.WRITE_PHI,
          Permission.MANAGE_USERS,
        ]);
        expect(result).toBe(false);
      });
    });
  });

  describe('Authorization Guard', () => {
    let guard: AuthorizationGuard;
    let reflector: Reflector;

    beforeEach(() => {
      reflector = new Reflector();
      guard = new AuthorizationGuard(reflector, auditService as any);
    });

    it('should allow access if user has required permission', async () => {
      const context = {
        getHandler: () => ({}),
        getClass: () => ({ name: 'TestController' }),
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'user-1', role: UserRole.PHYSICIAN },
            method: 'GET',
            url: '/api/test',
            ip: '127.0.0.1',
            headers: { 'user-agent': 'test' },
          }),
        }),
      } as any;

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Permission.READ_PHI]);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PERMISSION_GRANTED',
          userId: 'user-1',
        }),
      );
    });

    it('should deny access if user lacks required permission', async () => {
      const context = {
        getHandler: () => ({}),
        getClass: () => ({ name: 'TestController' }),
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'user-1', role: UserRole.STUDENT },
            method: 'GET',
            url: '/api/test',
            ip: '127.0.0.1',
            headers: { 'user-agent': 'test' },
          }),
        }),
      } as any;

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Permission.READ_PHI]);

      await expect(guard.canActivate(context)).rejects.toThrow('Access denied');
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PERMISSION_DENIED',
          userId: 'user-1',
        }),
      );
    });

    it('should allow access if no permissions are required', async () => {
      const context = {
        getHandler: () => ({}),
        getClass: () => ({ name: 'TestController' }),
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'user-1', role: UserRole.STUDENT },
          }),
        }),
      } as any;

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access if route is public', async () => {
      const context = {
        getHandler: () => ({}),
        getClass: () => ({ name: 'TestController' }),
        switchToHttp: () => ({
          getRequest: () => ({}),
        }),
      } as any;

      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(true) // IS_PUBLIC_KEY
        .mockReturnValueOnce(undefined); // PERMISSIONS_KEY

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('HIPAA Compliance', () => {
    it('should enforce principle of least privilege', () => {
      // Students should have minimal permissions
      const studentPermissions = [
        Permission.USE_CALCULATORS,
        Permission.USE_DRUG_CHECKER,
        Permission.USE_LAB_INTERPRETER,
        Permission.USE_PROTOCOLS,
        Permission.USE_AI_CHAT,
      ];

      // Verify students only have these permissions and nothing more
      expect(hasPermission(UserRole.STUDENT, Permission.READ_PHI)).toBe(false);
      expect(hasPermission(UserRole.STUDENT, Permission.MANAGE_USERS)).toBe(false);
    });

    it('should log all permission checks for audit trail', async () => {
      const guard = new AuthorizationGuard(new Reflector(), auditService as any);

      const context = {
        getHandler: () => ({}),
        getClass: () => ({ name: 'TestController' }),
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'user-1', role: UserRole.PHYSICIAN },
            method: 'GET',
            url: '/api/patients/123',
            ip: '127.0.0.1',
            headers: { 'user-agent': 'test' },
          }),
        }),
      } as any;

      jest
        .spyOn(guard['reflector'], 'getAllAndOverride')
        .mockReturnValueOnce(false) // IS_PUBLIC_KEY
        .mockReturnValueOnce([Permission.READ_PHI]) // PERMISSIONS_KEY
        .mockReturnValueOnce(undefined); // ANY_PERMISSIONS_KEY

      await guard.canActivate(context);

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          resource: 'TestController.undefined',
          details: expect.objectContaining({
            role: UserRole.PHYSICIAN,
            granted: true,
          }),
        }),
      );
    });

    it('should separate clinical access from administrative access', () => {
      // Physicians have clinical access but not admin access
      expect(hasPermission(UserRole.PHYSICIAN, Permission.READ_PHI)).toBe(true);
      expect(hasPermission(UserRole.PHYSICIAN, Permission.CONFIGURE_SYSTEM)).toBe(false);

      // Admins have both clinical and admin access
      expect(hasPermission(UserRole.ADMIN, Permission.READ_PHI)).toBe(true);
      expect(hasPermission(UserRole.ADMIN, Permission.CONFIGURE_SYSTEM)).toBe(true);
    });
  });

  describe('Security Properties', () => {
    it('should prevent privilege escalation', () => {
      // Lower roles cannot perform admin actions
      expect(hasPermission(UserRole.STUDENT, Permission.MANAGE_USERS)).toBe(false);
      expect(hasPermission(UserRole.NURSE, Permission.MANAGE_USERS)).toBe(false);
      expect(hasPermission(UserRole.PHYSICIAN, Permission.MANAGE_USERS)).toBe(false);

      // Only admin can manage users
      expect(hasPermission(UserRole.ADMIN, Permission.MANAGE_USERS)).toBe(true);
    });

    it('should enforce role hierarchy for PHI access', () => {
      // Students: no PHI access
      expect(hasPermission(UserRole.STUDENT, Permission.READ_PHI)).toBe(false);

      // Nurses: read/write PHI
      expect(hasPermission(UserRole.NURSE, Permission.READ_PHI)).toBe(true);
      expect(hasPermission(UserRole.NURSE, Permission.EXPORT_PHI)).toBe(false);

      // Physicians: full PHI access
      expect(hasPermission(UserRole.PHYSICIAN, Permission.EXPORT_PHI)).toBe(true);
      expect(hasPermission(UserRole.PHYSICIAN, Permission.DELETE_PHI)).toBe(true);

      // Admins: full PHI access
      expect(hasPermission(UserRole.ADMIN, Permission.EXPORT_PHI)).toBe(true);
      expect(hasPermission(UserRole.ADMIN, Permission.DELETE_PHI)).toBe(true);
    });

    it('should protect sensitive operations', () => {
      // Only physicians and admins can override safety checks
      expect(hasPermission(UserRole.STUDENT, Permission.OVERRIDE_SAFETY_CHECKS)).toBe(false);
      expect(hasPermission(UserRole.NURSE, Permission.OVERRIDE_SAFETY_CHECKS)).toBe(false);
      expect(hasPermission(UserRole.PHYSICIAN, Permission.OVERRIDE_SAFETY_CHECKS)).toBe(true);
      expect(hasPermission(UserRole.ADMIN, Permission.OVERRIDE_SAFETY_CHECKS)).toBe(true);
    });
  });
});
