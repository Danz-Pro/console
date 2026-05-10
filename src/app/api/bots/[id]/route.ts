import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bot = await db.bot.findUnique({
      where: { id },
      include: { logs: { orderBy: { createdAt: 'desc' }, take: 50 } },
    });
    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }
    return NextResponse.json(bot);
  } catch (error) {
    console.error('Error fetching bot:', error);
    return NextResponse.json({ error: 'Failed to fetch bot' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const bot = await db.bot.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        script: body.script,
        command: body.command,
        args: body.args,
        envVars: body.envVars,
        autoRestart: body.autoRestart,
      },
    });

    return NextResponse.json(bot);
  } catch (error) {
    console.error('Error updating bot:', error);
    return NextResponse.json({ error: 'Failed to update bot' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.bot.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting bot:', error);
    return NextResponse.json({ error: 'Failed to delete bot' }, { status: 500 });
  }
}
