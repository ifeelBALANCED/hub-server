import { Elysia } from 'elysia';
import { createProblemDetails } from '../common/http';

export const errorHandler = new Elysia({ name: 'error' }).onError(
  ({ error, code, set }) => {
    console.error('Error:', error);

    if (code === 'VALIDATION') {
      set.status = 400;
      return {
        type: 'validation/invalid',
        title: 'Validation Error',
        detail: error.message,
        status: 400,
      };
    }

    if (code === 'NOT_FOUND') {
      set.status = 404;
      return {
        type: 'server/not-found',
        title: 'Not Found',
        detail: 'The requested resource was not found',
        status: 404,
      };
    }

    const problemDetails = createProblemDetails(error);
    set.status = problemDetails.status;
    return problemDetails;
  }
);
