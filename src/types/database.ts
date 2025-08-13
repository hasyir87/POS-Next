export type UserRole = 'owner' | 'cashier' | 'admin'
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'e_wallet'
export type TransactionStatus = 'pending' | 'completed' | 'cancelled'

export interface Organization {
  id: string
  name: string
  address?: string
  phone?: string
  logo_url?: string
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  email?: string
  full_name?: string
  avatar_url?: string
  organization_id?: string
  role: UserRole
  created_at: string
  updated_at: string
  organizations?: Organization
}

export interface Category {
  id: string
  organization_id: string
  name: string
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  organization_id: string
  name: string
  description?: string
  price: number
  stock: number
  category_id?: string
  image_url?: string
  created_at: string
  updated_at: string
  categories?: Category
}

export interface Transaction {
  id: string
  organization_id: string
  cashier_id: string
  total_amount: number
  payment_method: PaymentMethod
  status: TransactionStatus
  created_at: string
  updated_at: string
  profiles?: Profile
}

export interface TransactionItem {
  id: string
  transaction_id: string
  product_id: string
  quantity: number
  price: number
  created_at: string
  transactions?: Transaction
  products?: Product
}

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: Organization
        Insert: Omit<Organization, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Organization, 'id' | 'created_at' | 'updated_at'>>
      }
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
      }
      categories: {
        Row: Category
        Insert: Omit<Category, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Category, 'id' | 'created_at' | 'updated_at'>>
      }
      products: {
        Row: Product
        Insert: Omit<Product, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Product, 'id' | 'created_at' | 'updated_at'>>
      }
      transactions: {
        Row: Transaction
        Insert: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Transaction, 'id' | 'created_at' | 'updated_at'>>
      }
      transaction_items: {
        Row: TransactionItem
        Insert: Omit<TransactionItem, 'id' | 'created_at'>
        Update: Partial<Omit<TransactionItem, 'id' | 'created_at'>>
      }
      promotions: {
        Row: {
          id: string
          organization_id: string
          name: string
          type: 'Persentase' | 'Nominal' | 'BOGO'
          value: number
          get_product_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          type: 'Persentase' | 'Nominal' | 'BOGO'
          value: number
          get_product_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          type?: 'Persentase' | 'Nominal' | 'BOGO'
          value?: number
          get_product_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}