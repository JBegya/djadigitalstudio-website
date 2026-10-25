// Fixed 9:16 (Reels/TikTok/Shorts convention) for v1 — not user-configurable. Shared by the
// client-side keyframe renderer and the server-side Ken Burns/compose ffmpeg calls so both sides
// agree on canvas dimensions and frame rate without duplicating the numbers.
export const VIDEO_CANVAS_WIDTH_PX = 1080;
export const VIDEO_CANVAS_HEIGHT_PX = 1920;
export const VIDEO_FPS = 30;
