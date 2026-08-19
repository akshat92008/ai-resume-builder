import { Worker } from "node:worker_threads";

const WORKER_TIMEOUT_MS = 15_000;
const MAX_PAGES = 25;
const PDF_WORKER_LIMITS = {
  maxOldGenerationSizeMb: 96,
  maxYoungGenerationSizeMb: 32,
  stackSizeMb: 4,
} as const;

export type IsolatedPdfResult = {
  text: string;
  pageLimited: boolean;
};

const WORKER_SOURCE = String.raw`
const { parentPort, workerData } = require("node:worker_threads");

if (typeof global.DOMMatrix === "undefined") global.DOMMatrix = class DOMMatrix {};
if (typeof global.Path2D === "undefined") global.Path2D = class Path2D {};
if (typeof global.ImageData === "undefined") global.ImageData = class ImageData {};

(async () => {
  let parser;
  try {
    const { PDFParse } = require("pdf-parse");
    parser = new PDFParse({ data: Buffer.from(workerData.buffer) });
    const info = await parser.getInfo({ parsePageInfo: false });
    const totalPages = Number(info?.total || info?.pages?.length || 0);
    const result = await parser.getText({ first: workerData.maxPages });
    parentPort.postMessage({
      ok: true,
      text: String(result?.text || ""),
      pageLimited: totalPages > workerData.maxPages,
    });
  } catch (error) {
    parentPort.postMessage({ ok: false, code: "PDF_PARSE_FAILED" });
  } finally {
    if (parser) {
      try { await parser.destroy(); } catch {}
    }
  }
})().catch(() => parentPort.postMessage({ ok: false, code: "PDF_PARSE_FAILED" }));
`;

export async function parsePdfIsolated(buffer: Buffer): Promise<IsolatedPdfResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(WORKER_SOURCE, {
      eval: true,
      workerData: { buffer, maxPages: MAX_PAGES },
      // Worker threads are not an OS/container sandbox, but explicit V8 limits
      // bound parser memory amplification in addition to upload/page/time caps.
      resourceLimits: PDF_WORKER_LIMITS,
    });

    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback();
      void worker.terminate();
    };

    const timer = setTimeout(() => {
      finish(() => reject(new Error("PDF_PARSE_TIMEOUT")));
    }, WORKER_TIMEOUT_MS);

    worker.once("message", (message: unknown) => {
      const data = message as { ok?: boolean; text?: string; pageLimited?: boolean };
      if (!data?.ok) {
        finish(() => reject(new Error("PDF_PARSE_FAILED")));
        return;
      }
      finish(() => resolve({ text: data.text || "", pageLimited: Boolean(data.pageLimited) }));
    });

    worker.once("error", () => {
      finish(() => reject(new Error("PDF_PARSE_FAILED")));
    });

    worker.once("exit", (code) => {
      if (!settled && code !== 0) {
        finish(() => reject(new Error("PDF_PARSE_FAILED")));
      }
    });
  });
}
