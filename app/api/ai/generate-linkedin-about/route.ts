import { NextRequest, NextResponse } from "next/server";
import { generateLinkedInAbout } from "@/lib/ai/nim";

import type { UserVault } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const vault = body.userVault as UserVault | undefined;
    if (!vault) throw new Error("Vault required");
    const result = await generateLinkedInAbout(vault);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Unable to generate LinkedIn About." }, { status: 400 });
  }
}
