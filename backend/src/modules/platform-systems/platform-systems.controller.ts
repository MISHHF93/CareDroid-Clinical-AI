import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import {
  EmergencyPatientService,
  ReferralService,
  EMSIntakeService,
} from '../emergency-os/emergency-os.services';

@ApiTags('platform-systems')
@ApiBearerAuth()
@Controller()
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
export class PlatformSystemsController {
  constructor(
    private readonly emergencyPatientService: EmergencyPatientService,
    private readonly referralService: ReferralService,
    private readonly emsIntakeService: EMSIntakeService,
  ) {}

  @Get('patients')
  @Permissions(Permission.READ_PHI)
  @ApiOperation({ summary: 'Get CareDroid patients for the active tenant workspace' })
  getEmergencyPatients() {
    return this.emergencyPatientService.listPatients();
  }

  @Get('patients/:patientId')
  @Permissions(Permission.READ_PHI)
  @ApiOperation({ summary: 'Get one CareDroid patient by id' })
  getEmergencyPatient(@Param('patientId') patientId: string) {
    const patient = this.emergencyPatientService.getPatient(patientId);
    if (!patient) {
      throw new NotFoundException(`Emergency patient ${patientId} was not found`);
    }
    return patient;
  }

  @Post('patients')
  @Permissions(Permission.READ_PHI, Permission.WRITE_PHI)
  @ApiOperation({ summary: 'Create an CareDroid intake patient' })
  createEmergencyPatient(@Body() body: Record<string, any>) {
    if (!body?.chiefComplaint && !body?.complaint) {
      throw new BadRequestException('chiefComplaint or complaint is required');
    }
    return this.emergencyPatientService.createPatient({
      ...body,
      chiefComplaint: body.chiefComplaint || body.complaint,
    });
  }

  @Patch('patients/:patientId')
  @Permissions(Permission.READ_PHI, Permission.WRITE_PHI)
  @ApiOperation({ summary: 'Patch an CareDroid patient' })
  updateEmergencyPatient(@Param('patientId') patientId: string, @Body() body: Record<string, any>) {
    try {
      return this.emergencyPatientService.updatePatient(patientId, body);
    } catch {
      throw new NotFoundException(`Emergency patient ${patientId} was not found`);
    }
  }

  @Get('staff')
  @Permissions(Permission.READ_PHI)
  @ApiOperation({ summary: 'Get CareDroid staff roster' })
  getEmergencyStaff() {
    return this.emergencyPatientService.listStaff();
  }

  @Get('rooms')
  @Permissions(Permission.READ_PHI)
  @ApiOperation({ summary: 'Get CareDroid room grid' })
  getEmergencyRooms() {
    return this.emergencyPatientService.listRooms();
  }

  @Get('shift')
  @Permissions(Permission.READ_PHI)
  @ApiOperation({ summary: 'Get active CareDroid shift' })
  getEmergencyShift() {
    const staff = this.emergencyPatientService.listStaff();
    const onShift = staff.filter((member) => member.active);
    return {
      id: 'active-shift',
      name: 'Active ED Shift',
      status: onShift.length ? 'Active' : 'Unstaffed',
      chargeStaffId: onShift[0]?.id ?? null,
      staffIds: onShift.map((member) => member.id),
      handoffNotes: [],
    };
  }

  @Get('ems')
  @Permissions(Permission.READ_PHI)
  @ApiOperation({ summary: 'Get CareDroid EMS unit and arrival state' })
  getEmergencyEms() {
    return this.emsIntakeService.getEMSIntake();
  }

  @Get('referrals')
  @Permissions(Permission.READ_PHI)
  @ApiOperation({ summary: 'Get CareDroid referrals' })
  getEmergencyReferrals() {
    return this.referralService.getReferrals();
  }

  @Post('referrals')
  @Permissions(Permission.READ_PHI, Permission.WRITE_PHI)
  @ApiOperation({ summary: 'Create an CareDroid referral' })
  createEmergencyReferral(@Body() body: Record<string, any>) {
    if (!body?.patientId) {
      throw new BadRequestException('patientId is required');
    }
    if (!this.emergencyPatientService.getPatient(body.patientId)) {
      throw new NotFoundException(`Emergency patient ${body.patientId} was not found`);
    }
    return this.referralService.createReferral(body).data.referral;
  }
}
