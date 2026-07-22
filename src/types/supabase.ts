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
      advance_requests: {
        Row: {
          amount: number
          company_id: string
          created_at: string | null
          decided_at: string | null
          decided_by: string | null
          id: string
          profile_id: string
          reason: string | null
          status: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          profile_id: string
          reason?: string | null
          status?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          profile_id?: string
          reason?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "advance_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advance_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "monthly_salary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "advance_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advance_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "monthly_salary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "advance_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          level_zone: string | null
          profile_id: string
          project_id: string
          role_on_site: string | null
          shift_end: string | null
          shift_start: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          level_zone?: string | null
          profile_id: string
          project_id: string
          role_on_site?: string | null
          shift_end?: string | null
          shift_start?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          level_zone?: string | null
          profile_id?: string
          project_id?: string
          role_on_site?: string | null
          shift_end?: string | null
          shift_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "monthly_salary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "assignments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          check_in_at: string | null
          check_in_lat: number | null
          check_in_lng: number | null
          check_in_selfie_url: string | null
          check_out_at: string | null
          created_at: string | null
          date: string
          id: string
          location_verified: boolean | null
          ot_min: number | null
          profile_id: string
          project_id: string
          status: string
          synced: boolean | null
          work_duration_min: number | null
        }
        Insert: {
          check_in_at?: string | null
          check_in_lat?: number | null
          check_in_lng?: number | null
          check_in_selfie_url?: string | null
          check_out_at?: string | null
          created_at?: string | null
          date: string
          id?: string
          location_verified?: boolean | null
          ot_min?: number | null
          profile_id: string
          project_id: string
          status?: string
          synced?: boolean | null
          work_duration_min?: number | null
        }
        Update: {
          check_in_at?: string | null
          check_in_lat?: number | null
          check_in_lng?: number | null
          check_in_selfie_url?: string | null
          check_out_at?: string | null
          created_at?: string | null
          date?: string
          id?: string
          location_verified?: boolean | null
          ot_min?: number | null
          profile_id?: string
          project_id?: string
          status?: string
          synced?: boolean | null
          work_duration_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "monthly_salary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "attendance_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          company_id: string
          created_at: string | null
          detail: Json | null
          id: string
          ref_id: string | null
          ref_table: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          company_id: string
          created_at?: string | null
          detail?: Json | null
          id?: string
          ref_id?: string | null
          ref_table?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          company_id?: string
          created_at?: string | null
          detail?: Json | null
          id?: string
          ref_id?: string | null
          ref_table?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "monthly_salary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_approvals: {
        Row: {
          created_at: string | null
          decided_at: string | null
          details: Json | null
          id: string
          photos: string[] | null
          project_id: string
          request_code: string | null
          requested_by: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string | null
          decided_at?: string | null
          details?: Json | null
          id?: string
          photos?: string[] | null
          project_id: string
          request_code?: string | null
          requested_by: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string | null
          decided_at?: string | null
          details?: Json | null
          id?: string
          photos?: string[] | null
          project_id?: string
          request_code?: string | null
          requested_by?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_approvals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_approvals_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "monthly_salary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "client_approvals_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_orgs: {
        Row: {
          company_id: string
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          company_id: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          company_id?: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_orgs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          city: string | null
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
          settings: Json | null
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          settings?: Json | null
        }
        Update: {
          city?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          settings?: Json | null
        }
        Relationships: []
      }
      conversation_members: {
        Row: {
          conversation_id: string
          profile_id: string
        }
        Insert: {
          conversation_id: string
          profile_id: string
        }
        Update: {
          conversation_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "monthly_salary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "conversation_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          project_id: string | null
          type: string
          title: string | null
          created_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          project_id?: string | null
          type: string
          title?: string | null
          created_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          project_id?: string | null
          type?: string
          title?: string | null
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          challan_pdf_path: string | null
          created_at: string | null
          delivered_at: string | null
          delivery_code: string | null
          id: string
          material_request_id: string | null
          photos: string[] | null
          project_id: string
          status: string
        }
        Insert: {
          challan_pdf_path?: string | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_code?: string | null
          id?: string
          material_request_id?: string | null
          photos?: string[] | null
          project_id: string
          status?: string
        }
        Update: {
          challan_pdf_path?: string | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_code?: string | null
          id?: string
          material_request_id?: string | null
          photos?: string[] | null
          project_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_material_request_id_fkey"
            columns: ["material_request_id"]
            isOneToOne: false
            referencedRelation: "material_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          created_at: string | null
          document_id: string
          id: string
          is_current: boolean | null
          rev_no: number
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          document_id: string
          id?: string
          is_current?: boolean | null
          rev_no: number
          storage_path: string
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          document_id?: string
          id?: string
          is_current?: boolean | null
          rev_no?: number
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "monthly_salary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "document_versions_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string
          company_id: string
          created_at: string | null
          id: string
          owner_id: string
          owner_type: string
          title: string
          uploaded_by: string
        }
        Insert: {
          category: string
          company_id: string
          created_at?: string | null
          id?: string
          owner_id: string
          owner_type: string
          title: string
          uploaded_by: string
        }
        Update: {
          category?: string
          company_id?: string
          created_at?: string | null
          id?: string
          owner_id?: string
          owner_type?: string
          title?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "monthly_salary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dpr_media: {
        Row: {
          created_at: string | null
          dpr_id: string
          duration_s: number | null
          id: string
          storage_path: string
          type: string
        }
        Insert: {
          created_at?: string | null
          dpr_id: string
          duration_s?: number | null
          id?: string
          storage_path: string
          type: string
        }
        Update: {
          created_at?: string | null
          dpr_id?: string
          duration_s?: number | null
          id?: string
          storage_path?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "dpr_media_dpr_id_fkey"
            columns: ["dpr_id"]
            isOneToOne: false
            referencedRelation: "dprs"
            referencedColumns: ["id"]
          },
        ]
      }
      dprs: {
        Row: {
          created_at: string | null
          date: string
          id: string
          level_zone: string | null
          offline_id: string | null
          project_id: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submission_id: string | null
          submitted_by: string
          synced: boolean | null
          weather: string | null
          work_done: string
          work_type: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          level_zone?: string | null
          offline_id?: string | null
          project_id: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submission_id?: string | null
          submitted_by: string
          synced?: boolean | null
          weather?: string | null
          work_done: string
          work_type?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          level_zone?: string | null
          offline_id?: string | null
          project_id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submission_id?: string | null
          submitted_by?: string
          synced?: boolean | null
          weather?: string | null
          work_done?: string
          work_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dprs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dprs_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "monthly_salary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "dprs_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dprs_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "monthly_salary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "dprs_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_requests: {
        Row: {
          company_id: string
          created_at: string | null
          decided_at: string | null
          decided_by: string | null
          headcount: number
          id: string
          needed_by: string | null
          notes: string | null
          project_id: string
          requested_by: string
          role_needed: string
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          headcount?: number
          id?: string
          needed_by?: string | null
          notes?: string | null
          project_id: string
          requested_by: string
          role_needed: string
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          headcount?: number
          id?: string
          needed_by?: string | null
          notes?: string | null
          project_id?: string
          requested_by?: string
          role_needed?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "monthly_salary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "employee_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "monthly_salary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "employee_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          date: string
          description: string
          entered_by: string
          id: string
          project_id: string
          receipt_photo_path: string | null
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          date?: string
          description: string
          entered_by: string
          id?: string
          project_id: string
          receipt_photo_path?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          date?: string
          description?: string
          entered_by?: string
          id?: string
          project_id?: string
          receipt_photo_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "monthly_salary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "expenses_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          attachment_path: string | null
          company_id: string
          created_at: string | null
          decided_at: string | null
          decided_by: string | null
          from_date: string
          id: string
          profile_id: string
          reason: string | null
          status: string
          to_date: string
          type: string
        }
        Insert: {
          attachment_path?: string | null
          company_id: string
          created_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          from_date: string
          id?: string
          profile_id: string
          reason?: string | null
          status?: string
          to_date: string
          type: string
        }
        Update: {
          attachment_path?: string | null
          company_id?: string
          created_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          from_date?: string
          id?: string
          profile_id?: string
          reason?: string | null
          status?: string
          to_date?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "monthly_salary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "leave_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "monthly_salary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "leave_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      material_requests: {
        Row: {
          created_at: string | null
          decided_at: string | null
          decided_by: string | null
          id: string
          material_name: string
          needed_by: string | null
          notes: string | null
          photo_path: string | null
          project_id: string
          qty: number
          requested_by: string
          spec: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          material_name: string
          needed_by?: string | null
          notes?: string | null
          photo_path?: string | null
          project_id: string
          qty: number
          requested_by: string
          spec?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          material_name?: string
          needed_by?: string | null
          notes?: string | null
          photo_path?: string | null
          project_id?: string
          qty?: number
          requested_by?: string
          spec?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "monthly_salary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "material_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "monthly_salary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "material_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          created_at: string | null
          id: string
          name: string
          project_id: string
          spec: string | null
          stock_qty: number | null
          unit: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          project_id: string
          spec?: string | null
          stock_qty?: number | null
          unit?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          project_id?: string
          spec?: string | null
          stock_qty?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_path: string | null
          body: string | null
          conversation_id: string
          created_at: string | null
          id: string
          sender_id: string
        }
        Insert: {
          attachment_path?: string | null
          body?: string | null
          conversation_id: string
          created_at?: string | null
          id?: string
          sender_id: string
        }
        Update: {
          attachment_path?: string | null
          body?: string | null
          conversation_id?: string
          created_at?: string | null
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "monthly_salary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          chat_updates: boolean
          dpr_updates: boolean
          leave_updates: boolean
          material_updates: boolean
          payment_updates: boolean
          profile_id: string
          push_enabled: boolean
          task_updates: boolean
          updated_at: string
        }
        Insert: {
          chat_updates?: boolean
          dpr_updates?: boolean
          leave_updates?: boolean
          material_updates?: boolean
          payment_updates?: boolean
          profile_id: string
          push_enabled?: boolean
          task_updates?: boolean
          updated_at?: string
        }
        Update: {
          chat_updates?: boolean
          dpr_updates?: boolean
          leave_updates?: boolean
          material_updates?: boolean
          payment_updates?: boolean
          profile_id?: string
          push_enabled?: boolean
          task_updates?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "monthly_salary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "notification_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string | null
          id: string
          important: boolean | null
          kind: string
          read_at: string | null
          recipient_id: string
          ref_id: string | null
          ref_table: string | null
          title: string
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          important?: boolean | null
          kind: string
          read_at?: string | null
          recipient_id: string
          ref_id?: string | null
          ref_table?: string | null
          title: string
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          important?: boolean | null
          kind?: string
          read_at?: string | null
          recipient_id?: string
          ref_id?: string | null
          ref_table?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "monthly_salary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          due_date: string | null
          id: string
          milestone_name: string
          paid_at: string | null
          project_id: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          due_date?: string | null
          id?: string
          milestone_name: string
          paid_at?: string | null
          project_id: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          due_date?: string | null
          id?: string
          milestone_name?: string
          paid_at?: string | null
          project_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_todos: {
        Row: {
          completed_at: string | null
          created_at: string
          due_date: string | null
          id: string
          profile_id: string
          title: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          profile_id: string
          title: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          profile_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_todos_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "monthly_salary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "personal_todos_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          bank_account: string | null
          bank_details: Json | null
          bank_ifsc: string | null
          client_org_id: string | null
          company_id: string
          created_at: string | null
          daily_rate: number | null
          esi_number: string | null
          full_name: string
          id: string
          joining_date: string | null
          pan: string | null
          phone: string
          push_token: string | null
          reporting_to: string | null
          role: string
          status: string
          uan: string | null
          worker_id: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          bank_account?: string | null
          bank_details?: Json | null
          bank_ifsc?: string | null
          client_org_id?: string | null
          company_id: string
          created_at?: string | null
          daily_rate?: number | null
          esi_number?: string | null
          full_name: string
          id: string
          joining_date?: string | null
          pan?: string | null
          phone: string
          push_token?: string | null
          reporting_to?: string | null
          role: string
          status?: string
          uan?: string | null
          worker_id?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          bank_account?: string | null
          bank_details?: Json | null
          bank_ifsc?: string | null
          client_org_id?: string | null
          company_id?: string
          created_at?: string | null
          daily_rate?: number | null
          esi_number?: string | null
          full_name?: string
          id?: string
          joining_date?: string | null
          pan?: string | null
          phone?: string
          push_token?: string | null
          reporting_to?: string | null
          role?: string
          status?: string
          uan?: string | null
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_client_org_id_fkey"
            columns: ["client_org_id"]
            isOneToOne: false
            referencedRelation: "client_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_reporting_to_fkey"
            columns: ["reporting_to"]
            isOneToOne: false
            referencedRelation: "monthly_salary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "profiles_reporting_to_fkey"
            columns: ["reporting_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_templates: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          name: string
          payload: Json
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          name: string
          payload?: Json
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          name?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "project_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          address: string | null
          city: string | null
          client_org_id: string | null
          company_id: string
          created_at: string | null
          expected_end_date: string | null
          geofence_radius_m: number | null
          id: string
          lat: number | null
          lng: number | null
          name: string
          progress_pct: number | null
          stage: string | null
          start_date: string | null
          status: string
          type: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          client_org_id?: string | null
          company_id: string
          created_at?: string | null
          expected_end_date?: string | null
          geofence_radius_m?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          progress_pct?: number | null
          stage?: string | null
          start_date?: string | null
          status?: string
          type?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          client_org_id?: string | null
          company_id?: string
          created_at?: string | null
          expected_end_date?: string | null
          geofence_radius_m?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          progress_pct?: number | null
          stage?: string | null
          start_date?: string | null
          status?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_org_id_fkey"
            columns: ["client_org_id"]
            isOneToOne: false
            referencedRelation: "client_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_calculations: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          currency: string
          id: string
          line_items: Json
          subtotal: number
          tax_pct: number
          title: string
          total: number
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          currency?: string
          id?: string
          line_items?: Json
          subtotal?: number
          tax_pct?: number
          title: string
          total?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          currency?: string
          id?: string
          line_items?: Json
          subtotal?: number
          tax_pct?: number
          title?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_calculations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_calculations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "monthly_salary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "quote_calculations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_tasks: {
        Row: {
          active: boolean | null
          assigned_to: string | null
          company_id: string
          created_at: string | null
          frequency: string
          id: string
          level_zone: string | null
          priority: string | null
          project_id: string
          title: string
        }
        Insert: {
          active?: boolean | null
          assigned_to?: string | null
          company_id: string
          created_at?: string | null
          frequency: string
          id?: string
          level_zone?: string | null
          priority?: string | null
          project_id: string
          title: string
        }
        Update: {
          active?: boolean | null
          assigned_to?: string | null
          company_id?: string
          created_at?: string | null
          frequency?: string
          id?: string
          level_zone?: string | null
          priority?: string | null
          project_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "monthly_salary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "recurring_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          company_id: string
          id: string
          permissions: Json | null
          role: string
        }
        Insert: {
          company_id: string
          id?: string
          permissions?: Json | null
          role: string
        }
        Update: {
          company_id?: string
          id?: string
          permissions?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_checks: {
        Row: {
          concern_reported: string | null
          created_at: string | null
          date: string
          id: string
          items: Json
          profile_id: string
          project_id: string
        }
        Insert: {
          concern_reported?: string | null
          created_at?: string | null
          date?: string
          id?: string
          items: Json
          profile_id: string
          project_id: string
        }
        Update: {
          concern_reported?: string | null
          created_at?: string | null
          date?: string
          id?: string
          items?: Json
          profile_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_checks_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "monthly_salary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "safety_checks_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_checks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          created_by: string
          id: string
          level_zone: string | null
          priority: string | null
          project_id: string
          recurring_task_id: string | null
          status: string
          title: string
          window_end: string | null
          window_start: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          created_by: string
          id?: string
          level_zone?: string | null
          priority?: string | null
          project_id: string
          recurring_task_id?: string | null
          status?: string
          title: string
          window_end?: string | null
          window_start?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string
          id?: string
          level_zone?: string | null
          priority?: string | null
          project_id?: string
          recurring_task_id?: string | null
          status?: string
          title?: string
          window_end?: string | null
          window_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "monthly_salary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "monthly_salary"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_recurring_task_id_fkey"
            columns: ["recurring_task_id"]
            isOneToOne: false
            referencedRelation: "recurring_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      monthly_salary: {
        Row: {
          advances_taken: number | null
          company_id: string | null
          daily_rate: number | null
          full_name: string | null
          half_days: number | null
          month: string | null
          ot_hours: number | null
          payable: number | null
          present_days: number | null
          profile_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_my_profile: {
        Args: never
        Returns: {
          address: string | null
          avatar_url: string | null
          bank_account: string | null
          bank_details: Json | null
          bank_ifsc: string | null
          client_org_id: string | null
          company_id: string
          created_at: string | null
          daily_rate: number | null
          esi_number: string | null
          full_name: string
          id: string
          joining_date: string | null
          pan: string | null
          phone: string
          push_token: string | null
          reporting_to: string | null
          role: string
          status: string
          uan: string | null
          worker_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_signed_media_url: {
        Args: { bucket_name: string; expires_in?: number; object_path: string }
        Returns: Json
      }
      is_admin_role: { Args: never; Returns: boolean }
      is_assigned_to_project: { Args: { p_id: string }; Returns: boolean }
      is_conversation_member: { Args: { conv_id: string }; Returns: boolean }
      join_project_chat: { Args: { p_project_id: string }; Returns: string }
      my_client_org_id: { Args: never; Returns: string }
      my_company_id: { Args: never; Returns: string }
      my_role: { Args: never; Returns: string }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      start_direct_chat: { Args: { other_profile_id: string }; Returns: string }
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

