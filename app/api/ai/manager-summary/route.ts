import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST() {
  const tasks = await prisma.task.findMany({
    orderBy: [{ status: 'asc' }, { deadline: 'asc' }],
    include: { assignedTo: true }
  });

  const overdue = tasks.filter(task => task.status === 'OVERDUE');
  const flagged = await prisma.workLog.findMany({
    where: { aiVerification: { status: 'FLAGGED' } },
    include: { task: true, user: true }
  });
  const genuineCount = await prisma.workLog.count({
    where: { aiVerification: { status: 'GENUINE' } }
  });
  const warningCount = await prisma.workLog.count({
    where: { aiVerification: { status: 'WARNING' } }
  });

  const report = {
    summary: {
      totalTasks: tasks.length,
      overdueTasks: overdue.length,
      flaggedLogs: flagged.length,
      genuineLogs: genuineCount,
      warningLogs: warningCount
    },
    overdueTasks: overdue.map(task => ({
      id: task.id,
      title: task.title,
      assignee: task.assignedTo?.name || 'Unassigned',
      deadline: task.deadline
    })),
    flaggedLogs: flagged.map(log => ({
      id: log.id,
      taskTitle: log.task.title,
      userName: log.user.name,
      reason: log.aiVerification?.reasoning
    }))
  };

  return NextResponse.json(report);
}
