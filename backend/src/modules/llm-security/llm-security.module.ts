import { Body, Controller, Get, Injectable, Module, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { PlatformGovernanceModule, PlatformGovernanceService } from '../platform-governance';

@Injectable()
export class PromptInjectionDetectionService {
  evaluate(prompt = '') {
    const patterns = [
      /ignore (all )?(previous|prior) instructions/i,
      /reveal (system|developer) prompt/i,
      /malicious context|context injection/i,
      /exfiltrate|bypass safety/i,
    ];
    return {
      blocked: patterns.some((pattern) => pattern.test(prompt)),
      warnings: patterns.filter((pattern) => pattern.test(prompt)).map((pattern) => pattern.source),
    };
  }
}

@Injectable()
export class PHIProtectionService {
  inspect(text = '') {
    const hasPotentialPhi = /\b(MRN|SSN|DOB|patient id|medical record)\b/i.test(text);
    return { hasPotentialPhi, action: hasPotentialPhi ? 'minimize_or_redact' : 'allow' };
  }
}

@Injectable()
export class OutputValidationService {
  validate(output = '') {
    const unsafeFinalization = /final diagnosis|prescribe|place order|auto.?sign/i.test(output);
    return {
      valid: !unsafeFinalization,
      blockedReason: unsafeFinalization ? 'unsafe_autonomous_clinical_action' : null,
    };
  }
}

@Injectable()
export class ToolPermissionService {
  inspect(toolCalls: unknown[] = []) {
    return {
      excessiveToolChaining: toolCalls.length > 5,
      unsafeToolExecution: toolCalls.some((call: any) => call?.sideEffecting && !call?.approved),
    };
  }
}

@Injectable()
export class RateLimitService {
  private readonly counters = new Map<string, number>();

  check(subject = 'anonymous') {
    const next = (this.counters.get(subject) || 0) + 1;
    this.counters.set(subject, next);
    return { subject, count: next, warning: next > 50 };
  }
}

@Controller('security')
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
export class LlmSecurityController {
  constructor(
    private readonly promptInjection: PromptInjectionDetectionService,
    private readonly phiProtection: PHIProtectionService,
    private readonly outputValidation: OutputValidationService,
    private readonly toolPermission: ToolPermissionService,
    private readonly rateLimit: RateLimitService,
    private readonly platformGovernance: PlatformGovernanceService,
  ) {}

  @Get('summary')
  @Permissions(Permission.VIEW_AI_SECURITY)
  async getSummary() {
    const observability = await this.platformGovernance.recentObservability();
    return {
      status: 'guarded',
      blockedPrompts:
        observability.events?.filter((event: any) => event.eventType?.includes('blocked')).length ||
        0,
      securityEvents: observability.events || [],
      warnings: [
        'Prompt injection',
        'PHI leakage',
        'unsafe tool execution',
        'malicious context injection',
        'excessive tool chaining',
      ],
      failedToolCalls:
        observability.events?.filter((event: any) => event.status === 'failed').length || 0,
    };
  }

  @Post('evaluate')
  @Permissions(Permission.VIEW_AI_SECURITY)
  async evaluate(@Body() body: Record<string, any>) {
    const prompt = String(body.prompt || '');
    const output = String(body.output || '');
    const toolCalls = Array.isArray(body.toolCalls) ? body.toolCalls : [];
    const gate = await this.platformGovernance.evaluateGate({
      runId: body.runId,
      capabilityId: body.capabilityId || 'ai-security',
      patientId: body.patientId,
      phiAccessed: Boolean(body.phiAccessed),
      prompt,
      action: 'llm-security/evaluate',
    });
    return {
      gate,
      promptInjection: this.promptInjection.evaluate(prompt),
      phiProtection: this.phiProtection.inspect(`${prompt} ${output}`),
      outputValidation: this.outputValidation.validate(output),
      toolPermission: this.toolPermission.inspect(toolCalls),
      rateLimit: this.rateLimit.check(String(body.userId || 'anonymous')),
    };
  }
}

@Module({
  imports: [PlatformGovernanceModule],
  controllers: [LlmSecurityController],
  providers: [
    PromptInjectionDetectionService,
    PHIProtectionService,
    OutputValidationService,
    ToolPermissionService,
    RateLimitService,
  ],
  exports: [
    PromptInjectionDetectionService,
    PHIProtectionService,
    OutputValidationService,
    ToolPermissionService,
    RateLimitService,
  ],
})
export class LlmSecurityModule {}
