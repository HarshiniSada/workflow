import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyWorkLog } from '@/lib/ai';

export async function POST(request: Request) {
  const body = await request.json();
  const { taskId, userId, logText, rawNotes } = body;

  if (!taskId || !userId || !logText) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const verification = await verifyWorkLog(task, logText, rawNotes);

  const workLog = await prisma.workLog.create({
    data: {
      taskId,
      userId,
      entryText: logText,
      rawNotes,
      aiVerification: {
        create: {
          status: verification.status,
          confidenceScore: verification.confidenceScore,
          reasoning: verification.reasoning,
          provider: 'LOCAL'
        }
      }
    },
    include: { aiVerification: true }
  });

  await prisma.auditLog.create({
    data: {
      organizationId: task.organizationId,
      taskId: task.id,
      userId,
      action: 'WORK_LOG_SUBMITTED',
      details: `Work log submitted with AI status ${verification.status}`
    }
  });

  if (verification.status === 'GENUINE') {
    await prisma.task.update({
      where: { id: task.id },
      data: { status: 'COMPLETED' }
    });
  }

  return NextResponse.json(workLog, { status: 201 });
}
