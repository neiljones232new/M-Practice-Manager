import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to extract user information from the request
 * Usage: @GetUser() user or @GetUser('id') userId
 */
export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return undefined;
    }

    return data ? user[data] : user;
  },
);
