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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          id: string
          theme: string
          updated_at: string
        }
        Insert: {
          id?: string
          theme?: string
          updated_at?: string
        }
        Update: {
          id?: string
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      branches: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          area_locality: string | null
          branch_name: string
          branch_phone: string | null
          branch_type: string | null
          city: string | null
          country: string | null
          created_at: string
          district: string | null
          email_address: string | null
          gstin: string | null
          id: string
          landmark: string | null
          manager_designation: string | null
          manager_email: string | null
          manager_mobile: string | null
          manager_name: string | null
          mobile_number: string | null
          pan: string | null
          pin_code: string | null
          state: string | null
          state_code: string | null
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          area_locality?: string | null
          branch_name: string
          branch_phone?: string | null
          branch_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          district?: string | null
          email_address?: string | null
          gstin?: string | null
          id?: string
          landmark?: string | null
          manager_designation?: string | null
          manager_email?: string | null
          manager_mobile?: string | null
          manager_name?: string | null
          mobile_number?: string | null
          pan?: string | null
          pin_code?: string | null
          state?: string | null
          state_code?: string | null
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          area_locality?: string | null
          branch_name?: string
          branch_phone?: string | null
          branch_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          district?: string | null
          email_address?: string | null
          gstin?: string | null
          id?: string
          landmark?: string | null
          manager_designation?: string | null
          manager_email?: string | null
          manager_mobile?: string | null
          manager_name?: string | null
          mobile_number?: string | null
          pan?: string | null
          pin_code?: string | null
          state?: string | null
          state_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      company: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          cin: string | null
          city: string | null
          company_name: string
          company_type: string | null
          country: string | null
          created_at: string
          email: string | null
          gstin: string | null
          id: string
          iec: string | null
          industry: string | null
          legal_business_name: string | null
          mobile_number: string | null
          msme_udyam: string | null
          pan: string | null
          pin_code: string | null
          state: string | null
          tan: string | null
          telephone_number: string | null
          transport_license_number: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          cin?: string | null
          city?: string | null
          company_name?: string
          company_type?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          gstin?: string | null
          id?: string
          iec?: string | null
          industry?: string | null
          legal_business_name?: string | null
          mobile_number?: string | null
          msme_udyam?: string | null
          pan?: string | null
          pin_code?: string | null
          state?: string | null
          tan?: string | null
          telephone_number?: string | null
          transport_license_number?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          cin?: string | null
          city?: string | null
          company_name?: string
          company_type?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          gstin?: string | null
          id?: string
          iec?: string | null
          industry?: string | null
          legal_business_name?: string | null
          mobile_number?: string | null
          msme_udyam?: string | null
          pan?: string | null
          pin_code?: string | null
          state?: string | null
          tan?: string | null
          telephone_number?: string | null
          transport_license_number?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      drivers: {
        Row: {
          aadhaar_number: string | null
          alternate_mobile: string | null
          bank_account_holder: string | null
          bank_account_number: string | null
          bank_branch: string | null
          bank_ifsc: string | null
          bank_name: string | null
          blood_group: string | null
          created_at: string
          curr_address_line1: string | null
          curr_address_line2: string | null
          curr_city: string | null
          curr_country: string | null
          curr_pin_code: string | null
          curr_same_as_perm: string | null
          curr_state: string | null
          date_of_birth: string | null
          department_id: string | null
          driver_code: string
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_number: string | null
          emergency_contact_relationship: string | null
          full_name: string
          gender: string | null
          guardian_name: string | null
          id: string
          licence_authority: string | null
          licence_expiry_date: string | null
          licence_issue_date: string | null
          licence_number: string | null
          licence_type: string | null
          marital_status: string | null
          mobile_number: string | null
          pan_number: string | null
          perm_address_line1: string | null
          perm_address_line2: string | null
          perm_city: string | null
          perm_country: string | null
          perm_pin_code: string | null
          perm_state: string | null
          salary_amount: string | null
          salary_type: string | null
          updated_at: string
          upi_id: string | null
        }
        Insert: {
          aadhaar_number?: string | null
          alternate_mobile?: string | null
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          blood_group?: string | null
          created_at?: string
          curr_address_line1?: string | null
          curr_address_line2?: string | null
          curr_city?: string | null
          curr_country?: string | null
          curr_pin_code?: string | null
          curr_same_as_perm?: string | null
          curr_state?: string | null
          date_of_birth?: string | null
          department_id?: string | null
          driver_code: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_number?: string | null
          emergency_contact_relationship?: string | null
          full_name: string
          gender?: string | null
          guardian_name?: string | null
          id?: string
          licence_authority?: string | null
          licence_expiry_date?: string | null
          licence_issue_date?: string | null
          licence_number?: string | null
          licence_type?: string | null
          marital_status?: string | null
          mobile_number?: string | null
          pan_number?: string | null
          perm_address_line1?: string | null
          perm_address_line2?: string | null
          perm_city?: string | null
          perm_country?: string | null
          perm_pin_code?: string | null
          perm_state?: string | null
          salary_amount?: string | null
          salary_type?: string | null
          updated_at?: string
          upi_id?: string | null
        }
        Update: {
          aadhaar_number?: string | null
          alternate_mobile?: string | null
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          blood_group?: string | null
          created_at?: string
          curr_address_line1?: string | null
          curr_address_line2?: string | null
          curr_city?: string | null
          curr_country?: string | null
          curr_pin_code?: string | null
          curr_same_as_perm?: string | null
          curr_state?: string | null
          date_of_birth?: string | null
          department_id?: string | null
          driver_code?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_number?: string | null
          emergency_contact_relationship?: string | null
          full_name?: string
          gender?: string | null
          guardian_name?: string | null
          id?: string
          licence_authority?: string | null
          licence_expiry_date?: string | null
          licence_issue_date?: string | null
          licence_number?: string | null
          licence_type?: string | null
          marital_status?: string | null
          mobile_number?: string | null
          pan_number?: string | null
          perm_address_line1?: string | null
          perm_address_line2?: string | null
          perm_city?: string | null
          perm_country?: string | null
          perm_pin_code?: string | null
          perm_state?: string | null
          salary_amount?: string | null
          salary_type?: string | null
          updated_at?: string
          upi_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          district: string | null
          id: string
          location_name: string
          location_type: string | null
          pin_code: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          district?: string | null
          id?: string
          location_name: string
          location_type?: string | null
          pin_code?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          district?: string | null
          id?: string
          location_name?: string
          location_type?: string | null
          pin_code?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      transporters: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          alternate_mobile: string | null
          bank_account_holder: string | null
          bank_account_number: string | null
          bank_branch: string | null
          bank_ifsc: string | null
          bank_name: string | null
          city: string | null
          country: string | null
          created_at: string
          department_id: string | null
          email: string | null
          gstin: string | null
          id: string
          legal_business_name: string | null
          mobile_number: string | null
          msme_udyam: string | null
          pan: string | null
          pin_code: string | null
          primary_contact_designation: string | null
          primary_contact_name: string | null
          state: string | null
          tan: string | null
          telephone: string | null
          transporter_name: string
          transporter_type: string | null
          updated_at: string
          upi_id: string | null
          website: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          alternate_mobile?: string | null
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          department_id?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          legal_business_name?: string | null
          mobile_number?: string | null
          msme_udyam?: string | null
          pan?: string | null
          pin_code?: string | null
          primary_contact_designation?: string | null
          primary_contact_name?: string | null
          state?: string | null
          tan?: string | null
          telephone?: string | null
          transporter_name: string
          transporter_type?: string | null
          updated_at?: string
          upi_id?: string | null
          website?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          alternate_mobile?: string | null
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          department_id?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          legal_business_name?: string | null
          mobile_number?: string | null
          msme_udyam?: string | null
          pan?: string | null
          pin_code?: string | null
          primary_contact_designation?: string | null
          primary_contact_name?: string | null
          state?: string | null
          tan?: string | null
          telephone?: string | null
          transporter_name?: string
          transporter_type?: string | null
          updated_at?: string
          upi_id?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transporters_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          created_at: string
          department_id: string | null
          fuel_type: string | null
          id: string
          internal_code: string | null
          manufacturer: string | null
          model: string | null
          nickname: string | null
          payload_capacity_kg: string | null
          purchase_cost: string | null
          purchase_date: string | null
          registration_number: string
          updated_at: string
          year_of_manufacture: string | null
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          fuel_type?: string | null
          id?: string
          internal_code?: string | null
          manufacturer?: string | null
          model?: string | null
          nickname?: string | null
          payload_capacity_kg?: string | null
          purchase_cost?: string | null
          purchase_date?: string | null
          registration_number: string
          updated_at?: string
          year_of_manufacture?: string | null
        }
        Update: {
          created_at?: string
          department_id?: string | null
          fuel_type?: string | null
          id?: string
          internal_code?: string | null
          manufacturer?: string | null
          model?: string | null
          nickname?: string | null
          payload_capacity_kg?: string | null
          purchase_cost?: string | null
          purchase_date?: string | null
          registration_number?: string
          updated_at?: string
          year_of_manufacture?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
