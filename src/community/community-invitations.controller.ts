import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "../common/guards/auth.guard";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { CommunityService } from "./community.service";

@ApiTags("Community invitations")
@Controller("community")
export class CommunityInvitationsController {
  constructor(private readonly communityService: CommunityService) {}

  @Post("groups/:id/invitations")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a shareable group invitation link" })
  createInvitation(@Param("id") groupId: string, @CurrentUser() user: AuthUser) {
    return this.communityService.createGroupInvitation(groupId, user);
  }

  @Get("invitations/:token")
  @ApiOperation({ summary: "Preview a group invitation" })
  getInvitation(@Param("token") token: string) {
    return this.communityService.getGroupInvitation(token);
  }

  @Post("invitations/:token/join")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Join a group using an invitation link" })
  joinInvitation(@Param("token") token: string, @CurrentUser() user: AuthUser) {
    return this.communityService.joinGroupByInvitation(token, user);
  }
}
