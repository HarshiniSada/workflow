import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  const { description } = body;

  if (!description) {
    return NextResponse.json({ error: 'Description is required' }, { status: 400 });
  }

  const clean = description.toLowerCase();
  let priority = 'MEDIUM';
  let deadlineDays = 5;

  if (clean.includes('urgent') || clean.includes('prod') || clean.includes('crash') || clean.includes('critical') || clean.includes('fix')) {
    priority = 'HIGH';
    deadlineDays = 2;
  } else if (clean.includes('refactor') || clean.includes('design') || clean.includes('documentation')) {
    priority = 'LOW';
    deadlineDays = 8;
  }

  return NextResponse.json({ priority, deadlineDays });
}
