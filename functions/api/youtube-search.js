export async function onRequestGet({ request, env }) {
  const apiKey = env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: { message: "Music search is being set up. Please try again soon." } },
      { status: 503 }
    );
  }

  const requestUrl = new URL(request.url);
  const query = (requestUrl.searchParams.get("q") || "").trim().slice(0, 120);
  if (!query) {
    return Response.json({ error: { message: "Enter a song or artist to search." } }, { status: 400 });
  }

  const youtubeUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  youtubeUrl.search = new URLSearchParams({
    part: "snippet",
    type: "video",
    videoCategoryId: "10",
    maxResults: "12",
    q: query,
    key: apiKey
  }).toString();

  try {
    const upstream = await fetch(youtubeUrl.toString());
    const data = await upstream.json();
    return Response.json(data, {
      status: upstream.status,
      headers: { "Cache-Control": "public, max-age=60" }
    });
  } catch {
    return Response.json(
      { error: { message: "YouTube search is temporarily unavailable." } },
      { status: 502 }
    );
  }
}
