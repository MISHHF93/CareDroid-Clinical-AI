import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AnyPermission } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { DeviceLocationService } from './device-location.service';
import { FloorService } from './floor.service';
import { HOSPITAL_MAP_SOURCE } from './hospital-map.data';
import { HospitalMapFilter, HospitalMapRequestLike } from './hospital-map.types';
import { RoomService } from './room.service';

const HOSPITAL_MAP_VIEW_PERMISSIONS = [
  Permission.READ_PHI,
  Permission.VIEW_ANALYTICS,
  Permission.CONFIGURE_SYSTEM,
];

function envelope<T>(data: T, message: string) {
  return {
    success: true,
    ...HOSPITAL_MAP_SOURCE,
    generatedAt:
      typeof data === 'object' && data && 'generatedAt' in data
        ? (data.generatedAt as string)
        : new Date().toISOString(),
    message,
    data,
  };
}

@ApiTags('hospital-map')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
@AnyPermission(...HOSPITAL_MAP_VIEW_PERMISSIONS)
@Controller('hospital-map')
export class HospitalMapController {
  constructor(
    private readonly floorService: FloorService,
    private readonly roomService: RoomService,
    private readonly deviceLocationService: DeviceLocationService,
  ) {}

  @Get('floors')
  @ApiOperation({ summary: 'Get SVG-backed hospital floors, rooms, and beds' })
  getFloors(@Query('floorId') floorId?: string) {
    return envelope(
      this.floorService.getFloorPlan(floorId),
      'Backend demo hospital floor plan returned. Not a bedside alarm source.',
    );
  }

  @Get('rooms')
  @ApiOperation({ summary: 'Search hospital rooms and bed grid positions' })
  getRooms(
    @Query('floorId') floorId?: string,
    @Query('unitId') unitId?: string,
    @Query('q') q?: string,
  ) {
    return envelope(
      this.roomService.getRooms({ floorId, unitId, q }),
      'Backend demo room and bed grid returned with SVG coordinates.',
    );
  }

  @Get('devices')
  @ApiOperation({ summary: 'Search hospital device locations, alerts, and telemetry' })
  async getDevices(
    @Req() req: HospitalMapRequestLike,
    @Query('floorId') floorId?: string,
    @Query('unitId') unitId?: string,
    @Query('roomId') roomId?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('q') q?: string,
  ) {
    const filter: HospitalMapFilter = { floorId, unitId, roomId, status, type, q };
    return envelope(
      await this.deviceLocationService.getDeviceLocations(req, filter),
      'Backend demo hospital devices returned. Not a replacement for bedside alarms.',
    );
  }

  @Get('devices/:deviceId')
  @ApiOperation({ summary: 'Get one hospital device location detail' })
  async getDeviceDetail(@Param('deviceId') deviceId: string, @Req() req: HospitalMapRequestLike) {
    return envelope(
      await this.deviceLocationService.getDeviceDetail(deviceId, req),
      'Backend demo hospital device detail returned. Verify alarms in the source system.',
    );
  }

  @Get('search')
  @ApiOperation({ summary: 'Search rooms and devices on the hospital map' })
  async search(
    @Req() req: HospitalMapRequestLike,
    @Query('floorId') floorId?: string,
    @Query('room') room?: string,
    @Query('device') device?: string,
  ) {
    const rooms = this.roomService.getRooms({ floorId, q: room });
    const devices = await this.deviceLocationService.getDeviceLocations(req, {
      floorId,
      q: device,
    });

    return envelope(
      {
        generatedAt: devices.generatedAt,
        rooms: rooms.rooms,
        beds: rooms.beds,
        devices: devices.devices,
      },
      'Backend demo hospital map search returned.',
    );
  }
}
