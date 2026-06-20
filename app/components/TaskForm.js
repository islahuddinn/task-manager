'use client';

import { useState } from 'react';

export default function TaskForm({ onSubmit, initialData, onCancel, isEditing }) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');

  // Reset form when initialData changes (edit mode)
  // Using a key on the parent forces re-mount, so no useEffect needed for reset
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      completed: initialData?.completed || false,
    });

    if (!isEditing) {
      setTitle('');
      setDescription('');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
      <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-3 sm:mb-4">
        {isEditing ? 'Edit Task' : 'Add New Task'}
      </h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-3 sm:mb-4">
          <label htmlFor="title" className="block text-gray-700 font-medium mb-1 sm:mb-2 text-sm sm:text-base">
            Title *
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-sm sm:text-base"
            placeholder="Enter task title"
            required
            maxLength={100}
          />
        </div>
        <div className="mb-3 sm:mb-4">
          <label htmlFor="description" className="block text-gray-700 font-medium mb-1 sm:mb-2 text-sm sm:text-base">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-sm sm:text-base resize-none"
            placeholder="Enter task description (optional)"
            rows="3"
            maxLength={500}
          />
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <button
            type="submit"
            className="px-4 sm:px-6 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors font-medium text-sm sm:text-base"
          >
            {isEditing ? 'Update Task' : 'Add Task'}
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 sm:px-6 py-2 bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300 transition-colors font-medium text-sm sm:text-base"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}