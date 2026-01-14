import { NextResponse } from "next/server";

// RFC 7807 Problem Details
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  [key: string]: unknown;
}

const ERROR_BASE_URL = "https://heroku-rag.dev/errors";

export class APIError extends Error {
  constructor(
    public status: number,
    public title: string,
    public detail?: string,
    public type?: string
  ) {
    super(detail || title);
    this.name = "APIError";
  }

  toProblemDetails(instance?: string): ProblemDetails {
    return {
      type: this.type || `${ERROR_BASE_URL}/${this.status}`,
      title: this.title,
      status: this.status,
      detail: this.detail,
      instance,
    };
  }

  toResponse(instance?: string): NextResponse {
    return NextResponse.json(this.toProblemDetails(instance), {
      status: this.status,
      headers: {
        "Content-Type": "application/problem+json",
      },
    });
  }
}

// Common errors
export class NotFoundError extends APIError {
  constructor(resource: string, id?: string) {
    const detail = id
      ? `${resource} with ID '${id}' was not found`
      : `${resource} was not found`;
    super(404, `${resource} Not Found`, detail, `${ERROR_BASE_URL}/not-found`);
  }
}

export class ValidationError extends APIError {
  errors?: Record<string, string[]>;

  constructor(detail: string, errors?: Record<string, string[]>) {
    super(400, "Validation Error", detail, `${ERROR_BASE_URL}/validation-error`);
    if (errors) {
      this.errors = errors;
    }
  }
}

// Success response helpers
export function jsonResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function createdResponse<T>(data: T): NextResponse {
  return NextResponse.json(data, { status: 201 });
}

export function acceptedResponse<T>(data: T): NextResponse {
  return NextResponse.json(data, { status: 202 });
}

export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}
