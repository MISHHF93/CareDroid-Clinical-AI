import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantContext as TenantContextValue } from './tenant-context.types';

export const TenantContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContextValue | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenantContext;
  },
);

export const TenantContextParam = TenantContext;
