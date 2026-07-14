const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtube-nocookie.com",
]);
const VIRTUAL_TOUR_HOSTS = new Set([
  "my.matterport.com",
  "kuula.co",
  "www.kuula.co",
  "momento360.com",
  "www.momento360.com",
]);

function parseHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username ||
      url.password
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

export function getYouTubeEmbedUrl(value: string): string | null {
  const url = parseHttpUrl(value);
  if (!url || !YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) return null;

  let videoId = "";
  if (url.hostname.toLowerCase() === "youtu.be") {
    videoId = url.pathname.split("/").filter(Boolean)[0] ?? "";
  } else if (url.pathname === "/watch") {
    videoId = url.searchParams.get("v") ?? "";
  } else {
    const segments = url.pathname.split("/").filter(Boolean);
    if (["embed", "shorts", "live"].includes(segments[0] ?? "")) {
      videoId = segments[1] ?? "";
    }
  }

  if (!YOUTUBE_VIDEO_ID.test(videoId)) return null;
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}

export function getDirectVideoUrl(value: string): string | null {
  const url = parseHttpUrl(value);
  if (!url || YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) return null;
  if (!/\.(mp4|webm|ogg)$/i.test(url.pathname)) return null;
  return url.toString();
}

export function getVirtualTourEmbedUrl(value: string): string | null {
  const url = parseHttpUrl(value);
  if (!url || !VIRTUAL_TOUR_HOSTS.has(url.hostname.toLowerCase())) return null;
  return url.toString();
}
