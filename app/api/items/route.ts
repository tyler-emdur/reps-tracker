import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const KEY = 'rep-items';

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}

export async function GET() {
  try {
    const items = await redis.lrange(KEY, 0, -1);
    return NextResponse.json(items ?? [], { headers: CORS });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500, headers: CORS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const item = await req.json();
    if (!item || typeof item !== 'object') {
      return NextResponse.json({ error: 'Invalid item' }, { status: 400, headers: CORS });
    }
    item.id = item.id ?? Date.now().toString();
    item.savedAt = item.savedAt ?? new Date().toISOString();

    await redis.lpush(KEY, item);
    return NextResponse.json(item, { status: 201, headers: CORS });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to save item' }, { status: 500, headers: CORS });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400, headers: CORS });

    const items = (await redis.lrange(KEY, 0, -1)) as { id: string; [key: string]: unknown }[];
    const idx = items.findIndex((item) => item.id === id);
    if (idx === -1) return NextResponse.json({ error: 'Item not found' }, { status: 404, headers: CORS });

    const updated = { ...items[idx], ...updates };
    items[idx] = updated;

    await redis.del(KEY);
    if (items.length > 0) {
      await redis.rpush(KEY, ...([...items].reverse() as [object, ...object[]]));
    }

    return NextResponse.json(updated, { headers: CORS });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500, headers: CORS });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400, headers: CORS });

    const items = (await redis.lrange(KEY, 0, -1)) as { id: string }[];
    const filtered = items.filter((item) => item.id !== id);

    await redis.del(KEY);
    if (filtered.length > 0) {
      await redis.rpush(KEY, ...([...filtered].reverse() as [object, ...object[]]));
    }

    return NextResponse.json({ success: true }, { headers: CORS });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500, headers: CORS });
  }
}
