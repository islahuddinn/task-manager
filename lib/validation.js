import { isValidObjectId } from 'mongoose';

const VALID_STATUSES = ['todo', 'in-progress', 'review', 'completed'];
const MAX_TITLE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;

/**
 * Validates and sanitizes a string field.
 * Returns an error object with field and message if invalid, or null if valid.
 */
function validateStringField(value, fieldName, maxLength, required = true) {
  if (required && (!value || typeof value !== 'string')) {
    return { field: fieldName, message: `${fieldName} is required` };
  }

  if (!value && !required) {
    return null;
  }

  if (typeof value !== 'string') {
    return { field: fieldName, message: `${fieldName} must be a string` };
  }

  const trimmed = value.trim();

  if (required && trimmed.length < 1) {
    return { field: fieldName, message: `${fieldName} cannot be empty` };
  }

  if (trimmed.length > maxLength) {
    return {
      field: fieldName,
      message: `${fieldName} must not exceed ${maxLength} characters`,
    };
  }

  return null;
}

/**
 * Validates a task payload for create/update operations.
 * Returns an array of error objects.
 */
export function validateTaskBody(body, requireTitle = true) {
  const errors = [];

  // Validate title
  const titleError = validateStringField(
    body?.title,
    'title',
    MAX_TITLE_LENGTH,
    requireTitle
  );
  if (titleError) errors.push(titleError);

  // Validate description (optional)
  if (body?.description !== undefined) {
    const descError = validateStringField(
      body.description,
      'description',
      MAX_DESCRIPTION_LENGTH,
      false
    );
    if (descError) errors.push(descError);
  }

  // Validate status
  if (body?.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) {
      errors.push({
        field: 'status',
        message: `Status must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }
  }

  // Validate completed
  if (body?.completed !== undefined && typeof body.completed !== 'boolean') {
    errors.push({ field: 'completed', message: 'Completed must be a boolean' });
  }

  return errors;
}

/**
 * Validates a MongoDB ObjectId string.
 */
export function isValidTaskId(id) {
  if (!id || typeof id !== 'string') return false;
  return isValidObjectId(id);
}

/**
 * Sanitizes task data for storage: trims strings, sets defaults.
 */
export function sanitizeTaskData(body) {
  const data = {};

  if (body.title !== undefined) {
    data.title = body.title.trim();
  }

  if (body.description !== undefined) {
    data.description = body.description.trim();
  }

  if (body.status !== undefined) {
    data.status = body.status;
  }

  if (body.completed !== undefined) {
    data.completed = body.completed;
  }

  return data;
}