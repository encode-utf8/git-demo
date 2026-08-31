// POST /api/chat：SSE 流式对话（mock）。
// 冻结为 text/event-stream 响应，后续由 AI 分支替换为真实流式输出。
export async function POST(): Promise<Response> {
  const encoder = new TextEncoder();
  const chunks = [
    "data: {\"type\":\"start\"}\n\n",
    "data: {\"type\":\"delta\",\"content\":\"这是 mock 流式回复。\"}\n\n",
    "data: {\"type\":\"done\"}\n\n",
  ];

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
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
