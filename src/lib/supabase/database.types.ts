export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_response_cache: {
        Row: {
          cache_key: string
          created_at: string
          response: string
          task: string
        }
        Insert: {
          cache_key: string
          created_at?: string
          response: string
          task: string
        }
        Update: {
          cache_key?: string
          created_at?: string
          response?: string
          task?: string
        }
        Relationships: []
      }
      // Hand-added, not yet regenerated from the live database via
      // `supabase gen types` — see supabase/migrations/20260814000003_api_keys.sql.
      api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          created_at: string
          file_name: string
          id: string
          mime_type: string
          size_bytes: number
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          mime_type: string
          size_bytes: number
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string
          size_bytes?: number
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string
          created_at: string
          id: string
          metadata: Json
          target_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_ledger: {
        Row: {
          action: string
          cache_hit: boolean
          created_at: string
          credits_delta: number
          id: string
          project_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          cache_hit?: boolean
          created_at?: string
          credits_delta: number
          id?: string
          project_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          cache_hit?: boolean
          created_at?: string
          credits_delta?: number
          id?: string
          project_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_ledger_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_domains: {
        Row: {
          created_at: string
          domain: string
          id: string
          project_id: string
          provider_domain_id: string | null
          status: string
          verification_token: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          project_id: string
          provider_domain_id?: string | null
          status?: string
          verification_token?: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          project_id?: string
          provider_domain_id?: string | null
          status?: string
          verification_token?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_domains_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      deploy_connections: {
        Row: {
          access_token_ciphertext: string | null
          access_token_secret_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          provider: string
          provider_account_email: string | null
          refresh_token_ciphertext: string | null
          refresh_token_secret_id: string | null
          user_id: string
        }
        Insert: {
          access_token_ciphertext?: string | null
          access_token_secret_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          provider: string
          provider_account_email?: string | null
          refresh_token_ciphertext?: string | null
          refresh_token_secret_id?: string | null
          user_id: string
        }
        Update: {
          access_token_ciphertext?: string | null
          access_token_secret_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          provider?: string
          provider_account_email?: string | null
          refresh_token_ciphertext?: string | null
          refresh_token_secret_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deploy_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      deployments: {
        Row: {
          created_at: string
          deployment_url: string | null
          provider_deployment_id: string | null
          id: string
          logs: string | null
          project_id: string
          provider: string
          status: string
        }
        Insert: {
          created_at?: string
          deployment_url?: string | null
          provider_deployment_id?: string | null
          id?: string
          logs?: string | null
          project_id: string
          provider: string
          status?: string
        }
        Update: {
          created_at?: string
          deployment_url?: string | null
          provider_deployment_id?: string | null
          id?: string
          logs?: string | null
          project_id?: string
          provider?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "deployments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          created_at: string
          id: string
          message: string
          status: Database["public"]["Enums"]["feedback_status"]
          type: Database["public"]["Enums"]["feedback_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          status?: Database["public"]["Enums"]["feedback_status"]
          type?: Database["public"]["Enums"]["feedback_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          status?: Database["public"]["Enums"]["feedback_status"]
          type?: Database["public"]["Enums"]["feedback_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      // Hand-added, not yet regenerated from the live database via
      // `supabase gen types` — see supabase/migrations/20260814000000_form_submissions.sql.
      // Keep this in sync with that migration until the migration has
      // actually been applied to the live project and types regenerated for real.
      form_submissions: {
        Row: {
          created_at: string
          data: Json
          form_name: string
          id: string
          page_slug: string
          project_id: string
          submitter_ip_hash: string | null
        }
        Insert: {
          created_at?: string
          data: Json
          form_name?: string
          id?: string
          page_slug?: string
          project_id: string
          submitter_ip_hash?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          form_name?: string
          id?: string
          page_slug?: string
          project_id?: string
          submitter_ip_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invited_email: string | null
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_email?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_email?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      // Hand-added, not yet regenerated from the live database via
      // `supabase gen types` — see supabase/migrations/20260814000001_page_views.sql.
      page_views: {
        Row: {
          created_at: string
          id: string
          path: string
          project_id: string
          referrer: string | null
          visitor_hash: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          path?: string
          project_id: string
          referrer?: string | null
          visitor_hash?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          path?: string
          project_id?: string
          referrer?: string | null
          visitor_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_views_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          paddle_transaction_id: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          paddle_transaction_id: string
          status: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          paddle_transaction_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      project_versions: {
        Row: {
          created_at: string
          files: Json
          id: string
          pages: Json | null
          project_id: string
          prompt_answers: Json
          version: number
        }
        Insert: {
          created_at?: string
          files: Json
          id?: string
          pages?: Json | null
          project_id: string
          prompt_answers?: Json
          version: number
        }
        Update: {
          created_at?: string
          files?: Json
          id?: string
          pages?: Json | null
          project_id?: string
          prompt_answers?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          archived: boolean
          created_at: string
          current_version: number
          description: string | null
          id: string
          name: string
          organization_id: string | null
          seo_description: string | null
          seo_og_image_url: string | null
          seo_title: string | null
          status: string
          template_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          current_version?: number
          description?: string | null
          id?: string
          name: string
          organization_id?: string | null
          seo_description?: string | null
          seo_og_image_url?: string | null
          seo_title?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          current_version?: number
          description?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          seo_description?: string | null
          seo_og_image_url?: string | null
          seo_title?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          credits_allowance: number
          credits_remaining: number
          id: string
          paddle_customer_id: string | null
          paddle_subscription_id: string | null
          plan: Database["public"]["Enums"]["plan_type"]
          provider: string
          renews_at: string
          status: Database["public"]["Enums"]["sub_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          credits_allowance?: number
          credits_remaining?: number
          id?: string
          paddle_customer_id?: string | null
          paddle_subscription_id?: string | null
          plan?: Database["public"]["Enums"]["plan_type"]
          provider?: string
          renews_at?: string
          status?: Database["public"]["Enums"]["sub_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          credits_allowance?: number
          credits_remaining?: number
          id?: string
          paddle_customer_id?: string | null
          paddle_subscription_id?: string | null
          plan?: Database["public"]["Enums"]["plan_type"]
          provider?: string
          renews_at?: string
          status?: Database["public"]["Enums"]["sub_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          category: string
          created_at: string
          id: string
          name: string
          structure: Json
          thumbnail: string | null
          tier_required: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          name: string
          structure?: Json
          thumbnail?: string | null
          tier_required?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
          structure?: Json
          thumbnail?: string | null
          tier_required?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrement_credits: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      deploy_token_decrypt: { Args: { p_secret_id: string }; Returns: string }
      deploy_token_encrypt: { Args: { p_token: string }; Returns: string }
      increment_credits: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_org_member: { Args: { p_org_id: string }; Returns: boolean }
    }
    Enums: {
      feedback_status: "open" | "reviewed" | "closed"
      feedback_type: "bug" | "feature" | "other"
      org_role: "owner" | "member"
      plan_type: "free" | "starter" | "pro" | "business"
      sub_status: "active" | "past_due" | "canceled" | "paused"
      user_role: "user" | "admin"
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
      feedback_status: ["open", "reviewed", "closed"],
      feedback_type: ["bug", "feature", "other"],
      org_role: ["owner", "member"],
      plan_type: ["free", "starter", "pro", "business"],
      sub_status: ["active", "past_due", "canceled", "paused"],
      user_role: ["user", "admin"],
    },
  },
} as const
