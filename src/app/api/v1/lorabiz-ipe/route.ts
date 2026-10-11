import { LB } from '@/lib/services/lorabiz-async';
import { handleSubmit, handleStatus } from '@/lib/services/lorabiz-routes';

export const POST = (req: Request) => handleSubmit(LB.ipe, req);
export const GET = (req: Request) => handleStatus(LB.ipe, req);
