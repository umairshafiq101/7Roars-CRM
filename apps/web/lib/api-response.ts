import { NextResponse } from "next/server";

export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
};

export function ok<T>(data: T, meta?: ApiResponse["meta"]): ApiResponse<T> {
  return { success: true, data, meta };
}

export function err(error: string): ApiResponse {
  return { success: false, error };
}

export function jsonOk<T>(data: T, meta?: ApiResponse["meta"]) {
  return NextResponse.json(ok(data, meta));
}

export function jsonErr(error: string, status = 400) {
  return NextResponse.json(err(error), { status });
}
