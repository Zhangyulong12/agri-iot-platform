import { SetMetadata } from '@nestjs/common';

export const PUBLIC_ROUTE = 'flowdesk.public';
export const Public = () => SetMetadata(PUBLIC_ROUTE, true);
