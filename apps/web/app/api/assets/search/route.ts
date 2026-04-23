import { NextResponse } from "next/server";

import { searchCoinbaseAssets } from "../../../../lib/asset-catalog";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchCoinbaseAssets(query);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Asset search failed", error);
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
