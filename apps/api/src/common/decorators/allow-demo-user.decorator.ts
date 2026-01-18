import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to allow demo users to access specific endpoints
 * By default, DemoUserGuard blocks demo users
 */
export const AllowDemoUser = () => SetMetadata('allowDemoUser', true);
