import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyWorkLog } from '@/lib/ai';

export async function POST(request: Request) {
  const body = await request.json();
  const { taskId, logText, rawNotes } = body;

  if (!taskId || !logText) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const result = await verifyWorkLog(task, logText, rawNotes);
  return NextResponse.json(result);
}
