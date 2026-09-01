import { apiFail } from "@/lib/api-response";
import { runChat } from "@/lib/chat";
import { normalizeStockCode } from "@/lib/market";
import { recordTaskRun } from "@/lib/observability";

import type { NextRequest } from "next/server";

const encoder = new TextEncoder();

function sse(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

// POST /api/chat：SSE 流式对话。
export async function POST(request: NextRequest): Promise<Response> {
  const body = (await request.json().catch(() => null)) as {
    code?: string;
    conversationId?: string;
    message?: string;
  } | null;

  const code = body?.code ? normalizeStockCode(body.code) : null;
  const message = body?.message?.trim();
  if (!code || !message) {
    return apiFail("VALIDATION_ERROR", "请提供股票代码与对话内容。", 400);
  }

  recordTaskRun("chat");

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(sse(data)));
      };

      try {
        send({ type: "start" });
        const result = await runChat({
          code,
          conversationId: body?.conversationId,
          message,
        });
        send({ type: "meta", data: { conversationId: result.conversationId } });
        send({ type: "tool", data: { toolCalls: result.reply.toolCalls } });

        const characters = Array.from(result.reply.content);
        const chunkSize = 24;
        for (let index = 0; index < characters.length; index += chunkSize) {
          send({
            type: "delta",
            content: characters.slice(index, index + chunkSize).join(""),
          });
          await delay(12);
        }

        send({
          type: "done",
          data: {
            conversationId: result.reply.conversationId,
            messageId: result.reply.messageId,
            sources: result.reply.sources,
            riskNote: result.reply.riskNote,
          },
        });
      } catch (error) {
        send({
          type: "error",
          data: {
            message: error instanceof Error ? error.message : "对话生成失败。",
          },
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
