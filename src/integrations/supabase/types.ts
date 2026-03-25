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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      availability_blocks: {
        Row: {
          created_at: string
          date: string
          hotel_id: string
          id: string
          reason: string | null
          room_type_id: string
        }
        Insert: {
          created_at?: string
          date: string
          hotel_id: string
          id?: string
          reason?: string | null
          room_type_id: string
        }
        Update: {
          created_at?: string
          date?: string
          hotel_id?: string
          id?: string
          reason?: string | null
          room_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_blocks_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_blocks_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_records: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          hotel_id: string | null
          id: string
          notes: string | null
          payment_date: string
          payment_method: string | null
          period_end: string | null
          period_start: string | null
          status: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          hotel_id?: string | null
          id?: string
          notes?: string | null
          payment_date: string
          payment_method?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          hotel_id?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_records_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      hotels: {
        Row: {
          address: string | null
          booking_policy: string | null
          cancellation_policy: string | null
          check_in_time: string | null
          check_out_time: string | null
          cleaning_duration_minutes: number
          conflict_policy: string
          created_at: string
          created_by_superadmin: boolean | null
          currency: string
          email: string | null
          ical_token: string
          id: string
          last_login_at: string | null
          logo_url: string | null
          monthly_price: number | null
          name: string
          phone: string | null
          subscription_paid_until: string | null
          subscription_plan: string | null
          subscription_status: string | null
          superadmin_notes: string | null
          tax_percentage: number | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          booking_policy?: string | null
          cancellation_policy?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          cleaning_duration_minutes?: number
          conflict_policy?: string
          created_at?: string
          created_by_superadmin?: boolean | null
          currency?: string
          email?: string | null
          ical_token?: string
          id?: string
          last_login_at?: string | null
          logo_url?: string | null
          monthly_price?: number | null
          name?: string
          phone?: string | null
          subscription_paid_until?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          superadmin_notes?: string | null
          tax_percentage?: number | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          booking_policy?: string | null
          cancellation_policy?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          cleaning_duration_minutes?: number
          conflict_policy?: string
          created_at?: string
          created_by_superadmin?: boolean | null
          currency?: string
          email?: string | null
          ical_token?: string
          id?: string
          last_login_at?: string | null
          logo_url?: string | null
          monthly_price?: number | null
          name?: string
          phone?: string | null
          subscription_paid_until?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          superadmin_notes?: string | null
          tax_percentage?: number | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ical_feeds: {
        Row: {
          created_at: string
          hotel_id: string
          ical_url: string
          id: string
          last_sync: string | null
          name: string
          priority_level: number
          room_type_id: string | null
          sync_enabled: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          hotel_id: string
          ical_url: string
          id?: string
          last_sync?: string | null
          name: string
          priority_level?: number
          room_type_id?: string | null
          sync_enabled?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          hotel_id?: string
          ical_url?: string
          id?: string
          last_sync?: string | null
          name?: string
          priority_level?: number
          room_type_id?: string | null
          sync_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ical_feeds_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ical_feeds_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      import_logs: {
        Row: {
          conflicts_detected: number
          duplicates_detected: number
          errors: number
          filename: string
          hotel_id: string
          id: string
          import_batch_id: string
          imported_at: string
          imported_by: string | null
          records_imported: number
        }
        Insert: {
          conflicts_detected?: number
          duplicates_detected?: number
          errors?: number
          filename: string
          hotel_id: string
          id?: string
          import_batch_id: string
          imported_at?: string
          imported_by?: string | null
          records_imported?: number
        }
        Update: {
          conflicts_detected?: number
          duplicates_detected?: number
          errors?: number
          filename?: string
          hotel_id?: string
          id?: string
          import_batch_id?: string
          imported_at?: string
          imported_by?: string | null
          records_imported?: number
        }
        Relationships: [
          {
            foreignKeyName: "import_logs_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          due_at: string | null
          hotel_id: string
          id: string
          invoice_number: string
          issued_at: string | null
          reservation_id: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_at?: string | null
          hotel_id: string
          id?: string
          invoice_number?: string
          issued_at?: string | null
          reservation_id?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_at?: string | null
          hotel_id?: string
          id?: string
          invoice_number?: string
          issued_at?: string | null
          reservation_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_overrides: {
        Row: {
          created_at: string
          end_date: string
          hotel_id: string
          id: string
          is_active: boolean
          label: string | null
          price: number
          room_type_id: string
          start_date: string
        }
        Insert: {
          created_at?: string
          end_date: string
          hotel_id: string
          id?: string
          is_active?: boolean
          label?: string | null
          price: number
          room_type_id: string
          start_date: string
        }
        Update: {
          created_at?: string
          end_date?: string
          hotel_id?: string
          id?: string
          is_active?: boolean
          label?: string | null
          price?: number
          room_type_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_overrides_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_overrides_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      reservation_audit_log: {
        Row: {
          action: string
          changes: Json | null
          created_at: string
          hotel_id: string
          id: string
          reservation_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string
          hotel_id: string
          id?: string
          reservation_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string
          hotel_id?: string
          id?: string
          reservation_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      reservations: {
        Row: {
          booking_source: string | null
          check_in: string
          check_in_time: string | null
          check_out: string
          check_out_time: string | null
          conflict_reason: string | null
          conflict_with_reservation_id: string | null
          created_at: string
          external_platform: string | null
          external_reservation_id: string | null
          guest_email: string | null
          guest_name: string
          guest_phone: string | null
          guests_count: number
          hotel_id: string
          ical_uid: string | null
          id: string
          import_batch_id: string | null
          imported_at: string | null
          is_conflict: boolean
          is_external: boolean
          notes: string | null
          payment_method: string | null
          payment_status: string | null
          reservation_code: string
          room_id: string | null
          room_type_id: string | null
          special_requests: string | null
          status: string
          total_price: number | null
          updated_at: string
        }
        Insert: {
          booking_source?: string | null
          check_in: string
          check_in_time?: string | null
          check_out: string
          check_out_time?: string | null
          conflict_reason?: string | null
          conflict_with_reservation_id?: string | null
          created_at?: string
          external_platform?: string | null
          external_reservation_id?: string | null
          guest_email?: string | null
          guest_name: string
          guest_phone?: string | null
          guests_count?: number
          hotel_id: string
          ical_uid?: string | null
          id?: string
          import_batch_id?: string | null
          imported_at?: string | null
          is_conflict?: boolean
          is_external?: boolean
          notes?: string | null
          payment_method?: string | null
          payment_status?: string | null
          reservation_code?: string
          room_id?: string | null
          room_type_id?: string | null
          special_requests?: string | null
          status?: string
          total_price?: number | null
          updated_at?: string
        }
        Update: {
          booking_source?: string | null
          check_in?: string
          check_in_time?: string | null
          check_out?: string
          check_out_time?: string | null
          conflict_reason?: string | null
          conflict_with_reservation_id?: string | null
          created_at?: string
          external_platform?: string | null
          external_reservation_id?: string | null
          guest_email?: string | null
          guest_name?: string
          guest_phone?: string | null
          guests_count?: number
          hotel_id?: string
          ical_uid?: string | null
          id?: string
          import_batch_id?: string | null
          imported_at?: string | null
          is_conflict?: boolean
          is_external?: boolean
          notes?: string | null
          payment_method?: string | null
          payment_status?: string | null
          reservation_code?: string
          room_id?: string | null
          room_type_id?: string | null
          special_requests?: string | null
          status?: string
          total_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      room_types: {
        Row: {
          amenities: string[] | null
          available_units: number
          base_price: number
          created_at: string
          description: string | null
          hotel_id: string
          id: string
          image_url: string | null
          max_guests: number
          name: string
          room_size: string | null
          show_on_website: boolean
          updated_at: string
          weekend_price: number | null
        }
        Insert: {
          amenities?: string[] | null
          available_units?: number
          base_price: number
          created_at?: string
          description?: string | null
          hotel_id: string
          id?: string
          image_url?: string | null
          max_guests?: number
          name: string
          room_size?: string | null
          show_on_website?: boolean
          updated_at?: string
          weekend_price?: number | null
        }
        Update: {
          amenities?: string[] | null
          available_units?: number
          base_price?: number
          created_at?: string
          description?: string | null
          hotel_id?: string
          id?: string
          image_url?: string | null
          max_guests?: number
          name?: string
          room_size?: string | null
          show_on_website?: boolean
          updated_at?: string
          weekend_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "room_types_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          cleaning_expected_done_at: string | null
          cleaning_started_at: string | null
          created_at: string
          floor: string | null
          hotel_id: string
          id: string
          is_active: boolean
          notes: string | null
          operational_status: string
          room_number: string
          room_type_id: string
          updated_at: string
        }
        Insert: {
          cleaning_expected_done_at?: string | null
          cleaning_started_at?: string | null
          created_at?: string
          floor?: string | null
          hotel_id: string
          id?: string
          is_active?: boolean
          notes?: string | null
          operational_status?: string
          room_number: string
          room_type_id: string
          updated_at?: string
        }
        Update: {
          cleaning_expected_done_at?: string | null
          cleaning_started_at?: string | null
          created_at?: string
          floor?: string | null
          hotel_id?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          operational_status?: string
          room_number?: string
          room_type_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          created_at: string
          email: string | null
          hotel_id: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          hotel_id: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          hotel_id?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      superadmin_audit_log: {
        Row: {
          action: string
          details: Json | null
          id: string
          performed_at: string | null
          target_hotel_id: string | null
          target_hotel_name: string | null
        }
        Insert: {
          action: string
          details?: Json | null
          id?: string
          performed_at?: string | null
          target_hotel_id?: string | null
          target_hotel_name?: string | null
        }
        Update: {
          action?: string
          details?: Json | null
          id?: string
          performed_at?: string | null
          target_hotel_id?: string | null
          target_hotel_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "superadmin_audit_log_target_hotel_id_fkey"
            columns: ["target_hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          hotel_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          hotel_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          hotel_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_reservation_if_available: {
        Args: {
          p_booking_source?: string
          p_check_in: string
          p_check_out: string
          p_guest_email?: string
          p_guest_name: string
          p_guest_phone?: string
          p_guests_count?: number
          p_hotel_id: string
          p_room_id?: string
          p_room_type_id: string
          p_total_price?: number
        }
        Returns: string
      }
      get_analytics_summary: {
        Args: { p_from: string; p_hotel_id: string; p_to: string }
        Returns: Json
      }
      get_dashboard_stats: {
        Args: { p_hotel_id: string; p_today: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      update_reservation_if_available: {
        Args: {
          p_booking_source?: string
          p_check_in?: string
          p_check_out?: string
          p_guest_email?: string
          p_guest_name?: string
          p_guest_phone?: string
          p_guests_count?: number
          p_hotel_id: string
          p_notes?: string
          p_reservation_id: string
          p_room_id?: string
          p_room_type_id: string
          p_special_requests?: string
          p_total_price?: number
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "staff"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "manager", "staff"],
    },
  },
} as const
