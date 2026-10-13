/**
 * বাসাখুঁজি বাংলাদেশ — হাতে লেখা Supabase Database টাইপ (Phase 1)।
 * database/schema.sql + database/functions.sql থেকে বানানো; বাস্তব কলাম-নামসহ।
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/* ---------- Enums ---------- */

export type UserRole = "tenant" | "landlord" | "moderator" | "admin" | "super_admin";
export type PropertyStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "suspended"
  | "expired"
  | "rented"
  | "inactive";
export type PropertyType = "flat" | "house" | "room" | "sublet" | "office" | "shop" | "plot";
export type FurnishedState = "unfurnished" | "semi_furnished" | "furnished";
export type NoticeType = "information" | "announcement" | "maintenance" | "safety_alert" | "policy_update";
export type Audience = "all" | "tenants" | "landlords";
export type ReportStatus = "open" | "in_review" | "resolved" | "dismissed";
export type PaymentStatus = "pending" | "success" | "failed" | "refunded";

/* ---------- Tables: Row / Insert / Update ---------- */

export type ProfilesRow = {
  id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  is_suspended: boolean;
  created_at: string;
  updated_at: string;
};
export type ProfilesInsert = {
  id: string;
  full_name: string;
  phone?: string | null;
  avatar_url?: string | null;
  is_verified?: boolean;
  is_suspended?: boolean;
  created_at?: string;
  updated_at?: string;
};
export type ProfilesUpdate = Partial<ProfilesRow>;

export type UserRolesRow = {
  user_id: string;
  role: UserRole;
  granted_by: string | null;
  granted_at: string;
};
export type UserRolesInsert = {
  user_id: string;
  role?: UserRole;
  granted_by?: string | null;
  granted_at?: string;
};
export type UserRolesUpdate = Partial<UserRolesRow>;

export type PropertiesRow = {
  id: string;
  listing_no: string;
  landlord_id: string;
  title: string;
  description: string | null;
  property_type: PropertyType;
  district: string;
  upazila: string | null;
  area: string;
  address_text: string | null;
  latitude: number | null;
  longitude: number | null;
  monthly_rent: number;
  advance_amount: number | null;
  security_deposit: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  size_sqft: number | null;
  floor_no: number | null;
  furnished: FurnishedState;
  available_from: string | null;
  status: PropertyStatus;
  is_verified: boolean;
  published_at: string | null;
  expires_at: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
};
export type PropertiesInsert = {
  id?: string;
  listing_no: string;
  landlord_id: string;
  title: string;
  description?: string | null;
  property_type: PropertyType;
  district: string;
  upazila?: string | null;
  area: string;
  address_text?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  monthly_rent: number;
  advance_amount?: number | null;
  security_deposit?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  size_sqft?: number | null;
  floor_no?: number | null;
  furnished?: FurnishedState;
  available_from?: string | null;
  status?: PropertyStatus;
  is_verified?: boolean;
  published_at?: string | null;
  expires_at?: string | null;
  view_count?: number;
  created_at?: string;
  updated_at?: string;
};
export type PropertiesUpdate = Partial<PropertiesRow>;

export type PropertyImagesRow = {
  id: string;
  property_id: string;
  storage_path: string;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
};
export type PropertyImagesInsert = {
  id?: string;
  property_id: string;
  storage_path: string;
  sort_order?: number;
  is_primary?: boolean;
  created_at?: string;
};
export type PropertyImagesUpdate = Partial<PropertyImagesRow>;

export type PropertyAmenitiesRow = {
  property_id: string;
  amenity: string;
};
export type PropertyAmenitiesInsert = PropertyAmenitiesRow;
export type PropertyAmenitiesUpdate = Partial<PropertyAmenitiesRow>;

export type SavedPropertiesRow = {
  user_id: string;
  property_id: string;
  created_at: string;
};
export type SavedPropertiesInsert = {
  user_id: string;
  property_id: string;
  created_at?: string;
};
export type SavedPropertiesUpdate = Partial<SavedPropertiesRow>;

export type SearchAlertsRow = {
  id: string;
  user_id: string;
  filters: Json;
  is_active: boolean;
  created_at: string;
};
export type SearchAlertsInsert = {
  id?: string;
  user_id: string;
  filters?: Json;
  is_active?: boolean;
  created_at?: string;
};
export type SearchAlertsUpdate = Partial<SearchAlertsRow>;

export type ConversationsRow = {
  id: string;
  property_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};
export type ConversationsInsert = {
  id?: string;
  property_id?: string | null;
  created_by: string;
  created_at?: string;
  updated_at?: string;
};
export type ConversationsUpdate = Partial<ConversationsRow>;

export type ConversationMembersRow = {
  conversation_id: string;
  user_id: string;
  joined_at: string;
};
export type ConversationMembersInsert = {
  conversation_id: string;
  user_id: string;
  joined_at?: string;
};
export type ConversationMembersUpdate = Partial<ConversationMembersRow>;

export type MessagesRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  attachment_path: string | null;
  is_read: boolean;
  created_at: string;
};
export type MessagesInsert = {
  id?: string;
  conversation_id: string;
  sender_id: string;
  body?: string | null;
  attachment_path?: string | null;
  is_read?: boolean;
  created_at?: string;
};
export type MessagesUpdate = Partial<MessagesRow>;

export type NoticesRow = {
  id: string;
  title: string;
  body: string;
  notice_type: NoticeType;
  priority: number;
  target_audience: Audience;
  is_published: boolean;
  published_at: string | null;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};
export type NoticesInsert = {
  id?: string;
  title: string;
  body: string;
  notice_type?: NoticeType;
  priority?: number;
  target_audience?: Audience;
  is_published?: boolean;
  published_at?: string | null;
  expires_at?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
};
export type NoticesUpdate = Partial<NoticesRow>;

export type NotificationsRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  ref_type: string | null;
  ref_id: string | null;
  is_read: boolean;
  created_at: string;
};
export type NotificationsInsert = {
  id?: string;
  user_id: string;
  type: string;
  title: string;
  body?: string | null;
  ref_type?: string | null;
  ref_id?: string | null;
  is_read?: boolean;
  created_at?: string;
};
export type NotificationsUpdate = Partial<NotificationsRow>;

export type ReportsRow = {
  id: string;
  reporter_id: string;
  property_id: string | null;
  reported_user_id: string | null;
  reason: string;
  details: string | null;
  status: ReportStatus;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
};
export type ReportsInsert = {
  id?: string;
  reporter_id: string;
  property_id?: string | null;
  reported_user_id?: string | null;
  reason: string;
  details?: string | null;
  status?: ReportStatus;
  resolved_by?: string | null;
  resolved_at?: string | null;
  created_at?: string;
};
export type ReportsUpdate = Partial<ReportsRow>;

export type SubscriptionPlansRow = {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  features: Json;
  is_active: boolean;
  created_at: string;
};
export type SubscriptionPlansInsert = {
  id?: string;
  name: string;
  price?: number;
  duration_days?: number;
  features?: Json;
  is_active?: boolean;
  created_at?: string;
};
export type SubscriptionPlansUpdate = Partial<SubscriptionPlansRow>;

export type PaymentTransactionsRow = {
  id: string;
  user_id: string;
  property_id: string | null;
  plan_id: string | null;
  amount: number;
  currency: string;
  gateway: string | null;
  gateway_ref: string | null;
  status: PaymentStatus;
  created_at: string;
  updated_at: string;
};
export type PaymentTransactionsInsert = {
  id?: string;
  user_id: string;
  property_id?: string | null;
  plan_id?: string | null;
  amount: number;
  currency?: string;
  gateway?: string | null;
  gateway_ref?: string | null;
  status?: PaymentStatus;
  created_at?: string;
  updated_at?: string;
};
export type PaymentTransactionsUpdate = Partial<PaymentTransactionsRow>;

export type AuditLogsRow = {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Json | null;
  created_at: string;
};
export type AuditLogsInsert = {
  id?: string;
  actor_id?: string | null;
  action: string;
  target_type?: string | null;
  target_id?: string | null;
  details?: Json | null;
  created_at?: string;
};
export type AuditLogsUpdate = Partial<AuditLogsRow>;

export type AppSettingsRow = {
  key: string;
  value: Json;
  updated_at: string;
};
export type AppSettingsInsert = {
  key: string;
  value: Json;
  updated_at?: string;
};
export type AppSettingsUpdate = Partial<AppSettingsRow>;

/* ---------- RPC return row types ---------- */

export type ListingOwnerRow = {
  full_name: string;
  phone: string | null;
  is_verified: boolean;
};

export type ConversationPeerRow = {
  full_name: string;
  is_verified: boolean;
};

export type AdminUserRow = {
  user_id: string;
  full_name: string;
  phone: string | null;
  is_verified: boolean;
  is_suspended: boolean;
  role: string;
  listings_count: number;
  created_at: string;
};

export type AdminAuditRow = {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Json | null;
  created_at: string;
};

/* ---------- Database (supabase-js আকৃতি) ---------- */

export type Database = {
  public: {
    Tables: {
      profiles: { Row: ProfilesRow; Insert: ProfilesInsert; Update: ProfilesUpdate; Relationships: never[] };
      user_roles: { Row: UserRolesRow; Insert: UserRolesInsert; Update: UserRolesUpdate; Relationships: [{ foreignKeyName: "user_roles_user_id_fkey"; columns: ["user_id"]; isOneToOne: true; referencedRelation: "profiles"; referencedColumns: ["id"] }] };
      properties: { Row: PropertiesRow; Insert: PropertiesInsert; Update: PropertiesUpdate; Relationships: [{ foreignKeyName: "properties_landlord_id_fkey"; columns: ["landlord_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }] };
      property_images: { Row: PropertyImagesRow; Insert: PropertyImagesInsert; Update: PropertyImagesUpdate; Relationships: [{ foreignKeyName: "property_images_property_id_fkey"; columns: ["property_id"]; isOneToOne: false; referencedRelation: "properties"; referencedColumns: ["id"] }] };
      property_amenities: { Row: PropertyAmenitiesRow; Insert: PropertyAmenitiesInsert; Update: PropertyAmenitiesUpdate; Relationships: [{ foreignKeyName: "property_amenities_property_id_fkey"; columns: ["property_id"]; isOneToOne: false; referencedRelation: "properties"; referencedColumns: ["id"] }] };
      saved_properties: { Row: SavedPropertiesRow; Insert: SavedPropertiesInsert; Update: SavedPropertiesUpdate; Relationships: [{ foreignKeyName: "saved_properties_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }, { foreignKeyName: "saved_properties_property_id_fkey"; columns: ["property_id"]; isOneToOne: false; referencedRelation: "properties"; referencedColumns: ["id"] }] };
      search_alerts: { Row: SearchAlertsRow; Insert: SearchAlertsInsert; Update: SearchAlertsUpdate; Relationships: [{ foreignKeyName: "search_alerts_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }] };
      conversations: { Row: ConversationsRow; Insert: ConversationsInsert; Update: ConversationsUpdate; Relationships: [{ foreignKeyName: "conversations_property_id_fkey"; columns: ["property_id"]; isOneToOne: false; referencedRelation: "properties"; referencedColumns: ["id"] }] };
      conversation_members: { Row: ConversationMembersRow; Insert: ConversationMembersInsert; Update: ConversationMembersUpdate; Relationships: [{ foreignKeyName: "conversation_members_conversation_id_fkey"; columns: ["conversation_id"]; isOneToOne: false; referencedRelation: "conversations"; referencedColumns: ["id"] }, { foreignKeyName: "conversation_members_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }] };
      messages: { Row: MessagesRow; Insert: MessagesInsert; Update: MessagesUpdate; Relationships: [{ foreignKeyName: "messages_conversation_id_fkey"; columns: ["conversation_id"]; isOneToOne: false; referencedRelation: "conversations"; referencedColumns: ["id"] }, { foreignKeyName: "messages_sender_id_fkey"; columns: ["sender_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }] };
      notices: { Row: NoticesRow; Insert: NoticesInsert; Update: NoticesUpdate; Relationships: [{ foreignKeyName: "notices_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }] };
      notifications: { Row: NotificationsRow; Insert: NotificationsInsert; Update: NotificationsUpdate; Relationships: [{ foreignKeyName: "notifications_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }] };
      reports: { Row: ReportsRow; Insert: ReportsInsert; Update: ReportsUpdate; Relationships: [{ foreignKeyName: "reports_reporter_id_fkey"; columns: ["reporter_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }, { foreignKeyName: "reports_property_id_fkey"; columns: ["property_id"]; isOneToOne: false; referencedRelation: "properties"; referencedColumns: ["id"] }] };
      subscription_plans: { Row: SubscriptionPlansRow; Insert: SubscriptionPlansInsert; Update: SubscriptionPlansUpdate; Relationships: never[] };
      payment_transactions: { Row: PaymentTransactionsRow; Insert: PaymentTransactionsInsert; Update: PaymentTransactionsUpdate; Relationships: [{ foreignKeyName: "payment_transactions_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }, { foreignKeyName: "payment_transactions_property_id_fkey"; columns: ["property_id"]; isOneToOne: false; referencedRelation: "properties"; referencedColumns: ["id"] }, { foreignKeyName: "payment_transactions_plan_id_fkey"; columns: ["plan_id"]; isOneToOne: false; referencedRelation: "subscription_plans"; referencedColumns: ["id"] }] };
      audit_logs: { Row: AuditLogsRow; Insert: AuditLogsInsert; Update: AuditLogsUpdate; Relationships: [{ foreignKeyName: "audit_logs_actor_id_fkey"; columns: ["actor_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }] };
      app_settings: { Row: AppSettingsRow; Insert: AppSettingsInsert; Update: AppSettingsUpdate; Relationships: never[] };
    };
    Views: Record<string, never>;
    Functions: {
      my_role: { Args: Record<string, never>; Returns: string };
      listing_owner: { Args: { p_property_id: string }; Returns: ListingOwnerRow[] };
      conversation_peer: { Args: { p_conversation_id: string }; Returns: ConversationPeerRow[] };
      create_conversation_with_message: { Args: { p_property_id: string; p_body: string }; Returns: string };
      bump_listing_view: { Args: { p_id: string }; Returns: void };
      moderate_listing: { Args: { p_id: string; p_action: string; p_note?: string | null }; Returns: void };
      admin_stats: { Args: Record<string, never>; Returns: unknown };
      admin_list_users: { Args: Record<string, never>; Returns: AdminUserRow[] };
      set_user_role: { Args: { p_user: string; p_role: string }; Returns: void };
      set_user_suspended: { Args: { p_user: string; p_suspended: boolean }; Returns: void };
      resolve_report: { Args: { p_id: string; p_action: string; p_note?: string | null }; Returns: void };
      admin_recent_audit: { Args: { p_limit?: number }; Returns: AdminAuditRow[] };
      demand_by_area: {
        Args: Record<string, never>;
        Returns: {
          district: string;
          area: string | null;
          seekers: number;
          top_from: string | null;
        }[];
      };
    };
    Enums: {
      user_role: UserRole;
      property_status: PropertyStatus;
      property_type: PropertyType;
      furnished_state: FurnishedState;
      notice_type: NoticeType;
      audience: Audience;
      report_status: ReportStatus;
      payment_status: PaymentStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
