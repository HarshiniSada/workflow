import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  const body = await request.json();
  const { taskId, roughNotes } = body;

  if (!taskId || !roughNotes) {
    return NextResponse.json({ error: 'TaskId and roughNotes are required' }, { status: 400 });
  }

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const polishedText = `Worked on task '${task.title}'. ${roughNotes.trim()}. Verified implementation and prepared next steps for follow-up.`;
  return NextResponse.json({ polishedText });
}
