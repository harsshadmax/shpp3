import { NextResponse } from "next/server";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: string | null;
  requestId: string;
}

export function apiSuccess<T>(data: T, status = 200, init?: ResponseInit): NextResponse<ApiResponse<T>> {
  const requestId = crypto.randomUUID();
  const body: ApiResponse<T> = {
    success: true,
    data,
    error: null,
    requestId,
  };
  return NextResponse.json(body, { status, ...init });
}

export function apiError(
  error: string,
  status = 400,
  data: unknown = null,
  init?: ResponseInit
): NextResponse<ApiResponse> {
  const requestId = crypto.randomUUID();
  const body: ApiResponse = {
    success: false,
    data,
    error,
    requestId,
  };
  return NextResponse.json(body, { status, ...init });
}
