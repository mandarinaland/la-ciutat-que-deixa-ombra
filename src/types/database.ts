/**
 * Tipus de la base de dades.
 *
 * Escrits a partir de supabase/migrations/ amb el mateix format que genera la CLI.
 * Quan tinguis el projecte enllaçat, regenera'ls amb:
 *
 *   npm run db:types        (projecte remot enllaçat)
 *   npm run db:types:local  (supabase start)
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Timestamps = { created_at: string; updated_at: string };

type ProjectRow = Timestamps & { id: string; slug: string; title: string; description: string | null };

type MediaRow = Timestamps & {
  id: string;
  filename: string;
  original_filename: string | null;
  bucket: string | null;
  storage_path: string | null;
  public_url: string | null;
  provider: Database["public"]["Enums"]["media_provider"];
  provider_asset_id: string | null;
  media_type: Database["public"]["Enums"]["media_type"];
  mime_type: string;
  size: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  alt_text: string | null;
  checksum: string | null;
  created_by: string | null;
};

type WorkRow = Timestamps & {
  id: string;
  project_id: string | null;
  slug: string;
  title: string;
  subtitle: string | null;
  intro_text: string | null;
  hero_quote: string | null;
  description: string | null;
  credit_photography: string | null;
  credit_text_voice: string | null;
  cover_media_id: string | null;
  intro_audio_media_id: string | null;
  status: Database["public"]["Enums"]["publish_status"];
  order_index: number;
  published_at: string | null;
};

type ChapterRow = Timestamps & {
  id: string;
  work_id: string;
  slug: string;
  title: string;
  description: string | null;
  order_index: number;
  status: Database["public"]["Enums"]["publish_status"];
  published_at: string | null;
};

type VignetteRow = Timestamps & {
  id: string;
  work_id: string;
  chapter_id: string | null;
  order_index: number;
  slug: string;
  title: string | null;
  piath_text: string | null;
  caption: string | null;
  photographer: string | null;
  photo_date: string | null;
  location: string | null;
  status: Database["public"]["Enums"]["publish_status"];
  published_at: string | null;
};

type VignetteMediaRow = {
  id: string;
  vignette_id: string;
  media_id: string;
  role: Database["public"]["Enums"]["media_role"];
  position: number;
  created_at: string;
};

type AdminRow = { user_id: string; role: Database["public"]["Enums"]["admin_role"]; created_at: string };

type SiteSettingRow = { key: string; value: Json; is_public: boolean; updated_at: string };

/** Insert: les columnes amb default o nul·lables són opcionals. */
type InsertOf<Row, Required extends keyof Row> = Pick<Row, Required> & Partial<Omit<Row, Required>>;

type VignetteRelationships = [
  {
    foreignKeyName: "vignettes_work_id_fkey";
    columns: ["work_id"];
    isOneToOne: false;
    referencedRelation: "works";
    referencedColumns: ["id"];
  },
  {
    foreignKeyName: "vignettes_chapter_same_work";
    columns: ["chapter_id", "work_id"];
    isOneToOne: false;
    referencedRelation: "chapters";
    referencedColumns: ["id", "work_id"];
  },
];

export type Database = {
  __InternalSupabase: { PostgrestVersion: "12" };
  public: {
    Tables: {
      projects: {
        Row: ProjectRow;
        Insert: InsertOf<ProjectRow, "slug" | "title">;
        Update: Partial<ProjectRow>;
        Relationships: [];
      };
      media: {
        Row: MediaRow;
        Insert: InsertOf<MediaRow, "filename" | "media_type" | "mime_type">;
        Update: Partial<MediaRow>;
        Relationships: [];
      };
      works: {
        Row: WorkRow;
        Insert: InsertOf<WorkRow, "slug" | "title">;
        Update: Partial<WorkRow>;
        Relationships: [
          {
            foreignKeyName: "works_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "works_cover_media_id_fkey";
            columns: ["cover_media_id"];
            isOneToOne: false;
            referencedRelation: "media";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "works_intro_audio_media_id_fkey";
            columns: ["intro_audio_media_id"];
            isOneToOne: false;
            referencedRelation: "media";
            referencedColumns: ["id"];
          },
        ];
      };
      chapters: {
        Row: ChapterRow;
        // order_index l'omple un trigger si no s'envia
        Insert: InsertOf<ChapterRow, "work_id" | "slug" | "title">;
        Update: Partial<ChapterRow>;
        Relationships: [
          {
            foreignKeyName: "chapters_work_id_fkey";
            columns: ["work_id"];
            isOneToOne: false;
            referencedRelation: "works";
            referencedColumns: ["id"];
          },
        ];
      };
      vignettes: {
        Row: VignetteRow;
        Insert: InsertOf<VignetteRow, "work_id" | "slug">;
        Update: Partial<VignetteRow>;
        Relationships: VignetteRelationships;
      };
      vignette_media: {
        Row: VignetteMediaRow;
        Insert: InsertOf<VignetteMediaRow, "vignette_id" | "media_id" | "role">;
        Update: Partial<VignetteMediaRow>;
        Relationships: [
          {
            foreignKeyName: "vignette_media_vignette_id_fkey";
            columns: ["vignette_id"];
            isOneToOne: false;
            referencedRelation: "vignettes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vignette_media_media_id_fkey";
            columns: ["media_id"];
            isOneToOne: false;
            referencedRelation: "media";
            referencedColumns: ["id"];
          },
        ];
      };
      admins: {
        Row: AdminRow;
        Insert: InsertOf<AdminRow, "user_id">;
        Update: Partial<AdminRow>;
        Relationships: [];
      };
      site_settings: {
        Row: SiteSettingRow;
        Insert: InsertOf<SiteSettingRow, "key" | "value">;
        Update: Partial<SiteSettingRow>;
        Relationships: [];
      };
    };
    Views: {
      public_vignettes: {
        Row: VignetteRow & { number: number; total: number };
        Relationships: VignetteRelationships;
      };
      preview_vignettes: {
        Row: VignetteRow & { number: number; total: number };
        Relationships: VignetteRelationships;
      };
      media_with_usage: {
        Row: MediaRow & { usage_count: number; cover_count: number };
        Relationships: [];
      };
    };
    Functions: {
      reorder_vignettes: { Args: { p_work_id: string; p_ids: string[] }; Returns: undefined };
      reorder_chapters: { Args: { p_work_id: string; p_ids: string[] }; Returns: undefined };
    };
    Enums: {
      publish_status: "draft" | "published" | "archived";
      media_type: "image" | "audio" | "video";
      media_role:
        | "main_image"
        | "alternative_image"
        | "audio_piath"
        | "ambient_audio"
        | "music"
        | "video"
        | "video_poster";
      media_provider: "supabase" | "mux" | "cloudflare_stream" | "external";
      admin_role: "owner" | "editor";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Views<T extends keyof PublicSchema["Views"]> = PublicSchema["Views"][T]["Row"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];

export const Constants = {
  public: {
    Enums: {
      publish_status: ["draft", "published", "archived"],
      media_type: ["image", "audio", "video"],
      media_role: ["main_image", "alternative_image", "audio_piath", "ambient_audio", "music", "video", "video_poster"],
      media_provider: ["supabase", "mux", "cloudflare_stream", "external"],
      admin_role: ["owner", "editor"],
    },
  },
} as const;
