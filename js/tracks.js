/** Curated default ringtones (three Sufi YouTube videos). */
export const TRACKS = [
  {
    id: "sufi-1",
    title: "Sufi I",
    description: "YouTube",
    youtubeUrl: "https://www.youtube.com/watch?v=NFb_lVLybpc",
  },
  {
    id: "sufi-2",
    title: "Sufi II",
    description: "YouTube",
    youtubeUrl: "https://www.youtube.com/watch?v=T2a_QsuR0Nc",
  },
  {
    id: "sufi-3",
    title: "Sufi III",
    description: "YouTube",
    youtubeUrl: "https://www.youtube.com/watch?v=W77bcUrXGcQ",
  },
];

const LEGACY_TRACK_IDS = {
  "ney-dawn": "sufi-1",
  "rubab-twilight": "sufi-2",
  "dhikr-whisper": "sufi-3",
  "santoor-mist": "sufi-2",
  "sufi-3": "sufi-2",
  "sufi-4": "sufi-2",
  "sufi-5": "sufi-3",
  "sufi-ensemble": "sufi-1",
};

export function getTrackById(id) {
  const resolved = LEGACY_TRACK_IDS[id] ?? id;
  return TRACKS.find((t) => t.id === resolved) ?? TRACKS[0];
}
