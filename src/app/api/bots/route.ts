import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const bots = await db.bot.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { logs: true } },
      },
    });
    return NextResponse.json(bots);
  } catch (error) {
    console.error('Error fetching bots:', error);
    return NextResponse.json({ error: 'Failed to fetch bots' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, script, command, args, envVars, autoRestart } = body;

    if (!name || !script) {
      return NextResponse.json({ error: 'Name and script are required' }, { status: 400 });
    }

    const bot = await db.bot.create({
      data: {
        name,
        description: description || null,
        script,
        command: command || 'node',
        args: args || '',
        envVars: envVars || '{}',
        autoRestart: autoRestart || false,
      },
    });

    return NextResponse.json(bot, { status: 201 });
  } catch (error) {
    console.error('Error creating bot:', error);
    return NextResponse.json({ error: 'Failed to create bot' }, { status: 500 });
  }
}
