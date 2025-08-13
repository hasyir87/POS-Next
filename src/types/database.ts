
export type UserRole = 'owner' | 'cashier' | 'admin'
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'e_wallet'
export type TransactionStatus = 'pending' | 'completed' | 'cancelled'
export type PromotionType = 'Persentase' | 'Nominal' | 'BOGO'

export interface Organization {
  id: string
  name: string
  address?: string
  phone?: string
  logo_url?: string
  parent_organization_id?: string | null
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

export interface RawMaterial {
  id: string
  organization_id: string
  name: string
  brand?: string
  quantity: number
  unit: string
  category?: string
  purchase_price: number
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  organization_id: string
  name: string
  email?: string
  phone?: string
  loyalty_points: number
  transaction_count: number
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  organization_id: string
  cashier_id: string
  customer_id?: string | null
  total_amount: number
  payment_method: PaymentMethod
  status: TransactionStatus
  created_at: string
  updated_at: string
  profiles?: Profile
  customers?: Customer
}

export interface TransactionItem {
  id: string
  transaction_id: string
  product_id?: string | null
  raw_material_id?: string | null
  quantity: number
  price: number
  created_at: string
  transactions?: Transaction
  products?: Product
  raw_materials?: RawMaterial
}

export interface Promotion {
  id: string
  organization_id: string
  name: string
  type: PromotionType
  value: number
  get_product_id?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  products?: Product
}

export interface Grade {
  id: string
  organization_id: string
  name: string
  price_multiplier: number
  created_at: string
  updated_at: string
}

export interface Aroma {
  id: string
  organization_id: string
  name: string
  category?: string
  description?: string
  created_at: string
  updated_at: string
}

export interface BottleSize {
  id: string
  organization_id: string
  size: number
  unit: string
  price: number
  created_at: string
  updated_at: string
}

export interface Recipe {
  id: string
  organization_id: string
  name: string
  grade_id: string
  aroma_id: string
  bottle_size_id: string
  instructions?: string
  created_at: string
  updated_at: string
  grades?: Grade
  aromas?: Aroma
  bottle_sizes?: BottleSize
}

export interface Expense {
  id: string
  organization_id: string
  date: string
  category: string
  description: string
  amount: number
  created_at: string
  updated_at: string
}

export interface Settings {
  id: string
  organization_id: string
  key: string
  value: string
  created_at: string
  updated_at: string
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
      raw_materials: {
        Row: RawMaterial
        Insert: Omit<RawMaterial, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<RawMaterial, 'id' | 'created_at' | 'updated_at'>>
      }
      customers: {
        Row: Customer
        Insert: Omit<Customer, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Customer, 'id' | 'created_at' | 'updated_at'>>
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
        Row: Promotion
        Insert: Omit<Promotion, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Promotion, 'id' | 'created_at' | 'updated_at'>>
      }
      grades: {
        Row: Grade
        Insert: Omit<Grade, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Grade, 'id' | 'created_at' | 'updated_at'>>
      }
      aromas: {
        Row: Aroma
        Insert: Omit<Aroma, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Aroma, 'id' | 'created_at' | 'updated_at'>>
      }
      bottle_sizes: {
        Row: BottleSize
        Insert: Omit<BottleSize, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<BottleSize, 'id' | 'created_at' | 'updated_at'>>
      }
      recipes: {
        Row: Recipe
        Insert: Omit<Recipe, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Recipe, 'id' | 'created_at' | 'updated_at'>>
      }
      expenses: {
        Row: Expense
        Insert: Omit<Expense, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Expense, 'id' | 'created_at' | 'updated_at'>>
      }
      settings: {
        Row: Settings
        Insert: Omit<Settings, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Settings, 'id' | 'created_at' | 'updated_at'>>
      }
    }
    Functions: {
      process_checkout: {
        Args: {
          p_organization_id: string
          p_cashier_id: string
          p_customer_id?: string | null
          p_items: Array<{
            product_id?: string | null
            raw_material_id?: string | null
            quantity: number
            price: number
          }>
          p_total_amount: number
          p_payment_method: PaymentMethod
        }
        Returns: {
          transaction_id: string
          success: boolean
          message: string
        }
      }
    }
  }
}
