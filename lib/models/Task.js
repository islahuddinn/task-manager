import mongoose from 'mongoose';

const TaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ['todo', 'in-progress', 'review', 'completed'],
        message: '{VALUE} is not a valid status',
      },
      default: 'todo',
      index: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries: status + createdAt sorting
TaskSchema.index({ status: 1, createdAt: -1 });

// Prevent model recompilation in development with hot reload
export default mongoose.models.Task || mongoose.model('Task', TaskSchema);