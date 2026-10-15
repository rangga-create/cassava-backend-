import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  MANAGER = "MANAGER",
  FINANCE = "FINANCE",
  PROCUREMENT = "PROCUREMENT",
  WAREHOUSE = "WAREHOUSE",
  SALES = "SALES",
  LOGISTICS = "LOGISTICS",
  QUALITY_CONTROL = "QUALITY_CONTROL",
  VIEWER = "VIEWER",
}

export enum ProductCategory {
  FRESH = "FRESH",
  DRIED = "DRIED",
  CHIPS = "CHIPS",
  FLOUR = "FLOUR",
  TAPIOCA_STARCH = "TAPIOCA_STARCH",
  PELLETS = "PELLETS",
  FROZEN = "FROZEN",
  OTHER = "OTHER",
}

export enum ProductStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  DISCONTINUED = "DISCONTINUED",
}

export const ROLES_KEY = "roles";
export const Roles = (...roles: UserRole[]) => {
  return (target: object, key?: string, descriptor?: any) => {
    if (descriptor) {
      Reflect.defineMetadata(ROLES_KEY, roles, descriptor.value);
      return descriptor;
    }
    Reflect.defineMetadata(ROLES_KEY, roles, target);
    return target;
  };
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.role) {
      throw new ForbiddenException("No user role found");
    }

    const hasRole = requiredRoles.includes(user.role);

    if (!hasRole) {
      throw new ForbiddenException(
        `You don't have the required role. Required: ${requiredRoles.join(", ")}`,
      );
    }

    return true;
  }
}
