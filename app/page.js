'use client';

import { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import TaskForm from './components/TaskForm';

const COLUMNS = [
  { id: 'todo', title: 'To Do', color: 'bg-gray-100' },
  { id: 'in-progress', title: 'In Progress', color: 'bg-blue-50' },
  { id: 'review', title: 'Review', color: 'bg-yellow-50' },
  { id: 'completed', title: 'Completed', color: 'bg-green-50' },
];

const STORAGE_KEY = 'taskmanager_tasks';
const MAX_RETRIES = 2;

function getLocalTasks() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function setLocalTasks(tasks) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // localStorage quota exceeded, silently fail
  }
}

async function apiRequest(url, options = {}, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      if (response.status >= 400 && response.status < 500) return response;
      // Server errors (5xx) can be retried
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    } catch {
      if (attempt >= retries) throw new Error('Network request failed');
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  throw new Error('Request failed after retries');
}

export default function Home() {
  const [tasks, setTasks] = useState([]);
  const [editingTask, setEditingTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [useLocalFallback, setUseLocalFallback] = useState(false);

  // Load tasks from API or localStorage fallback
  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/api/tasks');
      if (response.ok) {
        const result = await response.json();
        // Support both old format (array) and new format ({ tasks, total })
        const data = Array.isArray(result) ? result : result.tasks || [];
        setTasks(data);
        setUseLocalFallback(false);
        // Sync to localStorage as cache
        setLocalTasks(data);
      } else {
        throw new Error(`API error: ${response.status}`);
      }
    } catch {
      // Try localStorage fallback - or start fresh with local state
      const localData = getLocalTasks();
      if (localData && Array.isArray(localData)) {
        setTasks(localData);
      } else {
        setTasks([]);
      }
      setUseLocalFallback(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const refreshTasks = useCallback(async () => {
    if (useLocalFallback) {
      loadTasks();
      return;
    }
    try {
      const response = await apiRequest('/api/tasks');
      if (response.ok) {
        const result = await response.json();
        const data = Array.isArray(result) ? result : result.tasks || [];
        setTasks(data);
        setLocalTasks(data);
      }
    } catch {
      // Keep existing tasks on network failure
    }
  }, [useLocalFallback, loadTasks]);

  const handleAddTask = useCallback(
    async (taskData) => {
      if (useLocalFallback) {
        const newTask = {
          _id: 'local_' + Date.now(),
          ...taskData,
          status: 'todo',
          completed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const updated = [...tasks, newTask];
        setTasks(updated);
        setLocalTasks(updated);
        return;
      }

      try {
        const response = await apiRequest('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData),
        });
        if (response.ok) {
          await refreshTasks();
        } else {
          const err = await response.json();
          console.error('API validation error:', err.errors || err);
        }
      } catch (error) {
        console.error('Failed to add task, falling back to local storage:', error);
        // Fall back to local storage when API is unreachable
        setUseLocalFallback(true);
        const newTask = {
          _id: 'local_' + Date.now(),
          ...taskData,
          status: 'todo',
          completed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const updated = [...tasks, newTask];
        setTasks(updated);
        setLocalTasks(updated);
      }
    },
    [useLocalFallback, tasks, refreshTasks]
  );

  const handleEditTask = useCallback(
    async (taskData) => {
      if (useLocalFallback || editingTask?._id?.startsWith('local_')) {
        const updated = tasks.map((t) =>
          t._id === editingTask._id ? { ...t, ...taskData } : t
        );
        setTasks(updated);
        setLocalTasks(updated);
        setEditingTask(null);
        return;
      }

      try {
        const response = await apiRequest(`/api/tasks/${editingTask._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData),
        });
        if (response.ok) {
          setEditingTask(null);
          await refreshTasks();
        } else {
          const err = await response.json();
          console.error('API validation error:', err.errors || err);
        }
      } catch (error) {
        console.error('Failed to update task:', error);
      }
    },
    [useLocalFallback, editingTask, tasks, refreshTasks]
  );

  const handleDeleteTask = useCallback(
    async (id) => {
      if (useLocalFallback || id.startsWith('local_')) {
        const updated = tasks.filter((t) => t._id !== id);
        setTasks(updated);
        setLocalTasks(updated);
        return;
      }

      try {
        const response = await apiRequest(`/api/tasks/${id}`, { method: 'DELETE' });
        if (response.ok) {
          await refreshTasks();
        }
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
    },
    [useLocalFallback, tasks, refreshTasks]
  );

  const handleStatusChange = useCallback(
    async (taskId, newStatus) => {
      if (useLocalFallback || taskId.startsWith('local_')) {
        const updated = tasks.map((t) =>
          t._id === taskId
            ? { ...t, status: newStatus, completed: newStatus === 'completed' }
            : t
        );
        setTasks(updated);
        setLocalTasks(updated);
        return;
      }

      try {
        const response = await apiRequest(`/api/tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: newStatus,
            completed: newStatus === 'completed',
          }),
        });
        if (response.ok) {
          await refreshTasks();
        }
      } catch (error) {
        console.error('Failed to update status:', error);
      }
    },
    [useLocalFallback, tasks, refreshTasks]
  );

  // Persist column reorder to MongoDB
  const persistOrder = useCallback(
    async (columnId, taskIds) => {
      if (useLocalFallback) return;
      try {
        await Promise.all(
          taskIds.map((taskId, index) =>
            apiRequest(`/api/tasks/${taskId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ order: index }),
            })
          )
        );
      } catch {
        // Order persistence is best-effort
      }
    },
    [useLocalFallback]
  );

  const handleDragEnd = useCallback(
    async (result) => {
      if (!result.destination) return;

      const { source, destination, draggableId } = result;

      // Build a fresh reordered list
      const taskList = [...tasks];
      const draggedTask = taskList.find((t) => t._id === draggableId);
      if (!draggedTask) return;

      const reorderedTasks = taskList.filter((t) => t._id !== draggableId);
      draggedTask.status = destination.droppableId;
      draggedTask.completed = destination.droppableId === 'completed';

      const destTasks = reorderedTasks.filter(
        (t) => t.status === destination.droppableId
      );
      destTasks.splice(destination.index, 0, draggedTask);
      const otherTasks = reorderedTasks.filter(
        (t) => t.status !== destination.droppableId
      );

      const newOrder = [...otherTasks, ...destTasks];
      setTasks(newOrder);
      setLocalTasks(newOrder);

      // If moved between columns, persist status change
      if (source.droppableId !== destination.droppableId) {
        await handleStatusChange(draggableId, destination.droppableId);
      } else {
        // Same column reorder: persist order if not local
        const colTasks = newOrder
          .filter((t) => t.status === destination.droppableId)
          .map((t) => t._id);
        persistOrder(destination.droppableId, colTasks);
      }
    },
    [tasks, handleStatusChange, persistOrder]
  );

  const handleStartEdit = useCallback((task) => {
    setEditingTask(task);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingTask(null);
  }, []);

  const getTasksByStatus = useCallback(
    (status) => tasks.filter((task) => task.status === status),
    [tasks]
  );

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-2 sm:py-8 sm:px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-4xl font-bold text-center text-gray-900 mb-4 sm:mb-8">
          Task Manager
        </h1>

        {useLocalFallback && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-yellow-800 text-sm">
              ⚠️ Running in offline mode. Data is stored locally in your browser.
              Changes will not sync to the server until the database connection is restored.
            </p>
          </div>
        )}

        <TaskForm
          key={editingTask?._id || 'new'}
          onSubmit={editingTask ? handleEditTask : handleAddTask}
          initialData={editingTask}
          onCancel={handleCancelEdit}
          isEditing={!!editingTask}
        />

        <div className="mt-4 sm:mt-8">
          {loading ? (
            <p className="text-gray-600 text-center py-8">Loading tasks...</p>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {COLUMNS.map((column) => (
                  <div
                    key={column.id}
                    className={`${column.color} rounded-lg p-4 border border-gray-200`}
                  >
                    <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center justify-between">
                      {column.title}
                      <span className="bg-white px-2 py-1 rounded-full text-sm text-gray-600">
                        {getTasksByStatus(column.id).length}
                      </span>
                    </h2>
                    <Droppable droppableId={column.id}>
                      {(provided) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="space-y-2 min-h-[200px]"
                        >
                          {getTasksByStatus(column.id).map((task, index) => (
                            <Draggable
                              key={task._id}
                              draggableId={task._id}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`bg-white rounded-lg shadow-sm p-3 border border-gray-200 ${
                                    snapshot.isDragging
                                      ? 'shadow-lg ring-2 ring-gray-400'
                                      : ''
                                  }`}
                                >
                                  <div className="flex flex-col space-y-2">
                                    <div>
                                      <h3 className="text-sm font-medium text-gray-900">
                                        {task.title}
                                      </h3>
                                      {task.description && (
                                        <p className="text-xs text-gray-600 mt-1">
                                          {task.description}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <div className="flex space-x-1">
                                        <button
                                          onClick={() => handleStartEdit(task)}
                                          className="px-2 py-1 bg-gray-900 text-white text-xs rounded hover:bg-gray-700 transition-colors"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => handleDeleteTask(task._id)}
                                          className="px-2 py-1 bg-gray-200 text-gray-900 text-xs rounded hover:bg-gray-300 transition-colors"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                ))}
              </div>
            </DragDropContext>
          )}
        </div>
      </div>
    </div>
  );
}