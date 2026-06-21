import { NextResponse } from 'next/server';

// Paste your image URLs here
const IMAGE_4AM = "https://i.postimg.cc/m2DYdhMw/IMG-2539.png";
const IMAGE_10AM = "https://i.postimg.cc/50gzgM2h/IMG-2538.png";
const IMAGE_8PM = "https://i.postimg.cc/7hQ2vM71/IMG-2547.png";

// Helper function to fetch an image URL and convert it to Discord's required base64 format
async function getBase64Image(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${url}`);
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = res.headers.get('content-type') || 'image/png';
  return `data:${contentType};base64,${buffer.toString('base64')}`;
}

export async function GET() {
  const token = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!token || !guildId) {
    return NextResponse.json({ error: 'Missing environment variables' }, { status: 500 });
  }

  // Get the current hour (0-23) in Eastern Time
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    hour12: false,
  });
  const currentHour = parseInt(formatter.format(new Date()), 10);

  // Determine which image URL to use based on your schedule windows
  let targetImageUrl = IMAGE_8PM; // Default fallback

  if (currentHour >= 4 && currentHour < 10) {
    targetImageUrl = IMAGE_4AM;  // From 4:00 AM to 9:59 AM
  } else if (currentHour >= 10 && currentHour < 20) {
    targetImageUrl = IMAGE_10AM; // From 10:00 AM to 7:59 PM
  } else {
    targetImageUrl = IMAGE_8PM; // From 8:00 PM to 3:59 AM
  }

  try {
    // 1. Download image and convert to Base64
    const base64Icon = await getBase64Image(targetImageUrl);

    // 2. Patch the Discord Guild Icon
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
      return NextResponse.json({ error: 'Discord API Refused', details: errorData }, { status: response.status });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Icon updated successfully for hour ${currentHour}`,
      usedImage: targetImageUrl 
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal Error', details: error.message }, { status: 500 });
  }
}
