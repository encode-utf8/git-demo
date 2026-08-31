import { apiOk } from "@/lib/api-response";
import { mockConversation } from "@/lib/mock";

import type { NextRequest } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/conversations/:id：对话历史（mock）。
export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return apiOk({ ...mockConversation, id });
}
