export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          phone: string
          wa_id: string | null
          name: string | null
          plan: string
          plan_expires_at: string | null
          onboarded_at: string | null
          onboarding_step: number
          pending_transaction: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          phone: string
          wa_id?: string | null
          name?: string | null
          plan?: string
          plan_expires_at?: string | null
          onboarded_at?: string | null
          onboarding_step?: number
          pending_transaction?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          phone?: string
          wa_id?: string | null
          name?: string | null
          plan?: string
          plan_expires_at?: string | null
          onboarded_at?: string | null
          onboarding_step?: number
          pending_transaction?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          user_id: string | null
          name: string
          type: 'income' | 'expense'
          icon: string | null
          keywords: string[]
          is_default: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          type: 'income' | 'expense'
          icon?: string | null
          keywords?: string[]
          is_default?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          type?: 'income' | 'expense'
          icon?: string | null
          keywords?: string[]
          is_default?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          category_id: string | null
          type: 'income' | 'expense'
          amount: number
          description: string | null
          source: 'text' | 'image' | 'audio' | 'manual'
          ai_confidence: number | null
          receipt_url: string | null
          date: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id?: string | null
          type: 'income' | 'expense'
          amount: number
          description?: string | null
          source: 'text' | 'image' | 'audio' | 'manual'
          ai_confidence?: number | null
          receipt_url?: string | null
          date?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string | null
          type?: 'income' | 'expense'
          amount?: number
          description?: string | null
          source?: 'text' | 'image' | 'audio' | 'manual'
          ai_confidence?: number | null
          receipt_url?: string | null
          date?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
      messages: {
        Row: {
          id: string
          user_id: string | null
          wa_message_id: string
          direction: 'inbound' | 'outbound'
          type: string
          content: Json | null
          transaction_id: string | null
          processed_at: string | null
          error: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          wa_message_id: string
          direction: 'inbound' | 'outbound'
          type: string
          content?: Json | null
          transaction_id?: string | null
          processed_at?: string | null
          error?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          wa_message_id?: string
          direction?: 'inbound' | 'outbound'
          type?: string
          content?: Json | null
          transaction_id?: string | null
          processed_at?: string | null
          error?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          }
        ]
      }
      reports: {
        Row: {
          id: string
          user_id: string
          type: string
          status: string
          context: Json | null
          resolved_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          status?: string
          context?: Json | null
          resolved_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          status?: string
          context?: Json | null
          resolved_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      monthly_reports: {
        Row: {
          id: string
          user_id: string
          month: number
          year: number
          total_income: number
          total_expense: number
          balance: number
          category_breakdown: Json | null
          generated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          month: number
          year: number
          total_income?: number
          total_expense?: number
          balance?: number
          category_breakdown?: Json | null
          generated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          month?: number
          year?: number
          total_income?: number
          total_expense?: number
          balance?: number
          category_breakdown?: Json | null
          generated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
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
