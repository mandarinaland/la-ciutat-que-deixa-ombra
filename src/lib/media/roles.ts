import type { Enums } from "@/types/database";
import type { MediaKind } from "./limits";

export type MediaRole = Enums<"media_role">;

/** Quin tipus de fitxer accepta cada rol (coincideix amb el trigger de la BD). */
export const ROLE_KIND: Record<MediaRole, MediaKind> = {
  main_image: "image",
  alternative_image: "image",
  video_poster: "image",
  audio_piath: "audio",
  ambient_audio: "audio",
  music: "audio",
  video: "video",
};

export const ROLE_LABEL: Record<MediaRole, string> = {
  main_image: "Fotografia",
  alternative_image: "Imatge alternativa",
  video_poster: "Pòster del vídeo",
  audio_piath: "Veu de Piath",
  ambient_audio: "Àudio ambient",
  music: "Música",
  video: "Vídeo",
};
