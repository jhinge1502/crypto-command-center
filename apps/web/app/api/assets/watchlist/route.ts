import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import {
  pickAccent,
  toAssetSlug
} from "../../../../lib/asset-catalog";
import { createClient as createAuthClient } from "../../../../lib/supabase/server";

export async function POST(request: Request) {
  const authClient = await createAuthClient();
  const {
    data: { user }
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    symbol?: string;
    name?: string;
    currencyPair?: string;
  };

  const symbol = body.symbol?.trim().toUpperCase();
  const name = body.name?.trim();
  const currencyPair = body.currencyPair?.trim().toUpperCase();

  if (!symbol || !name || !currencyPair) {
    return NextResponse.json({ error: "Missing asset fields" }, { status: 400 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json(
      { error: "Missing server environment variables" },
      { status: 500 }
    );
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { data: existingAsset, error: existingAssetError } = await adminClient
    .from("assets")
    .select("id")
    .eq("symbol", symbol)
    .maybeSingle();

  if (existingAssetError) {
    return NextResponse.json({ error: existingAssetError.message }, { status: 500 });
  }

  let assetId = existingAsset?.id;

  if (!assetId) {
    const { data: insertedAsset, error: insertAssetError } = await adminClient
      .from("assets")
      .insert({
        slug: toAssetSlug(symbol),
        symbol,
        name,
        currency_pair: currencyPair,
        accent: pickAccent(symbol)
      })
      .select("id")
      .single();

    if (insertAssetError) {
      return NextResponse.json({ error: insertAssetError.message }, { status: 500 });
    }

    assetId = insertedAsset.id;
  }

  const { error: watchlistError } = await adminClient
    .from("user_watchlist_assets")
    .upsert(
      {
        user_id: user.id,
        asset_id: assetId
      },
      {
        onConflict: "user_id,asset_id"
      }
    );

  if (watchlistError) {
    return NextResponse.json({ error: watchlistError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
