import { NextResponse } from 'next/server';

// This line forces Next.js to read environment variables at runtime instead of caching them
export const dynamic = 'force-dynamic';

// Paste your image URLs here
const IMAGE_4AM = "https://i.postimg.cc/m2DYdhMw/IMG-2539.png";
const IMAGE_10AM = "https://i.postimg.cc/50gzgM2h/IMG-2538.png";
const IMAGE_8PM = "https://i.postimg.cc/7hQ2vM71/IMG-2547.png";

async function getBase64Image(url) {
  const proxyUrl = `https://allorigins.win{encodeURIComponent(url)}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) throw new Error(`Failed to fetch image: ${url}`);
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = res.headers.get('content-type') || 'image/png';
  return `data:${contentType};base64,${buffer.toString('base64')}`;
}

export async function GET() {
  const token = process.env.DISCORD_BOT_TOKEN;
  const guildId = "1518067976690073620";

  if (!token || !guildId) {
    return NextResponse.json({ 
      error: 'Missing environment variables',
      debug: { hasToken: !!token, hasGuild: !!guildId }
    }, { status: 500 });
  }

  // Get the current hour (0-23) in Eastern Time
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    hour12: false,
  });
  const currentHour = parseInt(formatter.format(new Date()), 10);

  // Time logic using your exact three target windows
  let targetImageUrl = IMAGE_8PM; // Fallback for night hours

  if (currentHour >= 4 && currentHour < 10) {
    targetImageUrl = IMAGE_4AM;  // Active from 4:00 AM to 9:59 AM
  } else if (currentHour >= 10 && currentHour < 20) {
    targetImageUrl = IMAGE_10AM; // Active from 10:00 AM to 7:59 PM (20:00)
  } // Any hour from 20 (8 PM) onwards or before 4 AM stays on IMAGE_8PM

  try {
    const base64Icon = await getBase64Image(targetImageUrl);

    const response = await fetch(`https://discord.com{guildId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bot ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ icon: base64Icon }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: 'Discord Refused', details: errorData }, { status: response.status });
    }

    return NextResponse.json({ success: true, hour: currentHour, image: targetImageUrl });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Error', details: error.message }, { status: 500 });
  }
}
