export async function onRequestGet({ request, env }) {
  const apiKey = env.MUSIXMATCH_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: { message: "Synced lyrics need a licensed Musixmatch API key." } },
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  const track = (url.searchParams.get("track") || "").trim().slice(0, 160);
  const artist = (url.searchParams.get("artist") || "").trim().slice(0, 160);
  const duration = Math.min(600, Math.max(0, Number(url.searchParams.get("duration")) || 0));

  if (!track || !artist) {
    return Response.json({ error: { message: "A song title and artist are required." } }, { status: 400 });
  }

  const endpoint = new URL("https://api.musixmatch.com/ws/1.1/matcher.subtitle.get");
  endpoint.search = new URLSearchParams({
    q_track: track,
    q_artist: artist,
    subtitle_format: "lrc",
    f_subtitle_length: String(duration || 180),
    f_subtitle_length_max_deviation: "12",
    apikey: apiKey
  }).toString();

  try {
    const upstream = await fetch(endpoint.toString());
    const data = await upstream.json();
    const subtitle = data?.message?.body?.subtitle;
    if (!upstream.ok || data?.message?.header?.status_code !== 200 || !subtitle?.subtitle_body) {
      return Response.json(
        { error: { message: "No licensed synced lyrics were returned for this track." } },
        { status: 404 }
      );
    }

    const lines = subtitle.subtitle_body.split(/\r?\n/).flatMap((line) => {
      const match = line.match(/^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\](.*)$/);
      if (!match) return [];
      const fraction = match[3] ? Number("0." + match[3]) : 0;
      const time = Number(match[1]) * 60 + Number(match[2]) + fraction;
      const text = match[4].trim();
      return text ? [{ time, text }] : [];
    });

    if (!lines.length) {
      return Response.json({ error: { message: "Synced lyrics aren't available for this version." } }, { status: 404 });
    }

    return Response.json({
      lines,
      copyright: subtitle.lyrics_copyright || "",
      trackingUrl: subtitle.script_tracking_url || ""
    }, {
      headers: { "Cache-Control": "private, max-age=300" }
    });
  } catch {
    return Response.json(
      { error: { message: "The lyrics service is temporarily unavailable." } },
      { status: 502 }
    );
  }
}
