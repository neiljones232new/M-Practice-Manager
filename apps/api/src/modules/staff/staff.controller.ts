import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

@ApiTags('Staff')
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  @ApiOperation({ summary: 'Create staff member' })
  create(@Body() dto: CreateStaffDto) {
    return this.staffService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List staff members' })
  findAll() {
    return this.staffService.findAll();
  }

  @Get(':ref')
  @ApiOperation({ summary: 'Get staff member by ref' })
  findOne(@Param('ref') ref: string) {
    return this.staffService.findOne(ref);
  }

  @Put(':ref')
  @ApiOperation({ summary: 'Update staff member' })
  update(@Param('ref') ref: string, @Body() dto: UpdateStaffDto) {
    return this.staffService.update(ref, dto);
  }

  @Delete(':ref')
  @ApiOperation({ summary: 'Delete staff member' })
  remove(@Param('ref') ref: string) {
    return this.staffService.remove(ref);
  }
}
