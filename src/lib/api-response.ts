import { NextResponse } from "next/server";

import type {
  ApiErrorCode,
  ApiError,
  ApiResponse,
  ApiSuccess,
} from "@/lib/shared/types";

/** 构造统一成功响应。 */
export function apiOk<T>(data: T, init?: ResponseInit): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true, data }, init);
}

/** 构造统一错误响应。 */
export function apiFail(
  code: ApiErrorCode,
  message: string,
  status = 500,
  details?: unknown,
): NextResponse<ApiError> {
  return NextResponse.json(
    { success: false, error: { code, message, details } },
    { status },
  );
}

/** 统一处理未捕获异常。 */
export function apiUnexpected(error: unknown): NextResponse<ApiError> {
  const message = error instanceof Error ? error.message : "未知错误";
  return apiFail("INTERNAL_ERROR", message, 500);
}

/** 供 async 路由统一包裹处理结果的辅助类型。 */
export type ApiResult<T> = ApiResponse<T>;
