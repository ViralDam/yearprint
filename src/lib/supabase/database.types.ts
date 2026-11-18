export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      edition_answers: {
        Row: {
          answer_year: number
          edition_id: string
        }
        Insert: {
          answer_year: number
          edition_id: string
        }
        Update: {
          answer_year?: number
          edition_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "edition_answers_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: true
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
        ]
      }
      editions: {
        Row: {
          created_at: string
          edition_label: string
          edition_no: number
          edition_tag: string
          established: string
          id: string
          index_note: string | null
          motto: string
          pages_line: string
          paper_name: string
          price_label: string
          publish_date: string
          status: string
          teaser_deck: string | null
          weather: Json | null
        }
        Insert: {
          created_at?: string
          edition_label?: string
          edition_no: number
          edition_tag?: string
          established?: string
          id?: string
          index_note?: string | null
          motto?: string
          pages_line?: string
          paper_name?: string
          price_label?: string
          publish_date: string
          status?: string
          teaser_deck?: string | null
          weather?: Json | null
        }
        Update: {
          created_at?: string
          edition_label?: string
          edition_no?: number
          edition_tag?: string
          established?: string
          id?: string
          index_note?: string | null
          motto?: string
          pages_line?: string
          paper_name?: string
          price_label?: string
          publish_date?: string
          status?: string
          teaser_deck?: string | null
          weather?: Json | null
        }
        Relationships: []
      }
      item_reveals: {
        Row: {
          item_id: string
          why: string
        }
        Insert: {
          item_id: string
          why: string
        }
        Update: {
          item_id?: string
          why?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_reveals_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          body: string | null
          byline: string | null
          caption: string | null
          continued: string | null
          credit: string | null
          dateline: string | null
          deck: string | null
          edition_id: string
          feature: boolean
          greek_lines: number | null
          headline: string
          id: string
          image_alt: string | null
          image_path: string | null
          image_position: string | null
          image_variant: string | null
          kicker: string | null
          kind: string
          lead: string | null
          price: string | null
          section_id: string | null
          slot: string | null
          sort: number
        }
        Insert: {
          body?: string | null
          byline?: string | null
          caption?: string | null
          continued?: string | null
          credit?: string | null
          dateline?: string | null
          deck?: string | null
          edition_id: string
          feature?: boolean
          greek_lines?: number | null
          headline: string
          id?: string
          image_alt?: string | null
          image_path?: string | null
          image_position?: string | null
          image_variant?: string | null
          kicker?: string | null
          kind: string
          lead?: string | null
          price?: string | null
          section_id?: string | null
          slot?: string | null
          sort?: number
        }
        Update: {
          body?: string | null
          byline?: string | null
          caption?: string | null
          continued?: string | null
          credit?: string | null
          dateline?: string | null
          deck?: string | null
          edition_id?: string
          feature?: boolean
          greek_lines?: number | null
          headline?: string
          id?: string
          image_alt?: string | null
          image_path?: string | null
          image_position?: string | null
          image_variant?: string | null
          kicker?: string | null
          kind?: string
          lead?: string | null
          price?: string | null
          section_id?: string | null
          slot?: string | null
          sort?: number
        }
        Relationships: [
          {
            foreignKeyName: "items_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_section_id_edition_id_fkey"
            columns: ["section_id", "edition_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id", "edition_id"]
          },
        ]
      }
      plays: {
        Row: {
          edition_id: string
          finished: boolean
          finished_at: string | null
          guesses: number[]
          id: string
          ranked: boolean
          score: number
          started_at: string
          unfolded: string[]
          user_id: string
          won: boolean
        }
        Insert: {
          edition_id: string
          finished?: boolean
          finished_at?: string | null
          guesses?: number[]
          id?: string
          ranked?: boolean
          score?: number
          started_at?: string
          unfolded?: string[]
          user_id: string
          won?: boolean
        }
        Update: {
          edition_id?: string
          finished?: boolean
          finished_at?: string | null
          guesses?: number[]
          id?: string
          ranked?: boolean
          score?: number
          started_at?: string
          unfolded?: string[]
          user_id?: string
          won?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "plays_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
        }
        Relationships: []
      }
      sections: {
        Row: {
          cost: number
          description: string
          edition_id: string
          folio: string
          icon: string
          id: string
          name: string
          short_name: string
          slug: string
          sort: number
        }
        Insert: {
          cost: number
          description: string
          edition_id: string
          folio: string
          icon: string
          id?: string
          name: string
          short_name: string
          slug: string
          sort: number
        }
        Update: {
          cost?: number
          description?: string
          edition_id?: string
          folio?: string
          icon?: string
          id?: string
          name?: string
          short_name?: string
          slug?: string
          sort?: number
        }
        Relationships: [
          {
            foreignKeyName: "sections_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_merge_ticket: { Args: never; Returns: string }
      display_name_available: { Args: { p_name: string }; Returns: boolean }
      get_edition: { Args: { p_edition_no?: number }; Returns: Json }
      get_leaderboard: {
        Args: { p_edition_id: string; p_limit?: number }
        Returns: Json
      }
      get_my_stats: { Args: never; Returns: Json }
      get_my_streak: { Args: never; Returns: Json }
      get_play: { Args: { p_edition_id: string }; Returns: Json }
      redeem_merge_ticket: { Args: { p_token: string }; Returns: number }
      set_display_name: { Args: { p_name: string }; Returns: string }
      start_play: { Args: { p_edition_id: string }; Returns: Json }
      submit_guess: {
        Args: { p_play_id: string; p_year: number }
        Returns: Json
      }
      unfold_section: {
        Args: { p_play_id: string; p_slug: string }
        Returns: Json
      }
      utc_today: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
