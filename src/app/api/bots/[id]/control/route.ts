import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { exec } from 'child_process';
import { spawn } from 'child_process';

// In-memory process tracker
const processes: Map<string, ReturnType<typeof spawn>> = new Map();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action } = body; // start, stop, restart

    const bot = await db.bot.findUnique({ where: { id } });
    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    switch (action) {
      case 'start': {
        if (bot.status === 'running') {
          return NextResponse.json({ error: 'Bot is already running' }, { status: 400 });
        }

        try {
          const args = bot.args ? bot.args.split(' ').filter(Boolean) : [];
          const envVars = JSON.parse(bot.envVars || '{}');
          const proc = spawn(bot.command, [bot.script, ...args], {
            env: { ...process.env, ...envVars },
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: '/home/z/my-project',
          });

          const pid = String(proc.pid);
          processes.set(id, proc);

          proc.stdout?.on('data', (data: Buffer) => {
            const lines = data.toString().split('\n').filter(Boolean);
            lines.forEach(async (line) => {
              await db.botLog.create({
                data: {
                  botId: id,
                  level: 'info',
                  message: line,
                  source: 'stdout',
                },
              });
            });
          });

          proc.stderr?.on('data', (data: Buffer) => {
            const lines = data.toString().split('\n').filter(Boolean);
            lines.forEach(async (line) => {
              await db.botLog.create({
                data: {
                  botId: id,
                  level: 'error',
                  message: line,
                  source: 'stderr',
                },
              });
            });
          });

          proc.on('close', async (code) => {
            await db.bot.update({
              where: { id },
              data: {
                status: code === 0 ? 'stopped' : 'error',
                pid: null,
                lastStopped: new Date(),
              },
            });
            await db.botLog.create({
              data: {
                botId: id,
                level: code === 0 ? 'info' : 'error',
                message: `Process exited with code ${code}`,
                source: 'system',
              },
            });
            processes.delete(id);

            // Auto restart if enabled
            if (bot.autoRestart && code !== 0) {
              const updatedBot = await db.bot.findUnique({ where: { id } });
              if (updatedBot && updatedBot.autoRestart) {
                await db.bot.update({
                  where: { id },
                  data: { restartCount: { increment: 1 } },
                });
              }
            }
          });

          proc.on('error', async (err) => {
            await db.bot.update({
              where: { id },
              data: { status: 'error', pid: null },
            });
            await db.botLog.create({
              data: {
                botId: id,
                level: 'error',
                message: `Process error: ${err.message}`,
                source: 'system',
              },
            });
            processes.delete(id);
          });

          await db.bot.update({
            where: { id },
            data: {
              status: 'running',
              pid,
              lastStarted: new Date(),
            },
          });

          await db.botLog.create({
            data: {
              botId: id,
              level: 'info',
              message: `Bot started with PID ${pid}`,
              source: 'system',
            },
          });

          return NextResponse.json({ success: true, pid });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          await db.botLog.create({
            data: {
              botId: id,
              level: 'error',
              message: `Failed to start: ${msg}`,
              source: 'system',
            },
          });
          return NextResponse.json({ error: msg }, { status: 500 });
        }
      }

      case 'stop': {
        const proc = processes.get(id);
        if (proc) {
          proc.kill('SIGTERM');
          processes.delete(id);
        }

        await db.bot.update({
          where: { id },
          data: { status: 'stopped', pid: null, lastStopped: new Date() },
        });

        await db.botLog.create({
          data: {
            botId: id,
            level: 'info',
            message: 'Bot stopped by user',
            source: 'system',
          },
        });

        return NextResponse.json({ success: true });
      }

      case 'restart': {
        const proc = processes.get(id);
        if (proc) {
          proc.kill('SIGTERM');
          processes.delete(id);
        }

        await db.bot.update({
          where: { id },
          data: { status: 'stopped', pid: null },
        });

        await db.botLog.create({
          data: {
            botId: id,
            level: 'info',
            message: 'Bot restarting...',
            source: 'system',
          },
        });

        // Start again after a brief delay
        setTimeout(async () => {
          try {
            const updatedBot = await db.bot.findUnique({ where: { id } });
            if (updatedBot && updatedBot.status !== 'running') {
              const args = updatedBot.args ? updatedBot.args.split(' ').filter(Boolean) : [];
              const envVars = JSON.parse(updatedBot.envVars || '{}');
              const newProc = spawn(updatedBot.command, [updatedBot.script, ...args], {
                env: { ...process.env, ...envVars },
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: '/home/z/my-project',
              });

              const pid = String(newProc.pid);
              processes.set(id, newProc);

              newProc.stdout?.on('data', (data: Buffer) => {
                const lines = data.toString().split('\n').filter(Boolean);
                lines.forEach(async (line) => {
                  await db.botLog.create({
                    data: { botId: id, level: 'info', message: line, source: 'stdout' },
                  });
                });
              });

              newProc.stderr?.on('data', (data: Buffer) => {
                const lines = data.toString().split('\n').filter(Boolean);
                lines.forEach(async (line) => {
                  await db.botLog.create({
                    data: { botId: id, level: 'error', message: line, source: 'stderr' },
                  });
                });
              });

              newProc.on('close', async (code) => {
                await db.bot.update({
                  where: { id },
                  data: { status: code === 0 ? 'stopped' : 'error', pid: null, lastStopped: new Date() },
                });
                processes.delete(id);
              });

              newProc.on('error', async (err) => {
                await db.bot.update({ where: { id }, data: { status: 'error', pid: null } });
                processes.delete(id);
              });

              await db.bot.update({
                where: { id },
                data: { status: 'running', pid, lastStarted: new Date() },
              });

              await db.botLog.create({
                data: { botId: id, level: 'info', message: `Bot restarted with PID ${pid}`, source: 'system' },
              });
            }
          } catch {
            // ignore restart errors
          }
        }, 1000);

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error controlling bot:', error);
    return NextResponse.json({ error: 'Failed to control bot' }, { status: 500 });
  }
}
