import { apiFail, apiOk } from "@/lib/api-response";
import { getConversationTimeline } from "@/lib/chat";

import type { NextRequest } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/conversations/:id：会话与消息时间线。
export async function GET(_request: NextRequest, context: RouteContext): Promise<Response> {
  const id = (await context.params).id;
  const timeline = await getConversationTimeline(id);
  if (!timeline) {
    return apiFail("NOT_FOUND", "未找到该会话。", 404);
  }

  return apiOk(timeline);
}
