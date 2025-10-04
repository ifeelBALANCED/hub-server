export const parseBearerToken = (authorization?: string): string | null => {
  if (!authorization) return null;
  const parts = authorization.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
};

export const createProblemDetails = (error: any) => {
  if (error.type && error.title && error.detail && error.status) {
    return {
      type: error.type,
      title: error.title,
      detail: error.detail,
      status: error.status,
    };
  }

  // Default error
  return {
    type: 'server/internal-error',
    title: 'Internal Server Error',
    detail: error.message || 'An unexpected error occurred',
    status: 500,
  };
};
