export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      shade_finder_brands: {
        Args: Record<PropertyKey, never>;
        Returns: Array<{
          id: string;
          name: string;
          name_en: string;
          product_types: Array<Database['public']['Enums']['shade_product_type']>;
        }>;
      };
      shade_finder_matches: {
        Args: {
          p_brand_id?: string;
          p_offset?: number;
          p_query?: string;
          p_shade_id: string;
          p_type?: Database['public']['Enums']['shade_product_type'];
        };
        Returns: Array<{
          brand_name: string;
          delta_e: number;
          hex: string;
          product_id: string;
          product_name: string;
          product_name_en: string;
          product_type: Database['public']['Enums']['shade_product_type'];
          shade_id: string;
          shade_name: string;
          total_count: number;
        }>;
      };
      shade_finder_matches_hex: {
        Args: {
          p_brand_id?: string;
          p_hex: string;
          p_offset?: number;
          p_query?: string;
          p_type?: Database['public']['Enums']['shade_product_type'];
        };
        Returns: Database['public']['Functions']['shade_finder_matches']['Returns'];
      };
      shade_finder_products: {
        Args: { p_brand_id: string; p_type?: Database['public']['Enums']['shade_product_type'] };
        Returns: Array<{
          id: string;
          name: string;
          name_en: string;
          product_type: Database['public']['Enums']['shade_product_type'];
        }>;
      };
      shade_finder_shades: {
        Args: { p_product_id: string };
        Returns: Array<{
          hex: string;
          id: string;
          name: string;
        }>;
      };
    };
    Enums: {
      shade_product_type: 'foundation' | 'cushion';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  shade_finder_private: {
    Tables: {
      brands: {
        Row: {
          id: string;
          import_sha256: string;
          name: string;
          name_en: string;
          source_key: string;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          import_sha256: string;
          name: string;
          name_en: string;
          source_key: string;
        };
        Update: {
          id?: string;
          import_sha256?: string;
          name?: string;
          name_en?: string;
          source_key?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'brands_import_sha256_fkey';
            columns: ['import_sha256'];
            isOneToOne: false;
            referencedRelation: 'imports';
            referencedColumns: ['source_sha256'];
          },
        ];
      };
      imports: {
        Row: {
          captured_at: string;
          catalog_sha256: string;
          imported_at: string;
          metadata: NonNullable<Json>;
          source_sha256: string;
        };
        ComputedFields: never;
        Insert: {
          captured_at: string;
          catalog_sha256: string;
          imported_at?: string;
          metadata: NonNullable<Json>;
          source_sha256: string;
        };
        Update: {
          captured_at?: string;
          catalog_sha256?: string;
          imported_at?: string;
          metadata?: NonNullable<Json>;
          source_sha256?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          brand_id: string;
          id: string;
          import_sha256: string;
          name: string;
          name_en: string;
          product_type: Database['public']['Enums']['shade_product_type'];
          sort_order: number;
          source_key: string;
        };
        ComputedFields: never;
        Insert: {
          brand_id: string;
          id?: string;
          import_sha256: string;
          name: string;
          name_en: string;
          product_type: Database['public']['Enums']['shade_product_type'];
          sort_order: number;
          source_key: string;
        };
        Update: {
          brand_id?: string;
          id?: string;
          import_sha256?: string;
          name?: string;
          name_en?: string;
          product_type?: Database['public']['Enums']['shade_product_type'];
          sort_order?: number;
          source_key?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'products_brand_id_fkey';
            columns: ['brand_id'];
            isOneToOne: false;
            referencedRelation: 'brands';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'products_import_sha256_fkey';
            columns: ['import_sha256'];
            isOneToOne: false;
            referencedRelation: 'imports';
            referencedColumns: ['source_sha256'];
          },
        ];
      };
      shades: {
        Row: {
          hex: string;
          id: string;
          import_sha256: string;
          lab_a: number;
          lab_b: number;
          lab_l: number;
          name: string;
          product_id: string;
          sort_order: number;
          source_key: string;
        };
        ComputedFields: never;
        Insert: {
          hex: string;
          id?: string;
          import_sha256: string;
          lab_a: number;
          lab_b: number;
          lab_l: number;
          name: string;
          product_id: string;
          sort_order: number;
          source_key: string;
        };
        Update: {
          hex?: string;
          id?: string;
          import_sha256?: string;
          lab_a?: number;
          lab_b?: number;
          lab_l?: number;
          name?: string;
          product_id?: string;
          sort_order?: number;
          source_key?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'shades_import_sha256_fkey';
            columns: ['import_sha256'];
            isOneToOne: false;
            referencedRelation: 'imports';
            referencedColumns: ['source_sha256'];
          },
          {
            foreignKeyName: 'shades_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      hex_to_lab: {
        Args: { p_hex: string };
        Returns: number[];
      };
      delta_e_2000: {
        Args: { a1: number; a2: number; b1: number; b2: number; l1: number; l2: number };
        Returns: number;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      shade_product_type: ['foundation', 'cushion'],
    },
  },
  shade_finder_private: {
    Enums: {},
  },
} as const;
