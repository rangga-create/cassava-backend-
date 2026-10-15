import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface AuthUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  role?: string;
  companyId?: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthUser;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
