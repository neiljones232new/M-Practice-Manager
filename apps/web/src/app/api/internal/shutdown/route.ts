import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST(req: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_MDJ_SHUTDOWN_SECRET || process.env.MDJ_SHUTDOWN_SECRET;
  const header = req.headers.get('x-mdj-shutdown');

  if (configured && header !== configured) {
    return NextResponse.json({ message: 'unauthorized' }, { status: 401 });
  }

  // Delay slightly so the response can be returned before exiting
  setTimeout(() => {
    // eslint-disable-next-line no-process-exit
    process.exit(0);
  }, 300);

  return NextResponse.json({ message: 'shutting down' });
}
