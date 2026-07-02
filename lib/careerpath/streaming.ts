/**
 * CareerOS — Streaming Utilities
 *
 * Helper for generating Server-Sent Events (SSE) streams
 * for AI operations (like resume generation, gap analysis).
 */

import { NextResponse } from "next/server";

export type StreamPayload = {
  type: "progress" | "chunk" | "result" | "error";
  step?: string;
  data?: any;
  message?: string;
};

export function createEventStream(
  executor: (sendEvent: (payload: StreamPayload) => void) => Promise<void>
) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (payload: StreamPayload) => {
        const dataStr = JSON.stringify(payload);
        controller.enqueue(encoder.encode(`data: ${dataStr}\n\n`));
      };

      // Send initial connection heartbeat
      controller.enqueue(encoder.encode(":\n\n"));

      try {
        await executor(sendEvent);
      } catch (error: any) {
        console.error("[Streaming] Error:", error);
        sendEvent({ type: "error", message: error.message || "An error occurred during streaming." });
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
