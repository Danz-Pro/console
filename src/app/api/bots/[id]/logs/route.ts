import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, unknown> = { botId: id };
    if (level) {
      where.level = level;
    }

    const logs = await db.botLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await db.botLog.count({ where });

    return NextResponse.json({ logs, total });
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.botLog.deleteMany({ where: { botId: id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing logs:', error);
    return NextResponse.json({ error: 'Failed to clear logs' }, { status: 500 });
  }
}
