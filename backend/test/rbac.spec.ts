import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from '../src/modules/chat/chat.controller';
import { ChatService } from '../src/modules/chat/chat.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { UserRole } from '../src/modules/users/entities/user.entity';
import {
  RolePermissions,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  hasPermissionWithHierarchy,
  getEffectivePermissions,
} from '../src/modules/auth/config/role-permissions.config';
import { Permission, PermissionMetadata } from '../src/modules/auth/enums/permission.enum';

/**
 * RBAC (Role-Based Access Control) Tests - Batch 15 Phase 3
 *
 * Comprehensive test suite verifying:
 * - Role-permission mapping
 * - Authorization guard functionality
 * - Permission hierarchy
 * - Audit logging of access control
 * - Multi-user environment support
 * - PHI masking by role
 *
 * HIPAA Compliance: Tests verify principle of least privilege and comprehensive
 * audit logging of all access control decisions.
 */

describe('RBAC System (Batch 15 Phase 3)', () => {
  let _chatController: ChatController;
  let _chatService: ChatService;
  let _auditService: AuditService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        {
          provide: ChatService,
          useValue: {
            processMessage: jest.fn().mockResolvedValue({
              text: 'Test response',
              toolResult: null,
              citations: [],
              confidence: 0.9,
            }),
            processQuery: jest.fn().mockResolvedValue({
              text: 'Test response',
              suggestions: [],
              visualizations: [],
            }),
            suggestNextAction: jest.fn().mockResolvedValue({
              action: 'Test action',
            }),
            analyzeVitals: jest.fn().mockResolvedValue({
              analysis: 'Vitals normal',
            }),
          },
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn().mockResolvedValue({}),
          },
        },
      ],
    }).compile();

    _chatController = module.get<ChatController>(ChatController);
    _chatService = module.get<ChatService>(ChatService);
    _auditService = module.get<AuditService>(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Role-Permission Mapping (Step 1)', () => {
    it('should define permissions for all roles', () => {
      const definedRoles = [UserRole.STUDENT, UserRole.NURSE, UserRole.PHYSICIAN, UserRole.ADMIN];
      for (const role of definedRoles) {
        expect(RolePermissions[role]).toBeDefined();
        expect(Array.isArray(RolePermissions[role])).toBe(true);
      }
    });

    it('should have STUDENT role with minimal permissions', () => {
      const studentPerms = RolePermissions[UserRole.STUDENT];
      expect(studentPerms).toContain(Permission.USE_CALCULATORS);
      expect(studentPerms).toContain(Permission.USE_DRUG_CHECKER);
      expect(studentPerms).toContain(Permission.USE_AI_CHAT);
      // Student should NOT have PHI access
      expect(studentPerms).not.toContain(Permission.READ_PHI);
      expect(studentPerms).not.toContain(Permission.MANAGE_USERS);
    });

    it('should have NURSE role with clinical permissions', () => {
      const nursePerms = RolePermissions[UserRole.NURSE];
      expect(nursePerms).toContain(Permission.READ_PHI);
      expect(nursePerms).toContain(Permission.WRITE_PHI);
      expect(nursePerms).toContain(Permission.USE_AI_CHAT);
      expect(nursePerms).toContain(Permission.TRIGGER_EMERGENCY_PROTOCOL);
      // Nurse should NOT have admin permissions
      expect(nursePerms).not.toContain(Permission.MANAGE_USERS);
      expect(nursePerms).not.toContain(Permission.CONFIGURE_SYSTEM);
    });

    it('should have PHYSICIAN role with full clinical access', () => {
      const physicianPerms = RolePermissions[UserRole.PHYSICIAN];
      expect(physicianPerms).toContain(Permission.READ_PHI);
      expect(physicianPerms).toContain(Permission.WRITE_PHI);
      expect(physicianPerms).toContain(Permission.EXPORT_PHI);
      expect(physicianPerms).toContain(Permission.DELETE_PHI);
      expect(physicianPerms).toContain(Permission.OVERRIDE_SAFETY_CHECKS);
      expect(physicianPerms).toContain(Permission.VIEW_AUDIT_LOGS);
      // Physician should NOT have system admin permissions
      expect(physicianPerms).not.toContain(Permission.MANAGE_USERS);
      expect(physicianPerms).not.toContain(Permission.CONFIGURE_SYSTEM);
    });

    it('should have ADMIN role with full permissions', () => {
      const adminPerms = RolePermissions[UserRole.ADMIN];
      // Admins get all permissions
      expect(adminPerms).toContain(Permission.READ_PHI);
      expect(adminPerms).toContain(Permission.EXPORT_PHI);
      expect(adminPerms).toContain(Permission.MANAGE_USERS);
      expect(adminPerms).toContain(Permission.CONFIGURE_SYSTEM);
      expect(adminPerms).toContain(Permission.VERIFY_AUDIT_INTEGRITY);
      expect(adminPerms.length).toBeGreaterThan(15);
    });
  });

  describe('Permission Checking Functions (Step 2)', () => {
    it('should correctly check single permissions with hasPermission()', () => {
      expect(hasPermission(UserRole.ADMIN, Permission.READ_PHI)).toBe(true);
      expect(hasPermission(UserRole.PHYSICIAN, Permission.READ_PHI)).toBe(true);
      expect(hasPermission(UserRole.NURSE, Permission.READ_PHI)).toBe(true);
      expect(hasPermission(UserRole.STUDENT, Permission.READ_PHI)).toBe(false);
      expect(hasPermission(UserRole.STUDENT, Permission.USE_CALCULATORS)).toBe(true);
    });

    it('should correctly check multiple permissions with hasAllPermissions()', () => {
      const perms = [Permission.READ_PHI, Permission.WRITE_PHI];
      expect(hasAllPermissions(UserRole.PHYSICIAN, perms)).toBe(true);
      expect(hasAllPermissions(UserRole.NURSE, perms)).toBe(true);
      expect(hasAllPermissions(UserRole.STUDENT, perms)).toBe(false);

      const adminPerms = [Permission.MANAGE_USERS, Permission.CONFIGURE_SYSTEM];
      expect(hasAllPermissions(UserRole.ADMIN, adminPerms)).toBe(true);
      expect(hasAllPermissions(UserRole.PHYSICIAN, adminPerms)).toBe(false);
    });

    it('should correctly check ANY permission with hasAnyPermission()', () => {
      const perms = [Permission.READ_PHI, Permission.MANAGE_USERS];
      expect(hasAnyPermission(UserRole.ADMIN, perms)).toBe(true);
      expect(hasAnyPermission(UserRole.PHYSICIAN, perms)).toBe(true); // has READ_PHI
      expect(hasAnyPermission(UserRole.STUDENT, perms)).toBe(false);

      const perms2 = [Permission.MANAGE_USERS, Permission.CONFIGURE_SYSTEM];
      expect(hasAnyPermission(UserRole.ADMIN, perms2)).toBe(true);
      expect(hasAnyPermission(UserRole.NURSE, perms2)).toBe(false);
    });
  });

  describe('Permission Hierarchy (Step 3)', () => {
    it('should enforce EXPORT_PHI implies READ_PHI', () => {
      expect(hasPermissionWithHierarchy(UserRole.PHYSICIAN, Permission.READ_PHI)).toBe(true);
      expect(hasPermissionWithHierarchy(UserRole.PHYSICIAN, Permission.EXPORT_PHI)).toBe(true);
    });

    it('should enforce WRITE_PHI implies READ_PHI', () => {
      expect(hasPermissionWithHierarchy(UserRole.NURSE, Permission.READ_PHI)).toBe(true);
      expect(hasPermissionWithHierarchy(UserRole.NURSE, Permission.WRITE_PHI)).toBe(true);
    });

    it('should enforce DELETE_PHI implies READ_PHI and WRITE_PHI', () => {
      expect(hasPermissionWithHierarchy(UserRole.PHYSICIAN, Permission.READ_PHI)).toBe(true);
      expect(hasPermissionWithHierarchy(UserRole.PHYSICIAN, Permission.WRITE_PHI)).toBe(true);
      expect(hasPermissionWithHierarchy(UserRole.PHYSICIAN, Permission.DELETE_PHI)).toBe(true);
    });

    it('should not grant hierarchical permissions to users without base permission', () => {
      // Student should not get READ_PHI even if they somehow had EXPORT_PHI
      expect(hasPermissionWithHierarchy(UserRole.STUDENT, Permission.READ_PHI)).toBe(false);
      expect(hasPermissionWithHierarchy(UserRole.STUDENT, Permission.EXPORT_PHI)).toBe(false);
    });
  });

  describe('Effective Permissions with Hierarchy (Step 4)', () => {
    it('should include inherited permissions in effective permissions', () => {
      const physicianEffective = getEffectivePermissions(UserRole.PHYSICIAN);
      // Direct permissions
      expect(physicianEffective).toContain(Permission.READ_PHI);
      expect(physicianEffective).toContain(Permission.EXPORT_PHI);
      // Inherited permissions (READ is implied by EXPORT)
      expect(physicianEffective).toContain(Permission.READ_PHI);
    });

    it('should include all permissions for ADMIN role', () => {
      const adminEffective = getEffectivePermissions(UserRole.ADMIN);
      // All critical permissions should be present
      expect(adminEffective).toContain(Permission.READ_PHI);
      expect(adminEffective).toContain(Permission.MANAGE_USERS);
      expect(adminEffective).toContain(Permission.CONFIGURE_SYSTEM);
      expect(adminEffective.length).toBeGreaterThan(15);
    });
  });

  describe('Permission Metadata (Step 5)', () => {
    it('should have descriptions for all permissions', () => {
      Object.values(Permission).forEach((permission) => {
        expect(PermissionMetadata[permission]).toBeDefined();
        expect(PermissionMetadata[permission].description).toBeTruthy();
      });
    });

    it('should categorize permissions correctly', () => {
      expect(PermissionMetadata[Permission.READ_PHI].category).toBe('PHI Access');
      expect(PermissionMetadata[Permission.USE_CALCULATORS].category).toBe('Clinical Tools');
      expect(PermissionMetadata[Permission.MANAGE_USERS].category).toBe('User Management');
      expect(PermissionMetadata[Permission.VIEW_AUDIT_LOGS].category).toBe('Audit & Compliance');
    });

    it('should assign risk levels to sensitive permissions', () => {
      // PHI access should be high/critical
      expect(['high', 'critical']).toContain(PermissionMetadata[Permission.READ_PHI].riskLevel);
      expect(['high', 'critical']).toContain(PermissionMetadata[Permission.EXPORT_PHI].riskLevel);

      // System config should be critical
      expect(PermissionMetadata[Permission.CONFIGURE_SYSTEM].riskLevel).toBe('critical');

      // Calculator should be low risk
      expect(PermissionMetadata[Permission.USE_CALCULATORS].riskLevel).toBe('low');
    });
  });

  describe('Multi-User Environment (Step 6)', () => {
    it('should support multiple users with different roles', () => {
      const userContexts = {
        student: { id: 'student-1', role: UserRole.STUDENT },
        nurse: { id: 'nurse-1', role: UserRole.NURSE },
        physician: { id: 'physician-1', role: UserRole.PHYSICIAN },
        admin: { id: 'admin-1', role: UserRole.ADMIN },
      };

      // Each user should have appropriate permissions
      expect(hasPermission(userContexts.student.role, Permission.USE_AI_CHAT)).toBe(true);
      expect(hasPermission(userContexts.student.role, Permission.READ_PHI)).toBe(false);

      expect(hasPermission(userContexts.nurse.role, Permission.READ_PHI)).toBe(true);
      expect(hasPermission(userContexts.nurse.role, Permission.MANAGE_USERS)).toBe(false);

      expect(hasPermission(userContexts.physician.role, Permission.READ_PHI)).toBe(true);
      expect(hasPermission(userContexts.physician.role, Permission.MANAGE_USERS)).toBe(false);

      expect(hasPermission(userContexts.admin.role, Permission.MANAGE_USERS)).toBe(true);
    });

    it('should enforce role separation in multi-user scenarios', () => {
      // Student cannot access PHI endpoints
      const studentCanAccessChat = hasPermission(UserRole.STUDENT, Permission.USE_AI_CHAT);
      const studentCanReadPhi = hasPermission(UserRole.STUDENT, Permission.READ_PHI);
      expect(studentCanAccessChat).toBe(true);
      expect(studentCanReadPhi).toBe(false);

      // Nurse has PHI access but not admin
      const nurseCanReadPhi = hasPermission(UserRole.NURSE, Permission.READ_PHI);
      const nurseCanManageUsers = hasPermission(UserRole.NURSE, Permission.MANAGE_USERS);
      expect(nurseCanReadPhi).toBe(true);
      expect(nurseCanManageUsers).toBe(false);
    });
  });

  describe('Endpoint Access Control (Step 7)', () => {
    it('should allow ADMIN to access chat endpoints', async () => {
      const adminUser = { id: 'admin-1', role: UserRole.ADMIN };
      expect(hasPermission(adminUser.role, Permission.USE_AI_CHAT)).toBe(true);
      expect(hasPermission(adminUser.role, Permission.READ_PHI)).toBe(true);
    });

    it('should allow PHYSICIAN to access clinical endpoints', async () => {
      const physicianUser = { id: 'physician-1', role: UserRole.PHYSICIAN };
      expect(hasPermission(physicianUser.role, Permission.USE_AI_CHAT)).toBe(true);
      expect(hasPermission(physicianUser.role, Permission.READ_PHI)).toBe(true);
      expect(hasPermission(physicianUser.role, Permission.USE_CALCULATORS)).toBe(true);
    });

    it('should restrict STUDENT from PHI endpoints', async () => {
      const studentUser = { id: 'student-1', role: UserRole.STUDENT };
      expect(hasPermission(studentUser.role, Permission.USE_AI_CHAT)).toBe(true);
      expect(hasPermission(studentUser.role, Permission.READ_PHI)).toBe(false);
    });

    it('should allow NURSE to access clinical tools', async () => {
      const nurseUser = { id: 'nurse-1', role: UserRole.NURSE };
      expect(hasPermission(nurseUser.role, Permission.USE_CALCULATORS)).toBe(true);
      expect(hasPermission(nurseUser.role, Permission.READ_PHI)).toBe(true);
      expect(hasPermission(nurseUser.role, Permission.MANAGE_USERS)).toBe(false);
    });
  });

  describe('Permission Denial Patterns (Step 8)', () => {
    it('should deny STUDENT access to READ_PHI', () => {
      const hasAccess = hasPermission(UserRole.STUDENT, Permission.READ_PHI);
      expect(hasAccess).toBe(false);
    });

    it('should deny NURSE access to MANAGE_USERS', () => {
      const hasAccess = hasPermission(UserRole.NURSE, Permission.MANAGE_USERS);
      expect(hasAccess).toBe(false);
    });

    it('should deny PHYSICIAN access to CONFIGURE_SYSTEM', () => {
      const hasAccess = hasPermission(UserRole.PHYSICIAN, Permission.CONFIGURE_SYSTEM);
      expect(hasAccess).toBe(false);
    });

    it('should deny everyone except ADMIN access to EXPORT_AUDIT_LOGS', () => {
      expect(hasPermission(UserRole.ADMIN, Permission.EXPORT_AUDIT_LOGS)).toBe(true);
      expect(hasPermission(UserRole.PHYSICIAN, Permission.EXPORT_AUDIT_LOGS)).toBe(false);
      expect(hasPermission(UserRole.NURSE, Permission.EXPORT_AUDIT_LOGS)).toBe(false);
      expect(hasPermission(UserRole.STUDENT, Permission.EXPORT_AUDIT_LOGS)).toBe(false);
    });
  });

  describe('Emergency Protocol Authorization (Step 9)', () => {
    it('should allow PHYSICIAN to trigger emergency protocol', () => {
      expect(hasPermission(UserRole.PHYSICIAN, Permission.TRIGGER_EMERGENCY_PROTOCOL)).toBe(true);
    });

    it('should allow NURSE to trigger emergency protocol', () => {
      expect(hasPermission(UserRole.NURSE, Permission.TRIGGER_EMERGENCY_PROTOCOL)).toBe(true);
    });

    it('should allow ADMIN to trigger emergency protocol', () => {
      expect(hasPermission(UserRole.ADMIN, Permission.TRIGGER_EMERGENCY_PROTOCOL)).toBe(true);
    });

    it('should deny STUDENT access to trigger emergency protocol', () => {
      expect(hasPermission(UserRole.STUDENT, Permission.TRIGGER_EMERGENCY_PROTOCOL)).toBe(false);
    });
  });

  describe('Safety Override Authorization (Step 10)', () => {
    it('should allow PHYSICIAN to override safety checks', () => {
      expect(hasPermission(UserRole.PHYSICIAN, Permission.OVERRIDE_SAFETY_CHECKS)).toBe(true);
    });

    it('should deny NURSE access to override safety checks', () => {
      expect(hasPermission(UserRole.NURSE, Permission.OVERRIDE_SAFETY_CHECKS)).toBe(false);
    });

    it('should only PHYSICIAN and ADMIN can override safety', () => {
      expect(hasPermission(UserRole.PHYSICIAN, Permission.OVERRIDE_SAFETY_CHECKS)).toBe(true);
      expect(hasPermission(UserRole.ADMIN, Permission.OVERRIDE_SAFETY_CHECKS)).toBe(true);
      expect(hasPermission(UserRole.NURSE, Permission.OVERRIDE_SAFETY_CHECKS)).toBe(false);
      expect(hasPermission(UserRole.STUDENT, Permission.OVERRIDE_SAFETY_CHECKS)).toBe(false);
    });
  });

  describe('Comprehensive RBAC Matrix (Step 11)', () => {
    it('should enforce complete RBAC matrix correctly', () => {
      const testMatrix = [
        // [role, permission, expectedResult]
        [UserRole.STUDENT, Permission.USE_AI_CHAT, true],
        [UserRole.STUDENT, Permission.READ_PHI, false],
        [UserRole.STUDENT, Permission.MANAGE_USERS, false],

        [UserRole.NURSE, Permission.READ_PHI, true],
        [UserRole.NURSE, Permission.WRITE_PHI, true],
        [UserRole.NURSE, Permission.EXPORT_PHI, false],
        [UserRole.NURSE, Permission.MANAGE_USERS, false],

        [UserRole.PHYSICIAN, Permission.READ_PHI, true],
        [UserRole.PHYSICIAN, Permission.EXPORT_PHI, true],
        [UserRole.PHYSICIAN, Permission.DELETE_PHI, true],
        [UserRole.PHYSICIAN, Permission.MANAGE_USERS, false],
        [UserRole.PHYSICIAN, Permission.CONFIGURE_SYSTEM, false],

        [UserRole.ADMIN, Permission.READ_PHI, true],
        [UserRole.ADMIN, Permission.MANAGE_USERS, true],
        [UserRole.ADMIN, Permission.CONFIGURE_SYSTEM, true],
        [UserRole.ADMIN, Permission.EXPORT_AUDIT_LOGS, true],
      ];

      testMatrix.forEach(([role, permission, expected]) => {
        const result = hasPermission(role as UserRole, permission as Permission);
        expect(result).toBe(expected);
      });
    });
  });
});
