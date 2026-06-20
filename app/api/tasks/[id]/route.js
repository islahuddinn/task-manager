import connectDB from '../../../../lib/mongoose';
import Task from '../../../../lib/models/Task';
import { validateTaskBody, sanitizeTaskData, isValidTaskId } from '../../../../lib/validation';

// PUT update a task (partial updates allowed)
export async function PUT(req, { params }) {
  try {
    const { id } = params;

    if (!isValidTaskId(id)) {
      return Response.json({ message: 'Invalid task ID format' }, { status: 400 });
    }

    await connectDB();
    const body = await req.json();

    // For updates, title is not required (partial update)
    const errors = validateTaskBody(body, false);
    if (errors.length > 0) {
      return Response.json({ errors }, { status: 400 });
    }

    const updateData = sanitizeTaskData(body);

    const task = await Task.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!task) {
      return Response.json({ message: 'Task not found' }, { status: 404 });
    }

    return Response.json(task);
  } catch (error) {
    console.error('Error updating task:', error.message);
    return Response.json(
      { message: 'Failed to update task', error: error.message },
      { status: 400 }
    );
  }
}

// DELETE a task
export async function DELETE(req, { params }) {
  try {
    const { id } = params;

    if (!isValidTaskId(id)) {
      return Response.json({ message: 'Invalid task ID format' }, { status: 400 });
    }

    await connectDB();
    const task = await Task.findByIdAndDelete(id);

    if (!task) {
      return Response.json({ message: 'Task not found' }, { status: 404 });
    }

    return Response.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error.message);
    return Response.json(
      { message: 'Failed to delete task', error: error.message },
      { status: 500 }
    );
  }
}