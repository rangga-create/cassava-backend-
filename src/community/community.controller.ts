import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { AuthGuard } from "../common/guards/auth.guard";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { CommunityService } from "./community.service";
import { CreateGroupDto } from "./dto/create-group.dto";
import { UpdateGroupDto } from "./dto/update-group.dto";
import { SendMessageDto } from "./dto/send-message.dto";
import { CreateReportDto } from "./dto/report.dto";
import { UpdateMemberRoleDto, InviteMemberDto } from "./dto/group-member.dto";
import { PaginationDto } from "../common/dto/pagination.dto";

@ApiTags("Community")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("community")
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  // ==================== GROUPS ====================

  @Post("groups")
  @ApiOperation({ summary: "Create a new group" })
  async createGroup(@Body() dto: CreateGroupDto, @CurrentUser() user: AuthUser) {
    return this.communityService.createGroup(dto, user);
  }

  @Get("groups")
  @ApiOperation({ summary: "List all groups" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "sortBy", required: false, type: String })
  @ApiQuery({ name: "sortOrder", required: false, enum: ["asc", "desc"] })
  async getGroups(@Query() query: PaginationDto, @CurrentUser() user: AuthUser) {
    return this.communityService.getGroups(query, user);
  }

  @Get("groups/:id")
  @ApiOperation({ summary: "Get group details" })
  async getGroup(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.communityService.getGroup(id, user);
  }

  @Put("groups/:id")
  @ApiOperation({ summary: "Update group" })
  async updateGroup(
    @Param("id") id: string,
    @Body() dto: UpdateGroupDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.communityService.updateGroup(id, dto, user);
  }

  @Delete("groups/:id")
  @ApiOperation({ summary: "Delete group (owner only)" })
  async deleteGroup(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.communityService.deleteGroup(id, user);
  }

  // ==================== MEMBERSHIP ====================

  @Post("groups/:id/join")
  @ApiOperation({ summary: "Join a group" })
  async joinGroup(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.communityService.joinGroup(id, user);
  }

  @Post("groups/:id/leave")
  @ApiOperation({ summary: "Leave a group" })
  async leaveGroup(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.communityService.leaveGroup(id, user);
  }

  @Get("groups/:id/members")
  @ApiOperation({ summary: "Get group members" })
  async getMembers(@Param("id") id: string, @CurrentUser() user: AuthUser, @Query() query: PaginationDto) {
    return this.communityService.getMembers(id, user, query);
  }

  @Put("groups/:id/members/:userId/role")
  @ApiOperation({ summary: "Update member role (admin/owner)" })
  async updateMemberRole(
    @Param("id") groupId: string,
    @Param("userId") targetUserId: string,
    @Body() dto: UpdateMemberRoleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.communityService.updateMemberRole(groupId, targetUserId, dto, user);
  }

  @Delete("groups/:id/members/:userId")
  @ApiOperation({ summary: "Remove member (admin/owner)" })
  async removeMember(
    @Param("id") groupId: string,
    @Param("userId") targetUserId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.communityService.removeMember(groupId, targetUserId, user);
  }

  @Post("groups/:id/invite")
  @ApiOperation({ summary: "Invite member (admin/owner)" })
  async inviteMember(
    @Param("id") groupId: string,
    @Body() dto: InviteMemberDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.communityService.inviteMember(groupId, dto, user);
  }

  // ==================== MESSAGES ====================

  @Post("groups/:id/messages")
  @ApiOperation({ summary: "Send message to group" })
  async sendMessage(
    @Param("id") groupId: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.communityService.sendMessage(groupId, dto, user);
  }

  @Get("groups/:id/messages")
  @ApiOperation({ summary: "Get group messages" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "sortBy", required: false, type: String })
  @ApiQuery({ name: "sortOrder", required: false, enum: ["asc", "desc"] })
  async getMessages(
    @Param("id") groupId: string,
    @CurrentUser() user: AuthUser,
    @Query() query: PaginationDto,
  ) {
    return this.communityService.getMessages(groupId, user, query);
  }

  @Delete("messages/:messageId")
  @ApiOperation({ summary: "Delete message (sender or admin)" })
  async deleteMessage(@Param("messageId") messageId: string, @CurrentUser() user: AuthUser) {
    return this.communityService.deleteMessage(messageId, user);
  }

  // ==================== MODERATION ====================

  @Post("reports")
  @ApiOperation({ summary: "Create a report" })
  async createReport(@Body() dto: CreateReportDto, @CurrentUser() user: AuthUser) {
    return this.communityService.createReport(dto, user);
  }

  @Get("groups/:id/reports")
  @ApiOperation({ summary: "Get group reports (admin only)" })
  async getReports(
    @Param("id") groupId: string,
    @CurrentUser() user: AuthUser,
    @Query() query: PaginationDto,
  ) {
    return this.communityService.getReports(groupId, user, query);
  }

  @Put("reports/:id/review")
  @ApiOperation({ summary: "Review a report (admin/moderator)" })
  async reviewReport(
    @Param("id") reportId: string,
    @Body() dto: any,
    @CurrentUser() user: AuthUser,
  ) {
    return this.communityService.reviewReport(reportId, dto, user);
  }

  @Get("groups/:id/moderation-history")
  @ApiOperation({ summary: "Get moderation history (admin only)" })
  async getModerationHistory(@Param("id") groupId: string, @CurrentUser() user: AuthUser) {
    return this.communityService.getModerationHistory(groupId, user);
  }
}