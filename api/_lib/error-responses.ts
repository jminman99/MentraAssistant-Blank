
export interface ApiErrorResponse {
  error: {
    type: 'client_error' | 'server_error' | 'upstream_error' | 'timeout_error';
    message: string;
    code?: string;
    details?: any;
    timestamp: string;
  };
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public type: ApiErrorResponse['error']['type'] = 'server_error',
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }

  toResponse(): ApiErrorResponse {
    return {
      error: {
        type: this.type,
        message: this.message,
        code: this.code,
        details: this.details,
        timestamp: new Date().toISOString()
      }
    };
  }
}

export function createClientError(message: string, code?: string, details?: any): ApiError {
  return new ApiError(message, 400, 'client_error', code, details);
}

export function createServerError(message: string, code?: string, details?: any): ApiError {
  return new ApiError(message, 500, 'server_error', code, details);
}

export function createUpstreamError(message: string, code?: string, details?: any): ApiError {
  return new ApiError(message, 502, 'upstream_error', code, details);
}

export function createTimeoutError(message: string, code?: string, details?: any): ApiError {
  return new ApiError(message, 504, 'timeout_error', code, details);
}

export function handleApiError(error: any): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  
  if (error.name === 'AcuityApiError') {
    if (error.isTimeout) {
      return createTimeoutError(error.message, 'ACUITY_TIMEOUT', { originalError: error.message });
    }
    if (error.statusCode >= 400 && error.statusCode < 500) {
      return createClientError(error.message, 'ACUITY_CLIENT_ERROR', { statusCode: error.statusCode });
    }
    return createUpstreamError(error.message, 'ACUITY_UPSTREAM_ERROR', { statusCode: error.statusCode });
  }
  
  if (error.name === 'TimeNormalizationError') {
    return createClientError(error.message, 'INVALID_TIME_FORMAT', { input: error.input });
  }
  
  // Default to server error
  return createServerError(
    'An unexpected error occurred',
    'INTERNAL_ERROR',
    process.env.NODE_ENV === 'development' ? { originalError: error.message, stack: error.stack } : undefined
  );
}

export function sendErrorResponse(res: any, error: any): void {
  const apiError = handleApiError(error);
  
  // Log the error appropriately
  if (process.env.NODE_ENV === 'development') {
    console.error('API Error:', {
      type: apiError.type,
      message: apiError.message,
      code: apiError.code,
      details: apiError.details,
      stack: error.stack
    });
  } else {
    console.error('API Error:', {
      type: apiError.type,
      message: apiError.message,
      code: apiError.code,
      timestamp: new Date().toISOString()
    });
  }
  
  res.status(apiError.statusCode).json(apiError.toResponse());
}
