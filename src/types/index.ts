export type Database = {
  public: {
    Tables: {
      roles: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          role_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          name: string;
          mobile: string;
          dob: string;
          email: string | null;
          password_hash: string | null;
          visit_count: number;
          total_time_spent: number;
          total_spent: number;
          last_visit: string | null;
          failed_attempts: number;
          locked_until: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          mobile: string;
          dob: string;
          email?: string | null;
          password_hash?: string | null;
          visit_count?: number;
          total_time_spent?: number;
          total_spent?: number;
          last_visit?: string | null;
          failed_attempts?: number;
          locked_until?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          mobile?: string;
          dob?: string;
          email?: string | null;
          password_hash?: string | null;
          visit_count?: number;
          total_time_spent?: number;
          total_spent?: number;
          last_visit?: string | null;
          failed_attempts?: number;
          locked_until?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      verification_attempts: {
        Row: {
          id: string;
          customer_id: string;
          step: string;
          success: boolean;
          ip_address: string | null;
          user_agent: string | null;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          step: string;
          success?: boolean;
          ip_address?: string | null;
          user_agent?: string | null;
          error_message?: string | null;
          created_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          action: string;
          entity_type: string | null;
          entity_id: string | null;
          details: any;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          action: string;
          entity_type?: string | null;
          entity_id?: string | null;
          details?: any;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
      otps: {
        Row: {
          id: string;
          customer_id: string;
          code: string;
          type: string;
          expires_at: string;
          verified: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          code: string;
          type: string;
          expires_at: string;
          verified?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          code?: string;
          type?: string;
          expires_at?: string;
          verified?: boolean;
          created_at?: string;
        };
      };
      offers_promotions: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          discount_percent: number | null;
          flat_discount: number | null;
          valid_from: string;
          valid_until: string;
          is_active: boolean;
          image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          discount_percent?: number | null;
          flat_discount?: number | null;
          valid_from: string;
          valid_until: string;
          is_active?: boolean;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          discount_percent?: number | null;
          flat_discount?: number | null;
          valid_from?: string;
          valid_until?: string;
          is_active?: boolean;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      zones: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          rate_per_hour: number;
          color: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          rate_per_hour: number;
          color?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          rate_per_hour?: number;
          color?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      stations: {
        Row: {
          id: string;
          zone_id: string;
          name: string;
          status: string;
          row: number | null;
          col: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          zone_id: string;
          name: string;
          status?: string;
          row?: number | null;
          col?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          zone_id?: string;
          name?: string;
          status?: string;
          row?: number | null;
          col?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      reservations: {
        Row: {
          id: string;
          customer_id: string | null;
          zone_id: string;
          station_id: string | null;
          date: string;
          start_time: string;
          end_time: string;
          status: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id?: string | null;
          zone_id: string;
          station_id?: string | null;
          date: string;
          start_time: string;
          end_time: string;
          status?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string | null;
          zone_id?: string;
          station_id?: string | null;
          date?: string;
          start_time?: string;
          end_time?: string;
          status?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      sessions: {
        Row: {
          id: string;
          customer_id: string | null;
          station_id: string;
          zone_id: string;
          status: string;
          start_time: string;
          end_time: string | null;
          total_duration: number;
          total_charges: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id?: string | null;
          station_id: string;
          zone_id: string;
          status?: string;
          start_time?: string;
          end_time?: string | null;
          total_duration?: number;
          total_charges?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string | null;
          station_id?: string;
          zone_id?: string;
          status?: string;
          start_time?: string;
          end_time?: string | null;
          total_duration?: number;
          total_charges?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      session_logs: {
        Row: {
          id: string;
          session_id: string;
          action: string;
          timestamp: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          action: string;
          timestamp?: string;
          created_at?: string;
        };
      };
      menu_categories: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      menu_items: {
        Row: {
          id: string;
          category_id: string | null;
          name: string;
          description: string | null;
          price: number;
          image_url: string | null;
          is_available: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id?: string | null;
          name: string;
          description?: string | null;
          price: number;
          image_url?: string | null;
          is_available?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string | null;
          name?: string;
          description?: string | null;
          price?: number;
          image_url?: string | null;
          is_available?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          session_id: string | null;
          customer_id: string | null;
          status: string;
          total: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id?: string | null;
          customer_id?: string | null;
          status?: string;
          total?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string | null;
          customer_id?: string | null;
          status?: string;
          total?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          menu_item_id: string | null;
          quantity: number;
          price: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          menu_item_id?: string | null;
          quantity?: number;
          price: number;
          created_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          session_id: string | null;
          order_id: string | null;
          amount: number;
          method: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id?: string | null;
          order_id?: string | null;
          amount: number;
          method: string;
          status?: string;
          created_at?: string;
        };
      };
    };
  };
};

export type Role = Database['public']['Tables']['roles']['Row'];
export type User = Database['public']['Tables']['users']['Row'];
export type Customer = Database['public']['Tables']['customers']['Row'];
export type VerificationAttempt = Database['public']['Tables']['verification_attempts']['Row'];
export type AuditLog = Database['public']['Tables']['audit_logs']['Row'];
export type OTP = Database['public']['Tables']['otps']['Row'];
export type OfferPromotion = Database['public']['Tables']['offers_promotions']['Row'];
export type Zone = Database['public']['Tables']['zones']['Row'];
export type Station = Database['public']['Tables']['stations']['Row'];
export type Reservation = Database['public']['Tables']['reservations']['Row'];
export type Session = Database['public']['Tables']['sessions']['Row'];
export type MenuCategory = Database['public']['Tables']['menu_categories']['Row'];
export type MenuItem = Database['public']['Tables']['menu_items']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderItem = Database['public']['Tables']['order_items']['Row'];
export type Payment = Database['public']['Tables']['payments']['Row'];
