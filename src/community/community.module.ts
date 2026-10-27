import { Module } from "@nestjs/common";
import { CommunityController } from "./community.controller";
import { CommunityInvitationsController } from "./community-invitations.controller";
import { CommunityService } from "./community.service";
import { CommunityGateway } from "./community.gateway";

@Module({
  controllers: [CommunityController, CommunityInvitationsController],
  providers: [CommunityService, CommunityGateway],
  exports: [CommunityService, CommunityGateway],
})
export class CommunityModule {}