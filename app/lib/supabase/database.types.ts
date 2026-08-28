export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      anomalies: {
        Row: {
          assigned_profile_id: string | null
          assigned_vendor_id: string | null
          category_id: string
          closed_at: string | null
          closure_comment: string | null
          created_at: string
          current_status_id: string
          description: string
          detected_at: string
          equipment_id: string | null
          id: string
          intervention_due_at: string | null
          occurred_at: string
          priority_id: string
          qualification_due_at: string | null
          recovery_state: string
          reference: string
          reported_by_profile_id: string | null
          resolved_at: string | null
          risk_validated_at: string | null
          risk_validated_by_profile_id: string | null
          risk_validation_comment: string | null
          risk_validation_status: string
          root_cause: string | null
          source_report_id: string | null
          temporary_restored_at: string | null
          title: string
          updated_at: string
          version_no: number
          zone_id: string | null
        }
        Insert: {
          assigned_profile_id?: string | null
          assigned_vendor_id?: string | null
          category_id: string
          closed_at?: string | null
          closure_comment?: string | null
          created_at?: string
          current_status_id: string
          description: string
          detected_at?: string
          equipment_id?: string | null
          id?: string
          intervention_due_at?: string | null
          occurred_at?: string
          priority_id: string
          qualification_due_at?: string | null
          recovery_state?: string
          reference: string
          reported_by_profile_id?: string | null
          resolved_at?: string | null
          risk_validated_at?: string | null
          risk_validated_by_profile_id?: string | null
          risk_validation_comment?: string | null
          risk_validation_status?: string
          root_cause?: string | null
          source_report_id?: string | null
          temporary_restored_at?: string | null
          title: string
          updated_at?: string
          version_no?: number
          zone_id?: string | null
        }
        Update: {
          assigned_profile_id?: string | null
          assigned_vendor_id?: string | null
          category_id?: string
          closed_at?: string | null
          closure_comment?: string | null
          created_at?: string
          current_status_id?: string
          description?: string
          detected_at?: string
          equipment_id?: string | null
          id?: string
          intervention_due_at?: string | null
          occurred_at?: string
          priority_id?: string
          qualification_due_at?: string | null
          recovery_state?: string
          reference?: string
          reported_by_profile_id?: string | null
          resolved_at?: string | null
          risk_validated_at?: string | null
          risk_validated_by_profile_id?: string | null
          risk_validation_comment?: string | null
          risk_validation_status?: string
          root_cause?: string | null
          source_report_id?: string | null
          temporary_restored_at?: string | null
          title?: string
          updated_at?: string
          version_no?: number
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anomalies_assigned_profile_id_fkey"
            columns: ["assigned_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anomalies_assigned_vendor_id_fkey"
            columns: ["assigned_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anomalies_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anomalies_current_status_id_fkey"
            columns: ["current_status_id"]
            isOneToOne: false
            referencedRelation: "status_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anomalies_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anomalies_priority_id_fkey"
            columns: ["priority_id"]
            isOneToOne: false
            referencedRelation: "priority_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anomalies_reported_by_profile_id_fkey"
            columns: ["reported_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anomalies_risk_validated_by_profile_id_fkey"
            columns: ["risk_validated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anomalies_source_report_id_fkey"
            columns: ["source_report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anomalies_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      anomaly_history: {
        Row: {
          actor_profile_id: string | null
          anomaly_id: string
          change_set: Json
          comment: string | null
          event_type: string
          from_status_id: string | null
          id: string
          occurred_at: string
          to_status_id: string | null
          transaction_id: number
        }
        Insert: {
          actor_profile_id?: string | null
          anomaly_id: string
          change_set?: Json
          comment?: string | null
          event_type: string
          from_status_id?: string | null
          id?: string
          occurred_at?: string
          to_status_id?: string | null
          transaction_id?: number
        }
        Update: {
          actor_profile_id?: string | null
          anomaly_id?: string
          change_set?: Json
          comment?: string | null
          event_type?: string
          from_status_id?: string | null
          id?: string
          occurred_at?: string
          to_status_id?: string | null
          transaction_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "anomaly_history_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anomaly_history_anomaly_id_fkey"
            columns: ["anomaly_id"]
            isOneToOne: false
            referencedRelation: "anomalies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anomaly_history_from_status_id_fkey"
            columns: ["from_status_id"]
            isOneToOne: false
            referencedRelation: "status_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anomaly_history_to_status_id_fkey"
            columns: ["to_status_id"]
            isOneToOne: false
            referencedRelation: "status_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          actor_auth_user_id: string | null
          actor_profile_id: string | null
          changed_fields: string[]
          event_type: string
          id: string
          new_data: Json | null
          occurred_at: string
          old_data: Json | null
          record_id: string
          request_id: string | null
          table_name: string
          transaction_id: number
        }
        Insert: {
          actor_auth_user_id?: string | null
          actor_profile_id?: string | null
          changed_fields?: string[]
          event_type: string
          id?: string
          new_data?: Json | null
          occurred_at?: string
          old_data?: Json | null
          record_id: string
          request_id?: string | null
          table_name: string
          transaction_id?: number
        }
        Update: {
          actor_auth_user_id?: string | null
          actor_profile_id?: string | null
          changed_fields?: string[]
          event_type?: string
          id?: string
          new_data?: Json | null
          occurred_at?: string
          old_data?: Json | null
          record_id?: string
          request_id?: string | null
          table_name?: string
          transaction_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          code: string
          created_at: string
          data_status: string
          default_priority_id: string | null
          family: string
          id: string
          is_active: boolean
          label: string
          proof_policy: string
          source_notes: string | null
          source_row: string | null
          source_system: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          data_status?: string
          default_priority_id?: string | null
          family: string
          id?: string
          is_active?: boolean
          label: string
          proof_policy?: string
          source_notes?: string | null
          source_row?: string | null
          source_system?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          data_status?: string
          default_priority_id?: string | null
          family?: string
          id?: string
          is_active?: boolean
          label?: string
          proof_policy?: string
          source_notes?: string | null
          source_row?: string | null
          source_system?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_default_priority_id_fkey"
            columns: ["default_priority_id"]
            isOneToOne: false
            referencedRelation: "priority_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      costs: {
        Row: {
          amount: number
          anomaly_id: string | null
          approval_status: string
          approved_at: string | null
          approved_by_profile_id: string | null
          budget_type: string
          cost_type: string
          created_at: string
          currency: string
          description: string
          id: string
          intervention_id: string | null
          reference: string
          submitted_by_profile_id: string | null
          updated_at: string
          vendor_id: string | null
          work_order_id: string | null
        }
        Insert: {
          amount: number
          anomaly_id?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by_profile_id?: string | null
          budget_type?: string
          cost_type: string
          created_at?: string
          currency?: string
          description: string
          id?: string
          intervention_id?: string | null
          reference: string
          submitted_by_profile_id?: string | null
          updated_at?: string
          vendor_id?: string | null
          work_order_id?: string | null
        }
        Update: {
          amount?: number
          anomaly_id?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by_profile_id?: string | null
          budget_type?: string
          cost_type?: string
          created_at?: string
          currency?: string
          description?: string
          id?: string
          intervention_id?: string | null
          reference?: string
          submitted_by_profile_id?: string | null
          updated_at?: string
          vendor_id?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "costs_anomaly_id_fkey"
            columns: ["anomaly_id"]
            isOneToOne: false
            referencedRelation: "anomalies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "costs_approved_by_profile_id_fkey"
            columns: ["approved_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "costs_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "costs_submitted_by_profile_id_fkey"
            columns: ["submitted_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "costs_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "costs_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          code: string
          control_frequency: string | null
          created_at: string
          data_status: string
          default_priority_id: string | null
          family: string
          health_score: number | null
          health_status: string | null
          id: string
          is_active: boolean
          lifecycle_scope: string
          location_label: string | null
          name: string
          primary_zone_id: string | null
          source_notes: string | null
          source_row: string | null
          source_system: string
          updated_at: string
        }
        Insert: {
          code: string
          control_frequency?: string | null
          created_at?: string
          data_status?: string
          default_priority_id?: string | null
          family: string
          health_score?: number | null
          health_status?: string | null
          id?: string
          is_active?: boolean
          lifecycle_scope?: string
          location_label?: string | null
          name: string
          primary_zone_id?: string | null
          source_notes?: string | null
          source_row?: string | null
          source_system?: string
          updated_at?: string
        }
        Update: {
          code?: string
          control_frequency?: string | null
          created_at?: string
          data_status?: string
          default_priority_id?: string | null
          family?: string
          health_score?: number | null
          health_status?: string | null
          id?: string
          is_active?: boolean
          lifecycle_scope?: string
          location_label?: string | null
          name?: string
          primary_zone_id?: string | null
          source_notes?: string | null
          source_row?: string | null
          source_system?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_default_priority_id_fkey"
            columns: ["default_priority_id"]
            isOneToOne: false
            referencedRelation: "priority_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_primary_zone_id_fkey"
            columns: ["primary_zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_vendors: {
        Row: {
          created_at: string
          equipment_id: string
          is_primary: boolean
          relation_type: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          equipment_id: string
          is_primary?: boolean
          relation_type?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          equipment_id?: string
          is_primary?: boolean
          relation_type?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_vendors_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_vendors_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_zones: {
        Row: {
          created_at: string
          equipment_id: string
          relation_type: string
          zone_id: string
        }
        Insert: {
          created_at?: string
          equipment_id: string
          relation_type?: string
          zone_id: string
        }
        Update: {
          created_at?: string
          equipment_id?: string
          relation_type?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_zones_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_zones_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      interventions: {
        Row: {
          anomaly_id: string
          created_at: string
          ended_at: string | null
          id: string
          outcome: string
          performed_by_profile_id: string | null
          performed_by_vendor_id: string | null
          recovery_type: string
          reference: string
          started_at: string
          summary: string
          technical_details: Json
          updated_at: string
          work_order_id: string | null
        }
        Insert: {
          anomaly_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          outcome: string
          performed_by_profile_id?: string | null
          performed_by_vendor_id?: string | null
          recovery_type?: string
          reference: string
          started_at: string
          summary: string
          technical_details?: Json
          updated_at?: string
          work_order_id?: string | null
        }
        Update: {
          anomaly_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          outcome?: string
          performed_by_profile_id?: string | null
          performed_by_vendor_id?: string | null
          recovery_type?: string
          reference?: string
          started_at?: string
          summary?: string
          technical_details?: Json
          updated_at?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interventions_anomaly_id_fkey"
            columns: ["anomaly_id"]
            isOneToOne: false
            referencedRelation: "anomalies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_performed_by_profile_id_fkey"
            columns: ["performed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_performed_by_vendor_id_fkey"
            columns: ["performed_by_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_rules: {
        Row: {
          channels: string[]
          code: string
          copy_role_code: string | null
          created_at: string
          data_status: string
          delay_minutes: number | null
          expected_action: string | null
          id: string
          is_active: boolean
          message_template: string
          primary_role_code: string | null
          schedule_expression: string | null
          severity: string
          source_row: string | null
          source_system: string
          trigger_event: string
          updated_at: string
        }
        Insert: {
          channels?: string[]
          code: string
          copy_role_code?: string | null
          created_at?: string
          data_status?: string
          delay_minutes?: number | null
          expected_action?: string | null
          id?: string
          is_active?: boolean
          message_template: string
          primary_role_code?: string | null
          schedule_expression?: string | null
          severity: string
          source_row?: string | null
          source_system?: string
          trigger_event: string
          updated_at?: string
        }
        Update: {
          channels?: string[]
          code?: string
          copy_role_code?: string | null
          created_at?: string
          data_status?: string
          delay_minutes?: number | null
          expected_action?: string | null
          id?: string
          is_active?: boolean
          message_template?: string
          primary_role_code?: string | null
          schedule_expression?: string | null
          severity?: string
          source_row?: string | null
          source_system?: string
          trigger_event?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          anomaly_id: string | null
          body: string
          channel: string
          created_at: string
          id: string
          notification_rule_id: string | null
          read_at: string | null
          recipient_profile_id: string | null
          recipient_role_id: string | null
          recipient_vendor_id: string | null
          reference: string
          scheduled_at: string
          sent_at: string | null
          severity: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          anomaly_id?: string | null
          body: string
          channel?: string
          created_at?: string
          id?: string
          notification_rule_id?: string | null
          read_at?: string | null
          recipient_profile_id?: string | null
          recipient_role_id?: string | null
          recipient_vendor_id?: string | null
          reference: string
          scheduled_at?: string
          sent_at?: string | null
          severity: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          anomaly_id?: string | null
          body?: string
          channel?: string
          created_at?: string
          id?: string
          notification_rule_id?: string | null
          read_at?: string | null
          recipient_profile_id?: string | null
          recipient_role_id?: string | null
          recipient_vendor_id?: string | null
          reference?: string
          scheduled_at?: string
          sent_at?: string | null
          severity?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_anomaly_id_fkey"
            columns: ["anomaly_id"]
            isOneToOne: false
            referencedRelation: "anomalies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_notification_rule_id_fkey"
            columns: ["notification_rule_id"]
            isOneToOne: false
            referencedRelation: "notification_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_profile_id_fkey"
            columns: ["recipient_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_role_id_fkey"
            columns: ["recipient_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_vendor_id_fkey"
            columns: ["recipient_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      priority_definitions: {
        Row: {
          code: string
          color_token: string | null
          created_at: string
          id: string
          is_active: boolean
          is_critical: boolean
          label: string
          rank: number
          requires_direction_alert: boolean
          updated_at: string
        }
        Insert: {
          code: string
          color_token?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_critical?: boolean
          label: string
          rank: number
          requires_direction_alert?: boolean
          updated_at?: string
        }
        Update: {
          code?: string
          color_token?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_critical?: boolean
          label?: string
          rank?: number
          requires_direction_alert?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      profile_permissions: {
        Row: {
          created_at: string
          granted_at: string
          granted_by_profile_id: string | null
          id: string
          permission_code: string
          profile_id: string
          reason: string | null
          revoked_at: string | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          granted_at?: string
          granted_by_profile_id?: string | null
          id?: string
          permission_code: string
          profile_id: string
          reason?: string | null
          revoked_at?: string | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          granted_at?: string
          granted_by_profile_id?: string | null
          id?: string
          permission_code?: string
          profile_id?: string
          reason?: string | null
          revoked_at?: string | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_permissions_granted_by_profile_id_fkey"
            columns: ["granted_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_permissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: string
          auth_user_id: string | null
          created_at: string
          data_status: string
          display_name: string
          domain_summary: string | null
          employee_code: string
          id: string
          job_title: string | null
          must_change_password: boolean
          password_changed_at: string | null
          source_notes: string | null
          source_row: string | null
          source_system: string
          updated_at: string
          temporary_password_set_at: string | null
          vendor_id: string | null
        }
        Insert: {
          account_status?: string
          auth_user_id?: string | null
          created_at?: string
          data_status?: string
          display_name: string
          domain_summary?: string | null
          employee_code: string
          id?: string
          job_title?: string | null
          must_change_password?: boolean
          password_changed_at?: string | null
          source_notes?: string | null
          source_row?: string | null
          source_system?: string
          updated_at?: string
          temporary_password_set_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          account_status?: string
          auth_user_id?: string | null
          created_at?: string
          data_status?: string
          display_name?: string
          domain_summary?: string | null
          employee_code?: string
          id?: string
          job_title?: string | null
          must_change_password?: boolean
          password_changed_at?: string | null
          source_notes?: string | null
          source_row?: string | null
          source_system?: string
          updated_at?: string
          temporary_password_set_at?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      proofs: {
        Row: {
          anomaly_id: string | null
          captured_at: string | null
          created_at: string
          external_url: string | null
          id: string
          intervention_id: string | null
          metadata: Json
          mime_type: string | null
          proof_type: string
          reference: string
          rejection_reason: string | null
          report_id: string | null
          sha256: string | null
          storage_bucket: string | null
          storage_path: string | null
          submitted_by_profile_id: string | null
          submitted_by_vendor_id: string | null
          updated_at: string
          verification_status: string
          verified_at: string | null
          verified_by_profile_id: string | null
          work_order_id: string | null
        }
        Insert: {
          anomaly_id?: string | null
          captured_at?: string | null
          created_at?: string
          external_url?: string | null
          id?: string
          intervention_id?: string | null
          metadata?: Json
          mime_type?: string | null
          proof_type: string
          reference: string
          rejection_reason?: string | null
          report_id?: string | null
          sha256?: string | null
          storage_bucket?: string | null
          storage_path?: string | null
          submitted_by_profile_id?: string | null
          submitted_by_vendor_id?: string | null
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by_profile_id?: string | null
          work_order_id?: string | null
        }
        Update: {
          anomaly_id?: string | null
          captured_at?: string | null
          created_at?: string
          external_url?: string | null
          id?: string
          intervention_id?: string | null
          metadata?: Json
          mime_type?: string | null
          proof_type?: string
          reference?: string
          rejection_reason?: string | null
          report_id?: string | null
          sha256?: string | null
          storage_bucket?: string | null
          storage_path?: string | null
          submitted_by_profile_id?: string | null
          submitted_by_vendor_id?: string | null
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by_profile_id?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proofs_anomaly_id_fkey"
            columns: ["anomaly_id"]
            isOneToOne: false
            referencedRelation: "anomalies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proofs_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proofs_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proofs_submitted_by_profile_id_fkey"
            columns: ["submitted_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proofs_submitted_by_vendor_id_fkey"
            columns: ["submitted_by_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proofs_verified_by_profile_id_fkey"
            columns: ["verified_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proofs_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      qualifications: {
        Row: {
          anomaly_id: string
          confirmed_category_id: string
          confirmed_priority_id: string
          created_at: string
          decision_code: string
          decision_reason: string
          id: string
          qualified_at: string
          qualified_by_profile_id: string
          risk_assessment: string | null
        }
        Insert: {
          anomaly_id: string
          confirmed_category_id: string
          confirmed_priority_id: string
          created_at?: string
          decision_code: string
          decision_reason: string
          id?: string
          qualified_at?: string
          qualified_by_profile_id: string
          risk_assessment?: string | null
        }
        Update: {
          anomaly_id?: string
          confirmed_category_id?: string
          confirmed_priority_id?: string
          created_at?: string
          decision_code?: string
          decision_reason?: string
          id?: string
          qualified_at?: string
          qualified_by_profile_id?: string
          risk_assessment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qualifications_anomaly_id_fkey"
            columns: ["anomaly_id"]
            isOneToOne: false
            referencedRelation: "anomalies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qualifications_confirmed_category_id_fkey"
            columns: ["confirmed_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qualifications_confirmed_priority_id_fkey"
            columns: ["confirmed_priority_id"]
            isOneToOne: false
            referencedRelation: "priority_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qualifications_qualified_by_profile_id_fkey"
            columns: ["qualified_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reference_counters: {
        Row: {
          last_value: number
          prefix: string
          reference_year: number
          updated_at: string
        }
        Insert: {
          last_value?: number
          prefix: string
          reference_year: number
          updated_at?: string
        }
        Update: {
          last_value?: number
          prefix?: string
          reference_year?: number
          updated_at?: string
        }
        Relationships: []
      }
      report_checks: {
        Row: {
          check_code: string
          check_status: string
          created_at: string
          id: string
          label: string
          notes: string | null
          report_id: string
          threshold_rule_id: string | null
          unit: string | null
          updated_at: string
          value_boolean: boolean | null
          value_numeric: number | null
          value_text: string | null
        }
        Insert: {
          check_code: string
          check_status: string
          created_at?: string
          id?: string
          label: string
          notes?: string | null
          report_id: string
          threshold_rule_id?: string | null
          unit?: string | null
          updated_at?: string
          value_boolean?: boolean | null
          value_numeric?: number | null
          value_text?: string | null
        }
        Update: {
          check_code?: string
          check_status?: string
          created_at?: string
          id?: string
          label?: string
          notes?: string | null
          report_id?: string
          threshold_rule_id?: string | null
          unit?: string | null
          updated_at?: string
          value_boolean?: boolean | null
          value_numeric?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_checks_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_checks_threshold_rule_id_fkey"
            columns: ["threshold_rule_id"]
            isOneToOne: false
            referencedRelation: "threshold_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      report_imports: {
        Row: {
          completed_at: string | null
          content_sha256: string | null
          created_at: string
          error_details: Json
          id: string
          import_status: string
          imported_by_profile_id: string | null
          received_at: string
          reference: string
          source_filename: string | null
          source_format: string
          updated_at: string
          validation_summary: Json
        }
        Insert: {
          completed_at?: string | null
          content_sha256?: string | null
          created_at?: string
          error_details?: Json
          id?: string
          import_status?: string
          imported_by_profile_id?: string | null
          received_at?: string
          reference: string
          source_filename?: string | null
          source_format: string
          updated_at?: string
          validation_summary?: Json
        }
        Update: {
          completed_at?: string | null
          content_sha256?: string | null
          created_at?: string
          error_details?: Json
          id?: string
          import_status?: string
          imported_by_profile_id?: string | null
          received_at?: string
          reference?: string
          source_filename?: string | null
          source_format?: string
          updated_at?: string
          validation_summary?: Json
        }
        Relationships: [
          {
            foreignKeyName: "report_imports_imported_by_profile_id_fkey"
            columns: ["imported_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          analysis: string | null
          created_at: string
          equipment_id: string | null
          health_level: string | null
          id: string
          performed_at: string
          raw_payload: Json
          reference: string
          report_import_id: string | null
          report_status: string
          report_type: string
          reported_by_profile_id: string | null
          schema_version: string
          score: number | null
          submitted_at: string | null
          updated_at: string
          zone_id: string | null
        }
        Insert: {
          analysis?: string | null
          created_at?: string
          equipment_id?: string | null
          health_level?: string | null
          id?: string
          performed_at: string
          raw_payload?: Json
          reference: string
          report_import_id?: string | null
          report_status?: string
          report_type: string
          reported_by_profile_id?: string | null
          schema_version?: string
          score?: number | null
          submitted_at?: string | null
          updated_at?: string
          zone_id?: string | null
        }
        Update: {
          analysis?: string | null
          created_at?: string
          equipment_id?: string | null
          health_level?: string | null
          id?: string
          performed_at?: string
          raw_payload?: Json
          reference?: string
          report_import_id?: string | null
          report_status?: string
          report_type?: string
          reported_by_profile_id?: string | null
          schema_version?: string
          score?: number | null
          submitted_at?: string | null
          updated_at?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_report_import_id_fkey"
            columns: ["report_import_id"]
            isOneToOne: false
            referencedRelation: "report_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_by_profile_id_fkey"
            columns: ["reported_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          label: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      sla_rules: {
        Row: {
          calendar_mode: string
          category_id: string | null
          code: string
          created_at: string
          data_status: string
          effective_from: string
          effective_to: string | null
          equipment_id: string | null
          id: string
          internal_intervention_minutes: number
          is_active: boolean
          priority_id: string
          qualification_minutes: number
          source_notes: string | null
          source_row: string | null
          source_system: string
          updated_at: string
          vendor_intervention_minutes: number
        }
        Insert: {
          calendar_mode?: string
          category_id?: string | null
          code: string
          created_at?: string
          data_status?: string
          effective_from?: string
          effective_to?: string | null
          equipment_id?: string | null
          id?: string
          internal_intervention_minutes: number
          is_active?: boolean
          priority_id: string
          qualification_minutes: number
          source_notes?: string | null
          source_row?: string | null
          source_system?: string
          updated_at?: string
          vendor_intervention_minutes: number
        }
        Update: {
          calendar_mode?: string
          category_id?: string | null
          code?: string
          created_at?: string
          data_status?: string
          effective_from?: string
          effective_to?: string | null
          equipment_id?: string | null
          id?: string
          internal_intervention_minutes?: number
          is_active?: boolean
          priority_id?: string
          qualification_minutes?: number
          source_notes?: string | null
          source_row?: string | null
          source_system?: string
          updated_at?: string
          vendor_intervention_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "sla_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_rules_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_rules_priority_id_fkey"
            columns: ["priority_id"]
            isOneToOne: false
            referencedRelation: "priority_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      status_definitions: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_closed: boolean
          is_initial: boolean
          label: string
          requires_proof: boolean
          sort_order: number
          source_row: string | null
          source_system: string
          stage_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_closed?: boolean
          is_initial?: boolean
          label: string
          requires_proof?: boolean
          sort_order?: number
          source_row?: string | null
          source_system?: string
          stage_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_closed?: boolean
          is_initial?: boolean
          label?: string
          requires_proof?: boolean
          sort_order?: number
          source_row?: string | null
          source_system?: string
          stage_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_definitions_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "workflow_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      status_transitions: {
        Row: {
          allowed_role_id: string | null
          created_at: string
          from_status_id: string
          id: string
          is_active: boolean
          requires_comment: boolean
          to_status_id: string
        }
        Insert: {
          allowed_role_id?: string | null
          created_at?: string
          from_status_id: string
          id?: string
          is_active?: boolean
          requires_comment?: boolean
          to_status_id: string
        }
        Update: {
          allowed_role_id?: string | null
          created_at?: string
          from_status_id?: string
          id?: string
          is_active?: boolean
          requires_comment?: boolean
          to_status_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_transitions_allowed_role_id_fkey"
            columns: ["allowed_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_transitions_from_status_id_fkey"
            columns: ["from_status_id"]
            isOneToOne: false
            referencedRelation: "status_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_transitions_to_status_id_fkey"
            columns: ["to_status_id"]
            isOneToOne: false
            referencedRelation: "status_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      threshold_rules: {
        Row: {
          alert_expression: string | null
          automatic_action: string | null
          code: string
          created_at: string
          critical_expression: string | null
          data_status: string
          equipment_id: string
          id: string
          is_active: boolean
          ok_expression: string | null
          parameter_name: string
          source_notes: string | null
          source_row: string | null
          source_system: string
          structured_rule: Json
          unit: string | null
          updated_at: string
        }
        Insert: {
          alert_expression?: string | null
          automatic_action?: string | null
          code: string
          created_at?: string
          critical_expression?: string | null
          data_status?: string
          equipment_id: string
          id?: string
          is_active?: boolean
          ok_expression?: string | null
          parameter_name: string
          source_notes?: string | null
          source_row?: string | null
          source_system?: string
          structured_rule?: Json
          unit?: string | null
          updated_at?: string
        }
        Update: {
          alert_expression?: string | null
          automatic_action?: string | null
          code?: string
          created_at?: string
          critical_expression?: string | null
          data_status?: string
          equipment_id?: string
          id?: string
          is_active?: boolean
          ok_expression?: string | null
          parameter_name?: string
          source_notes?: string | null
          source_row?: string | null
          source_system?: string
          structured_rule?: Json
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "threshold_rules_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          equipment_id: string | null
          id: string
          profile_id: string
          role_id: string
          valid_from: string
          valid_until: string | null
          vendor_id: string | null
          zone_id: string | null
        }
        Insert: {
          created_at?: string
          equipment_id?: string | null
          id?: string
          profile_id: string
          role_id: string
          valid_from?: string
          valid_until?: string | null
          vendor_id?: string | null
          zone_id?: string | null
        }
        Update: {
          created_at?: string
          equipment_id?: string | null
          id?: string
          profile_id?: string
          role_id?: string
          valid_from?: string
          valid_until?: string | null
          vendor_id?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_intervention_reports: {
        Row: {
          anomaly_id: string
          cost_amount: number | null
          created_at: string
          currency: string
          id: string
          intervention_id: string | null
          metadata: Json
          mime_type: string
          proof_id: string | null
          reference: string
          rejection_reason: string | null
          report_date: string
          report_type: string
          reserve_notes: string | null
          size_bytes: number
          storage_bucket: string
          storage_path: string
          summary: string
          updated_at: string
          uploaded_by_profile_id: string
          validated_at: string | null
          validated_by_profile_id: string | null
          validation_status: string
          vendor_id: string
          work_order_id: string | null
        }
        Insert: {
          anomaly_id: string
          cost_amount?: number | null
          created_at?: string
          currency?: string
          id?: string
          intervention_id?: string | null
          metadata?: Json
          mime_type: string
          proof_id?: string | null
          reference: string
          rejection_reason?: string | null
          report_date: string
          report_type?: string
          reserve_notes?: string | null
          size_bytes: number
          storage_bucket?: string
          storage_path: string
          summary: string
          updated_at?: string
          uploaded_by_profile_id: string
          validated_at?: string | null
          validated_by_profile_id?: string | null
          validation_status?: string
          vendor_id: string
          work_order_id?: string | null
        }
        Update: {
          anomaly_id?: string
          cost_amount?: number | null
          created_at?: string
          currency?: string
          id?: string
          intervention_id?: string | null
          metadata?: Json
          mime_type?: string
          proof_id?: string | null
          reference?: string
          rejection_reason?: string | null
          report_date?: string
          report_type?: string
          reserve_notes?: string | null
          size_bytes?: number
          storage_bucket?: string
          storage_path?: string
          summary?: string
          updated_at?: string
          uploaded_by_profile_id?: string
          validated_at?: string | null
          validated_by_profile_id?: string | null
          validation_status?: string
          vendor_id?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_intervention_reports_anomaly_id_fkey"
            columns: ["anomaly_id"]
            isOneToOne: false
            referencedRelation: "anomalies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_intervention_reports_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_intervention_reports_proof_id_fkey"
            columns: ["proof_id"]
            isOneToOne: true
            referencedRelation: "proofs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_intervention_reports_uploaded_by_profile_id_fkey"
            columns: ["uploaded_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_intervention_reports_validated_by_profile_id_fkey"
            columns: ["validated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_intervention_reports_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_intervention_reports_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          code: string
          created_at: string
          data_status: string
          family: string | null
          id: string
          legal_name: string
          operational_alias: string | null
          source_notes: string | null
          source_row: string | null
          source_system: string
          status: string
          updated_at: string
          vendor_type: string
        }
        Insert: {
          code: string
          created_at?: string
          data_status?: string
          family?: string | null
          id?: string
          legal_name: string
          operational_alias?: string | null
          source_notes?: string | null
          source_row?: string | null
          source_system?: string
          status?: string
          updated_at?: string
          vendor_type?: string
        }
        Update: {
          code?: string
          created_at?: string
          data_status?: string
          family?: string | null
          id?: string
          legal_name?: string
          operational_alias?: string | null
          source_notes?: string | null
          source_row?: string | null
          source_system?: string
          status?: string
          updated_at?: string
          vendor_type?: string
        }
        Relationships: []
      }
      work_orders: {
        Row: {
          anomaly_id: string
          assigned_profile_id: string | null
          assigned_vendor_id: string | null
          completed_at: string | null
          created_at: string
          created_by_profile_id: string
          due_at: string | null
          id: string
          instructions: string
          reference: string
          scheduled_start_at: string | null
          status: string
          updated_at: string
          work_order_type: string
        }
        Insert: {
          anomaly_id: string
          assigned_profile_id?: string | null
          assigned_vendor_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by_profile_id: string
          due_at?: string | null
          id?: string
          instructions: string
          reference: string
          scheduled_start_at?: string | null
          status?: string
          updated_at?: string
          work_order_type: string
        }
        Update: {
          anomaly_id?: string
          assigned_profile_id?: string | null
          assigned_vendor_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by_profile_id?: string
          due_at?: string | null
          id?: string
          instructions?: string
          reference?: string
          scheduled_start_at?: string | null
          status?: string
          updated_at?: string
          work_order_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_anomaly_id_fkey"
            columns: ["anomaly_id"]
            isOneToOne: false
            referencedRelation: "anomalies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_assigned_profile_id_fkey"
            columns: ["assigned_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_assigned_vendor_id_fkey"
            columns: ["assigned_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_stages: {
        Row: {
          code: string
          created_at: string
          id: string
          label: string
          sequence_no: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          label: string
          sequence_no: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          label?: string
          sequence_no?: number
        }
        Relationships: []
      }
      zones: {
        Row: {
          alias: string | null
          code: string
          created_at: string
          criticality: string | null
          data_status: string
          id: string
          is_active: boolean
          label: string
          level_label: string | null
          macro_zone: string | null
          source_notes: string | null
          source_row: string | null
          source_system: string
          updated_at: string
          zone_type: string | null
        }
        Insert: {
          alias?: string | null
          code: string
          created_at?: string
          criticality?: string | null
          data_status?: string
          id?: string
          is_active?: boolean
          label: string
          level_label?: string | null
          macro_zone?: string | null
          source_notes?: string | null
          source_row?: string | null
          source_system?: string
          updated_at?: string
          zone_type?: string | null
        }
        Update: {
          alias?: string | null
          code?: string
          created_at?: string
          criticality?: string | null
          data_status?: string
          id?: string
          is_active?: boolean
          label?: string
          level_label?: string | null
          macro_zone?: string | null
          source_notes?: string | null
          source_row?: string | null
          source_system?: string
          updated_at?: string
          zone_type?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      advance_anomaly_workflow: {
        Args: { p_comment?: string; p_reference: string; p_target: string }
        Returns: Json
      }
      can_access_anomaly: { Args: { p_anomaly_id: string }; Returns: boolean }
      can_access_equipment: {
        Args: { p_equipment_id: string }
        Returns: boolean
      }
      can_access_report: { Args: { p_report_id: string }; Returns: boolean }
      can_access_zone: { Args: { p_zone_id: string }; Returns: boolean }
      create_field_anomaly: {
        Args: {
          p_description: string
          p_equipment_code: string
          p_priority_label: string
          p_title: string
        }
        Returns: Json
      }
      current_profile_id: { Args: never; Returns: string }
      get_my_auth_gate: { Args: never; Returns: Json }
      has_accepted_proof: { Args: { p_anomaly_id: string }; Returns: boolean }
      has_any_role: { Args: { p_role_codes: string[] }; Returns: boolean }
      has_permission: { Args: { p_permission_code: string }; Returns: boolean }
      has_role: { Args: { p_role_code: string }; Returns: boolean }
      mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: undefined
      }
      next_business_reference: { Args: { p_prefix: string }; Returns: string }
      proof_object_anomaly_id: { Args: { p_name: string }; Returns: string }
      register_anomaly_proof: {
        Args: {
          p_mime_type: string
          p_proof_type?: string
          p_reference: string
          p_size_bytes: number
          p_storage_path: string
        }
        Returns: Json
      }
      register_vendor_intervention_report: {
        Args: {
          p_anomaly_reference: string
          p_cost_amount?: number
          p_intervention_reference?: string
          p_mime_type: string
          p_report_date: string
          p_report_type: string
          p_reserve_notes?: string
          p_size_bytes: number
          p_storage_path: string
          p_summary: string
          p_vendor_code: string
          p_work_order_reference?: string
        }
        Returns: Json
      }
      resolve_anomaly_id: { Args: { p_reference: string }; Returns: string }
      resolve_sla_deadlines: {
        Args: {
          p_category_id: string
          p_equipment_id: string
          p_priority_id: string
          p_started_at?: string
        }
        Returns: {
          intervention_due_at: string
          qualification_due_at: string
        }[]
      }
      validate_anomaly_risk: {
        Args: { p_anomaly_id: string; p_comment: string; p_decision: string }
        Returns: undefined
      }
      vendor_report_object_anomaly_id: {
        Args: { p_name: string }
        Returns: string
      }
      verify_latest_anomaly_proof: {
        Args: { p_comment?: string; p_decision: string; p_reference: string }
        Returns: Json
      }
      verify_vendor_intervention_report: {
        Args: { p_comment?: string; p_decision: string; p_reference: string }
        Returns: Json
      }
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

