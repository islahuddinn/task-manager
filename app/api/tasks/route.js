import connectDB from '../../../lib/mongoose';
import Task from '../../../lib/models/Task';
import { validateTaskBody, sanitizeTaskData } from '../../../lib/validation';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

// GET all tasks with optional pagination
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = Math.min(
      parseInt(searchParams.get('limit') || DEFAULT_PAGE_SIZE, 10),
      MAX_PAGE_SIZE
    );
    const skip = parseInt(searchParams.get('skip') || '0', 10);

    const filter = {};
    if (status && ['todo', 'in-progress', 'review', 'completed'].includes(status)) {
      filter.status = status;
    }

    const [tasks, total] = await Promise.all([
      Task.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Task.countDocuments(filter),
    ]);

    return Response.json({
      tasks: tasks || [],
      total,
      limit,
      skip,
    });
  } catch (error) {
    console.error('Error fetching tasks:', error.message);
    return Response.json(
      { message: 'Failed to fetch tasks', error: error.message },
      { status: 500 }
    );
  }
}

// POST create a task
export async function POST(req) {
  try {
    await connectDB();
    const body = await req.json();

    const errors = validateTaskBody(body, true);
    if (errors.length > 0) {
      return Response.json({ errors }, { status: 400 });
    }

    const taskData = sanitizeTaskData(body);
    const task = await Task.create({
      title: taskData.title,
      description: taskData.description || '',
      status: taskData.status || 'todo',
    });

    return Response.json(task, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error.message);
    return Response.json(
      { message: 'Failed to create task', error: error.message },
      { status: 400 }
    );
  }
}