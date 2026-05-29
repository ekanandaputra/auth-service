import { Request } from 'express';
import { BadRequestError } from './errors';

export interface PaginationMetadata {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMetadata;
}

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

/**
 * Parses 'page' and 'limit' from the request query parameters,
 * validates them, and calculates 'skip' for Prisma.
 */
export function parsePaginationParams(req: Request, defaultLimit = 10): PaginationParams {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || defaultLimit;

  if (page < 1) {
    throw new BadRequestError('Page must be a positive integer greater than or equal to 1');
  }
  if (limit < 1) {
    throw new BadRequestError('Limit must be a positive integer greater than or equal to 1');
  }

  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Formats a paginated list into a standardized pagination response structure.
 */
export function createPaginatedResult<T>(
  data: T[],
  total: number,
  params: { page: number; limit: number }
): PaginatedResult<T> {
  return {
    data,
    pagination: {
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(total / params.limit)
    }
  };
}
