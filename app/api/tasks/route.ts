import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const tasks = await prisma.task.findMany({
    orderBy: { deadline: 'asc' },
    include: { assignedTo: true }
  });
  return NextResponse.json(tasks);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { title, description, assignedToId, priority, deadline, createdById } = body;

  if (!title || !description || !createdById || !deadline) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const task = await prisma.task.create({
    data: {
      title,
      description,
      priority: priority || 'MEDIUM',
      deadline: new Date(deadline),
      assignedToId: assignedToId || null,
      createdById,
      organizationId: body.organizationId
    }
  });

  await prisma.auditLog.create({
    data: {
      organizationId: body.organizationId,
      taskId: task.id,
      userId: createdById,
      action: 'TASK_CREATED',
      details: `Task '${title}' created and assigned to ${assignedToId || 'unassigned'}`
    }
  });

  return NextResponse.json(task, { status: 201 });
}
