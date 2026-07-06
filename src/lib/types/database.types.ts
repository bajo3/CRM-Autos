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
      catalogo_pdf: {
        Row: {
          created_at: string
          created_by: string | null
          empresa_id: string
          filtros: Json
          id: string
          nombre: string | null
          pdf_url: string | null
          vehiculo_ids: string[]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          empresa_id: string
          filtros?: Json
          id?: string
          nombre?: string | null
          pdf_url?: string | null
          vehiculo_ids?: string[]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          empresa_id?: string
          filtros?: Json
          id?: string
          nombre?: string | null
          pdf_url?: string | null
          vehiculo_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_pdf_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogo_pdf_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente: {
        Row: {
          apellido: string | null
          created_at: string
          dni_cuit: string | null
          email: string | null
          empresa_id: string
          estado: Database["public"]["Enums"]["estado_lead"]
          fecha_nacimiento: string | null
          id: string
          localidad: string | null
          nombre: string
          observaciones: string | null
          origen: Database["public"]["Enums"]["origen_lead"]
          presupuesto_aprox: number | null
          proximo_seguimiento: string | null
          telefono: string | null
          updated_at: string
          vehiculo_interes_id: string | null
          vendedor_id: string | null
          whatsapp: string | null
        }
        Insert: {
          apellido?: string | null
          created_at?: string
          dni_cuit?: string | null
          email?: string | null
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado_lead"]
          fecha_nacimiento?: string | null
          id?: string
          localidad?: string | null
          nombre: string
          observaciones?: string | null
          origen?: Database["public"]["Enums"]["origen_lead"]
          presupuesto_aprox?: number | null
          proximo_seguimiento?: string | null
          telefono?: string | null
          updated_at?: string
          vehiculo_interes_id?: string | null
          vendedor_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          apellido?: string | null
          created_at?: string
          dni_cuit?: string | null
          email?: string | null
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado_lead"]
          fecha_nacimiento?: string | null
          id?: string
          localidad?: string | null
          nombre?: string
          observaciones?: string | null
          origen?: Database["public"]["Enums"]["origen_lead"]
          presupuesto_aprox?: number | null
          proximo_seguimiento?: string | null
          telefono?: string | null
          updated_at?: string
          vehiculo_interes_id?: string | null
          vendedor_id?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cliente_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_vehiculo_interes_id_fkey"
            columns: ["vehiculo_interes_id"]
            isOneToOne: false
            referencedRelation: "vehiculo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      comision: {
        Row: {
          comision_calculada: number | null
          created_at: string
          empresa_id: string
          estado: Database["public"]["Enums"]["estado_comision"]
          fecha_pago: string | null
          id: string
          tipo: Database["public"]["Enums"]["tipo_comision"]
          updated_at: string
          valor: number
          vendedor_id: string | null
          venta_id: string | null
        }
        Insert: {
          comision_calculada?: number | null
          created_at?: string
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado_comision"]
          fecha_pago?: string | null
          id?: string
          tipo?: Database["public"]["Enums"]["tipo_comision"]
          updated_at?: string
          valor?: number
          vendedor_id?: string | null
          venta_id?: string | null
        }
        Update: {
          comision_calculada?: number | null
          created_at?: string
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado_comision"]
          fecha_pago?: string | null
          id?: string
          tipo?: Database["public"]["Enums"]["tipo_comision"]
          updated_at?: string
          valor?: number
          vendedor_id?: string | null
          venta_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comision_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comision_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comision_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "venta"
            referencedColumns: ["id"]
          },
        ]
      }
      consignacion: {
        Row: {
          autorizacion_venta: boolean
          comision_acordada: number | null
          created_at: string
          doc_recibida: string | null
          dueno_contacto: string | null
          dueno_nombre: string | null
          empresa_id: string
          estado: Database["public"]["Enums"]["estado_consignacion"]
          fecha_liquidacion: string | null
          id: string
          liquidado: boolean
          monto_liquidado: number | null
          observaciones: string | null
          precio_minimo: number | null
          precio_pretendido: number | null
          updated_at: string
          vehiculo_id: string | null
          vencimiento: string | null
        }
        Insert: {
          autorizacion_venta?: boolean
          comision_acordada?: number | null
          created_at?: string
          doc_recibida?: string | null
          dueno_contacto?: string | null
          dueno_nombre?: string | null
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado_consignacion"]
          fecha_liquidacion?: string | null
          id?: string
          liquidado?: boolean
          monto_liquidado?: number | null
          observaciones?: string | null
          precio_minimo?: number | null
          precio_pretendido?: number | null
          updated_at?: string
          vehiculo_id?: string | null
          vencimiento?: string | null
        }
        Update: {
          autorizacion_venta?: boolean
          comision_acordada?: number | null
          created_at?: string
          doc_recibida?: string | null
          dueno_contacto?: string | null
          dueno_nombre?: string | null
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado_consignacion"]
          fecha_liquidacion?: string | null
          id?: string
          liquidado?: boolean
          monto_liquidado?: number | null
          observaciones?: string | null
          precio_minimo?: number | null
          precio_pretendido?: number | null
          updated_at?: string
          vehiculo_id?: string | null
          vencimiento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consignacion_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consignacion_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculo"
            referencedColumns: ["id"]
          },
        ]
      }
      consulta: {
        Row: {
          canal: Database["public"]["Enums"]["origen_lead"] | null
          cliente_id: string
          empresa_id: string
          fecha: string
          id: string
          notas: string | null
          pendiente: boolean
          vehiculo_id: string
        }
        Insert: {
          canal?: Database["public"]["Enums"]["origen_lead"] | null
          cliente_id: string
          empresa_id: string
          fecha?: string
          id?: string
          notas?: string | null
          pendiente?: boolean
          vehiculo_id: string
        }
        Update: {
          canal?: Database["public"]["Enums"]["origen_lead"] | null
          cliente_id?: string
          empresa_id?: string
          fecha?: string
          id?: string
          notas?: string | null
          pendiente?: boolean
          vehiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consulta_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consulta_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consulta_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculo"
            referencedColumns: ["id"]
          },
        ]
      }
      credito: {
        Row: {
          alerta_disparada: boolean
          cantidad_cuotas: number
          created_at: string
          cuota_actual: number
          empresa_id: string
          estado: Database["public"]["Enums"]["estado_credito"]
          fecha_fin_estimada: string | null
          fecha_inicio: string
          id: string
          observaciones: string | null
          updated_at: string
          venta_id: string
        }
        Insert: {
          alerta_disparada?: boolean
          cantidad_cuotas?: number
          created_at?: string
          cuota_actual?: number
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado_credito"]
          fecha_fin_estimada?: string | null
          fecha_inicio?: string
          id?: string
          observaciones?: string | null
          updated_at?: string
          venta_id: string
        }
        Update: {
          alerta_disparada?: boolean
          cantidad_cuotas?: number
          created_at?: string
          cuota_actual?: number
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado_credito"]
          fecha_fin_estimada?: string | null
          fecha_inicio?: string
          id?: string
          observaciones?: string | null
          updated_at?: string
          venta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credito_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credito_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "venta"
            referencedColumns: ["id"]
          },
        ]
      }
      documento_comercial: {
        Row: {
          cliente_id: string | null
          created_at: string
          created_by: string | null
          datos: Json
          empresa_id: string
          fecha_emision: string
          id: string
          numero: string | null
          pdf_url: string | null
          tipo: Database["public"]["Enums"]["tipo_doc_comercial"]
          vehiculo_id: string | null
          venta_id: string | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          datos?: Json
          empresa_id: string
          fecha_emision?: string
          id?: string
          numero?: string | null
          pdf_url?: string | null
          tipo: Database["public"]["Enums"]["tipo_doc_comercial"]
          vehiculo_id?: string | null
          venta_id?: string | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          datos?: Json
          empresa_id?: string
          fecha_emision?: string
          id?: string
          numero?: string | null
          pdf_url?: string | null
          tipo?: Database["public"]["Enums"]["tipo_doc_comercial"]
          vehiculo_id?: string | null
          venta_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documento_comercial_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_comercial_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_comercial_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_comercial_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_comercial_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "venta"
            referencedColumns: ["id"]
          },
        ]
      }
      documento_secuencia: {
        Row: {
          empresa_id: string
          tipo: Database["public"]["Enums"]["tipo_doc_comercial"]
          ultimo: number
        }
        Insert: {
          empresa_id: string
          tipo: Database["public"]["Enums"]["tipo_doc_comercial"]
          ultimo?: number
        }
        Update: {
          empresa_id?: string
          tipo?: Database["public"]["Enums"]["tipo_doc_comercial"]
          ultimo?: number
        }
        Relationships: [
          {
            foreignKeyName: "documento_secuencia_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      documento_vehiculo: {
        Row: {
          archivo_url: string | null
          created_at: string
          empresa_id: string
          id: string
          observaciones: string | null
          tiene: boolean
          tipo: Database["public"]["Enums"]["tipo_doc_vehiculo"]
          updated_at: string
          vehiculo_id: string
        }
        Insert: {
          archivo_url?: string | null
          created_at?: string
          empresa_id: string
          id?: string
          observaciones?: string | null
          tiene?: boolean
          tipo: Database["public"]["Enums"]["tipo_doc_vehiculo"]
          updated_at?: string
          vehiculo_id: string
        }
        Update: {
          archivo_url?: string | null
          created_at?: string
          empresa_id?: string
          id?: string
          observaciones?: string | null
          tiene?: boolean
          tipo?: Database["public"]["Enums"]["tipo_doc_vehiculo"]
          updated_at?: string
          vehiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documento_vehiculo_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_vehiculo_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculo"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa: {
        Row: {
          activa: boolean
          color_primario: string | null
          created_at: string
          cuit: string | null
          direccion: string | null
          email: string | null
          id: string
          localidad: string | null
          logo_url: string | null
          nombre: string
          provincia: string | null
          slug: string
          telefono: string | null
          updated_at: string
          vtv_calendario: Json
        }
        Insert: {
          activa?: boolean
          color_primario?: string | null
          created_at?: string
          cuit?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          localidad?: string | null
          logo_url?: string | null
          nombre: string
          provincia?: string | null
          slug: string
          telefono?: string | null
          updated_at?: string
          vtv_calendario?: Json
        }
        Update: {
          activa?: boolean
          color_primario?: string | null
          created_at?: string
          cuit?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          localidad?: string | null
          logo_url?: string | null
          nombre?: string
          provincia?: string | null
          slug?: string
          telefono?: string | null
          updated_at?: string
          vtv_calendario?: Json
        }
        Relationships: []
      }
      encargo: {
        Row: {
          anio_max: number | null
          anio_min: number | null
          caja: Database["public"]["Enums"]["transmision"] | null
          cliente_id: string | null
          color_preferido: string | null
          combustible: Database["public"]["Enums"]["combustible"] | null
          created_at: string
          empresa_id: string
          estado: Database["public"]["Enums"]["estado_encargo"]
          id: string
          km_max: number | null
          marca_buscada: string | null
          modelo_buscado: string | null
          observaciones: string | null
          presupuesto_max: number | null
          toma_usado: boolean
          updated_at: string
          urgencia: Database["public"]["Enums"]["urgencia"]
          vendedor_id: string | null
        }
        Insert: {
          anio_max?: number | null
          anio_min?: number | null
          caja?: Database["public"]["Enums"]["transmision"] | null
          cliente_id?: string | null
          color_preferido?: string | null
          combustible?: Database["public"]["Enums"]["combustible"] | null
          created_at?: string
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado_encargo"]
          id?: string
          km_max?: number | null
          marca_buscada?: string | null
          modelo_buscado?: string | null
          observaciones?: string | null
          presupuesto_max?: number | null
          toma_usado?: boolean
          updated_at?: string
          urgencia?: Database["public"]["Enums"]["urgencia"]
          vendedor_id?: string | null
        }
        Update: {
          anio_max?: number | null
          anio_min?: number | null
          caja?: Database["public"]["Enums"]["transmision"] | null
          cliente_id?: string | null
          color_preferido?: string | null
          combustible?: Database["public"]["Enums"]["combustible"] | null
          created_at?: string
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado_encargo"]
          id?: string
          km_max?: number | null
          marca_buscada?: string | null
          modelo_buscado?: string | null
          observaciones?: string | null
          presupuesto_max?: number | null
          toma_usado?: boolean
          updated_at?: string
          urgencia?: Database["public"]["Enums"]["urgencia"]
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "encargo_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encargo_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encargo_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      foto_vehiculo: {
        Row: {
          created_at: string
          empresa_id: string
          es_principal: boolean
          id: string
          orden: number
          url: string
          vehiculo_id: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          es_principal?: boolean
          id?: string
          orden?: number
          url: string
          vehiculo_id: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          es_principal?: boolean
          id?: string
          orden?: number
          url?: string
          vehiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "foto_vehiculo_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "foto_vehiculo_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculo"
            referencedColumns: ["id"]
          },
        ]
      }
      garantia: {
        Row: {
          cliente_id: string | null
          created_at: string
          cubre: string | null
          duracion: string | null
          empresa_id: string
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          no_cubre: string | null
          tipo: string | null
          vehiculo_id: string | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          cubre?: string | null
          duracion?: string | null
          empresa_id: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          no_cubre?: string | null
          tipo?: string | null
          vehiculo_id?: string | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          cubre?: string | null
          duracion?: string | null
          empresa_id?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          no_cubre?: string | null
          tipo?: string | null
          vehiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "garantia_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garantia_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garantia_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculo"
            referencedColumns: ["id"]
          },
        ]
      }
      gasto_vehiculo: {
        Row: {
          comprobante_url: string | null
          concepto: string | null
          created_at: string
          empresa_id: string
          fecha: string
          id: string
          monto: number
          observaciones: string | null
          responsable: string | null
          tipo: Database["public"]["Enums"]["tipo_gasto"]
          vehiculo_id: string
        }
        Insert: {
          comprobante_url?: string | null
          concepto?: string | null
          created_at?: string
          empresa_id: string
          fecha?: string
          id?: string
          monto?: number
          observaciones?: string | null
          responsable?: string | null
          tipo?: Database["public"]["Enums"]["tipo_gasto"]
          vehiculo_id: string
        }
        Update: {
          comprobante_url?: string | null
          concepto?: string | null
          created_at?: string
          empresa_id?: string
          fecha?: string
          id?: string
          monto?: number
          observaciones?: string | null
          responsable?: string | null
          tipo?: Database["public"]["Enums"]["tipo_gasto"]
          vehiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gasto_vehiculo_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gasto_vehiculo_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculo"
            referencedColumns: ["id"]
          },
        ]
      }
      historial_cambio: {
        Row: {
          accion: string
          empresa_id: string
          entidad: string | null
          entidad_id: string | null
          fecha: string
          id: string
          usuario_id: string | null
          valor_anterior: Json | null
          valor_nuevo: Json | null
        }
        Insert: {
          accion: string
          empresa_id: string
          entidad?: string | null
          entidad_id?: string | null
          fecha?: string
          id?: string
          usuario_id?: string | null
          valor_anterior?: Json | null
          valor_nuevo?: Json | null
        }
        Update: {
          accion?: string
          empresa_id?: string
          entidad?: string | null
          entidad_id?: string | null
          fecha?: string
          id?: string
          usuario_id?: string | null
          valor_anterior?: Json | null
          valor_nuevo?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "historial_cambio_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historial_cambio_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_cuenta: {
        Row: {
          access_token: string | null
          conectada_por: string | null
          created_at: string
          email: string | null
          empresa_id: string
          id: string
          ml_user_id: number | null
          nickname: string | null
          refresh_token: string | null
          scope: string | null
          token_expira: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          conectada_por?: string | null
          created_at?: string
          email?: string | null
          empresa_id: string
          id?: string
          ml_user_id?: number | null
          nickname?: string | null
          refresh_token?: string | null
          scope?: string | null
          token_expira?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          conectada_por?: string | null
          created_at?: string
          email?: string | null
          empresa_id?: string
          id?: string
          ml_user_id?: number | null
          nickname?: string | null
          refresh_token?: string | null
          scope?: string | null
          token_expira?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ml_cuenta_conectada_por_fkey"
            columns: ["conectada_por"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ml_cuenta_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_notificacion: {
        Row: {
          application_id: number | null
          attempts: number | null
          created_at: string
          empresa_id: string | null
          id: string
          ml_user_id: number | null
          payload: Json
          procesada: boolean
          resource: string | null
          sent_at: string | null
          topic: string | null
        }
        Insert: {
          application_id?: number | null
          attempts?: number | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          ml_user_id?: number | null
          payload?: Json
          procesada?: boolean
          resource?: string | null
          sent_at?: string | null
          topic?: string | null
        }
        Update: {
          application_id?: number | null
          attempts?: number | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          ml_user_id?: number | null
          payload?: Json
          procesada?: boolean
          resource?: string | null
          sent_at?: string | null
          topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ml_notificacion_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      permuta: {
        Row: {
          anio: number | null
          cliente_id: string | null
          created_at: string
          diferencia: number | null
          empresa_id: string
          estado: Database["public"]["Enums"]["estado_tasacion"]
          estado_general: string | null
          id: string
          kilometros: number | null
          marca: string | null
          modelo: string | null
          observaciones: string | null
          patente: string | null
          updated_at: string
          valor_pretendido: number | null
          valor_tasado: number | null
          venta_id: string | null
        }
        Insert: {
          anio?: number | null
          cliente_id?: string | null
          created_at?: string
          diferencia?: number | null
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado_tasacion"]
          estado_general?: string | null
          id?: string
          kilometros?: number | null
          marca?: string | null
          modelo?: string | null
          observaciones?: string | null
          patente?: string | null
          updated_at?: string
          valor_pretendido?: number | null
          valor_tasado?: number | null
          venta_id?: string | null
        }
        Update: {
          anio?: number | null
          cliente_id?: string | null
          created_at?: string
          diferencia?: number | null
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado_tasacion"]
          estado_general?: string | null
          id?: string
          kilometros?: number | null
          marca?: string | null
          modelo?: string | null
          observaciones?: string | null
          patente?: string | null
          updated_at?: string
          valor_pretendido?: number | null
          valor_tasado?: number | null
          venta_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "permuta_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permuta_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permuta_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "venta"
            referencedColumns: ["id"]
          },
        ]
      }
      postventa: {
        Row: {
          cliente_id: string | null
          created_at: string
          empresa_id: string
          fecha_alerta: string
          id: string
          notas: string | null
          realizada: boolean
          venta_id: string | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          empresa_id: string
          fecha_alerta: string
          id?: string
          notas?: string | null
          realizada?: boolean
          venta_id?: string | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          empresa_id?: string
          fecha_alerta?: string
          id?: string
          notas?: string | null
          realizada?: boolean
          venta_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "postventa_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "postventa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "postventa_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "venta"
            referencedColumns: ["id"]
          },
        ]
      }
      presupuesto: {
        Row: {
          anticipo: number | null
          bonificacion: number | null
          cantidad_cuotas: number | null
          cliente_id: string | null
          created_at: string
          empresa_id: string
          estado: Database["public"]["Enums"]["estado_presupuesto"]
          financiacion: string | null
          forma_pago: Database["public"]["Enums"]["forma_pago"] | null
          gastos: number | null
          id: string
          observaciones: string | null
          pdf_url: string | null
          permuta: string | null
          precio: number | null
          updated_at: string
          validez: string | null
          valor_cuota: number | null
          vehiculo_id: string | null
          vendedor_id: string | null
        }
        Insert: {
          anticipo?: number | null
          bonificacion?: number | null
          cantidad_cuotas?: number | null
          cliente_id?: string | null
          created_at?: string
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado_presupuesto"]
          financiacion?: string | null
          forma_pago?: Database["public"]["Enums"]["forma_pago"] | null
          gastos?: number | null
          id?: string
          observaciones?: string | null
          pdf_url?: string | null
          permuta?: string | null
          precio?: number | null
          updated_at?: string
          validez?: string | null
          valor_cuota?: number | null
          vehiculo_id?: string | null
          vendedor_id?: string | null
        }
        Update: {
          anticipo?: number | null
          bonificacion?: number | null
          cantidad_cuotas?: number | null
          cliente_id?: string | null
          created_at?: string
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado_presupuesto"]
          financiacion?: string | null
          forma_pago?: Database["public"]["Enums"]["forma_pago"] | null
          gastos?: number | null
          id?: string
          observaciones?: string | null
          pdf_url?: string | null
          permuta?: string | null
          precio?: number | null
          updated_at?: string
          validez?: string | null
          valor_cuota?: number | null
          vehiculo_id?: string | null
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "presupuesto_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuesto_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuesto_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuesto_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      pago_cuota: {
        Row: {
          created_at: string
          credito_id: string
          empresa_id: string
          fecha_pago: string
          id: string
          monto_pagado: number
          numero_cuota: number
          observaciones: string | null
          registrado_por: string | null
        }
        Insert: {
          created_at?: string
          credito_id: string
          empresa_id: string
          fecha_pago?: string
          id?: string
          monto_pagado?: number
          numero_cuota: number
          observaciones?: string | null
          registrado_por?: string | null
        }
        Update: {
          created_at?: string
          credito_id?: string
          empresa_id?: string
          fecha_pago?: string
          id?: string
          monto_pagado?: number
          numero_cuota?: number
          observaciones?: string | null
          registrado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pago_cuota_credito_id_fkey"
            columns: ["credito_id"]
            isOneToOne: false
            referencedRelation: "credito"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pago_cuota_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pago_cuota_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      profile: {
        Row: {
          activo: boolean
          apellido: string
          created_at: string
          email: string | null
          empresa_id: string | null
          id: string
          nombre: string
          permisos: Json
          rol: Database["public"]["Enums"]["rol_usuario"]
          telefono: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          apellido?: string
          created_at?: string
          email?: string | null
          empresa_id?: string | null
          id: string
          nombre?: string
          permisos?: Json
          rol?: Database["public"]["Enums"]["rol_usuario"]
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          apellido?: string
          created_at?: string
          email?: string | null
          empresa_id?: string | null
          id?: string
          nombre?: string
          permisos?: Json
          rol?: Database["public"]["Enums"]["rol_usuario"]
          telefono?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      publicacion: {
        Row: {
          canal: Database["public"]["Enums"]["canal_publicacion"]
          created_at: string
          datos: Json
          empresa_id: string
          estado: Database["public"]["Enums"]["estado_publicacion"]
          fecha_pub: string | null
          fecha_update: string | null
          id: string
          link: string | null
          mensaje: string | null
          ml_item_id: string | null
          permalink: string | null
          precio: number | null
          titulo: string | null
          updated_at: string
          vehiculo_id: string | null
        }
        Insert: {
          canal: Database["public"]["Enums"]["canal_publicacion"]
          created_at?: string
          datos?: Json
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado_publicacion"]
          fecha_pub?: string | null
          fecha_update?: string | null
          id?: string
          link?: string | null
          mensaje?: string | null
          ml_item_id?: string | null
          permalink?: string | null
          precio?: number | null
          titulo?: string | null
          updated_at?: string
          vehiculo_id?: string | null
        }
        Update: {
          canal?: Database["public"]["Enums"]["canal_publicacion"]
          created_at?: string
          datos?: Json
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado_publicacion"]
          fecha_pub?: string | null
          fecha_update?: string | null
          id?: string
          link?: string | null
          mensaje?: string | null
          ml_item_id?: string | null
          permalink?: string | null
          precio?: number | null
          titulo?: string | null
          updated_at?: string
          vehiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "publicacion_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacion_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculo"
            referencedColumns: ["id"]
          },
        ]
      }
      reclamo: {
        Row: {
          cliente_id: string | null
          costo_asociado: number | null
          created_at: string
          empresa_id: string
          estado: Database["public"]["Enums"]["estado_reclamo"]
          fecha: string
          id: string
          motivo: string | null
          resolucion: string | null
          responsable: string | null
          updated_at: string
          vehiculo_id: string | null
        }
        Insert: {
          cliente_id?: string | null
          costo_asociado?: number | null
          created_at?: string
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado_reclamo"]
          fecha?: string
          id?: string
          motivo?: string | null
          resolucion?: string | null
          responsable?: string | null
          updated_at?: string
          vehiculo_id?: string | null
        }
        Update: {
          cliente_id?: string | null
          costo_asociado?: number | null
          created_at?: string
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado_reclamo"]
          fecha?: string
          id?: string
          motivo?: string | null
          resolucion?: string | null
          responsable?: string | null
          updated_at?: string
          vehiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reclamo_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reclamo_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reclamo_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculo"
            referencedColumns: ["id"]
          },
        ]
      }
      reserva: {
        Row: {
          cliente_id: string | null
          created_at: string
          empresa_id: string
          estado: Database["public"]["Enums"]["estado_reserva"]
          fecha_reserva: string
          id: string
          medio_pago: Database["public"]["Enums"]["forma_pago"] | null
          monto_sena: number
          observaciones: string | null
          recibo_url: string | null
          updated_at: string
          vehiculo_id: string | null
          vencimiento: string | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado_reserva"]
          fecha_reserva?: string
          id?: string
          medio_pago?: Database["public"]["Enums"]["forma_pago"] | null
          monto_sena?: number
          observaciones?: string | null
          recibo_url?: string | null
          updated_at?: string
          vehiculo_id?: string | null
          vencimiento?: string | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado_reserva"]
          fecha_reserva?: string
          id?: string
          medio_pago?: Database["public"]["Enums"]["forma_pago"] | null
          monto_sena?: number
          observaciones?: string | null
          recibo_url?: string | null
          updated_at?: string
          vehiculo_id?: string | null
          vencimiento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reserva_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reserva_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reserva_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculo"
            referencedColumns: ["id"]
          },
        ]
      }
      seguimiento: {
        Row: {
          cliente_id: string
          created_at: string
          empresa_id: string
          estado: Database["public"]["Enums"]["estado_seguimiento"]
          fecha: string
          hora: string | null
          id: string
          motivo: string | null
          notas: string | null
          updated_at: string
          vendedor_id: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado_seguimiento"]
          fecha?: string
          hora?: string | null
          id?: string
          motivo?: string | null
          notas?: string | null
          updated_at?: string
          vendedor_id?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado_seguimiento"]
          fecha?: string
          hora?: string | null
          id?: string
          motivo?: string | null
          notas?: string | null
          updated_at?: string
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seguimiento_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seguimiento_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seguimiento_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      taller_trabajo: {
        Row: {
          costo_estimado: number | null
          costo_final: number | null
          created_at: string
          empresa_id: string
          estado: Database["public"]["Enums"]["estado_taller"]
          fecha_ingreso: string | null
          fecha_salida_estimada: string | null
          id: string
          responsable: string | null
          taller_externo: string | null
          trabajo: string | null
          updated_at: string
          vehiculo_id: string | null
        }
        Insert: {
          costo_estimado?: number | null
          costo_final?: number | null
          created_at?: string
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado_taller"]
          fecha_ingreso?: string | null
          fecha_salida_estimada?: string | null
          id?: string
          responsable?: string | null
          taller_externo?: string | null
          trabajo?: string | null
          updated_at?: string
          vehiculo_id?: string | null
        }
        Update: {
          costo_estimado?: number | null
          costo_final?: number | null
          created_at?: string
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado_taller"]
          fecha_ingreso?: string | null
          fecha_salida_estimada?: string | null
          id?: string
          responsable?: string | null
          taller_externo?: string | null
          trabajo?: string | null
          updated_at?: string
          vehiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "taller_trabajo_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taller_trabajo_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculo"
            referencedColumns: ["id"]
          },
        ]
      }
      tasacion: {
        Row: {
          cliente_id: string | null
          created_at: string
          decision: Database["public"]["Enums"]["decision_tasacion"] | null
          descripcion: string | null
          empresa_id: string
          gastos_estimados: number | null
          id: string
          margen_estimado: number | null
          observaciones: string | null
          precio_compra_estimado: number | null
          precio_venta_estimado: number | null
          updated_at: string
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          decision?: Database["public"]["Enums"]["decision_tasacion"] | null
          descripcion?: string | null
          empresa_id: string
          gastos_estimados?: number | null
          id?: string
          margen_estimado?: number | null
          observaciones?: string | null
          precio_compra_estimado?: number | null
          precio_venta_estimado?: number | null
          updated_at?: string
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          decision?: Database["public"]["Enums"]["decision_tasacion"] | null
          descripcion?: string | null
          empresa_id?: string
          gastos_estimados?: number | null
          id?: string
          margen_estimado?: number | null
          observaciones?: string | null
          precio_compra_estimado?: number | null
          precio_venta_estimado?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasacion_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasacion_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      test_drive: {
        Row: {
          autorizacion_pdf: string | null
          cliente_id: string | null
          conductor_nombre: string | null
          created_at: string
          dni: string | null
          empresa_id: string
          estado: Database["public"]["Enums"]["estado_test_drive"]
          fecha: string | null
          firma_url: string | null
          hora: string | null
          id: string
          licencia: string | null
          obs_posteriores: string | null
          obs_previas: string | null
          telefono: string | null
          updated_at: string
          vehiculo_id: string | null
        }
        Insert: {
          autorizacion_pdf?: string | null
          cliente_id?: string | null
          conductor_nombre?: string | null
          created_at?: string
          dni?: string | null
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado_test_drive"]
          fecha?: string | null
          firma_url?: string | null
          hora?: string | null
          id?: string
          licencia?: string | null
          obs_posteriores?: string | null
          obs_previas?: string | null
          telefono?: string | null
          updated_at?: string
          vehiculo_id?: string | null
        }
        Update: {
          autorizacion_pdf?: string | null
          cliente_id?: string | null
          conductor_nombre?: string | null
          created_at?: string
          dni?: string | null
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado_test_drive"]
          fecha?: string | null
          firma_url?: string | null
          hora?: string | null
          id?: string
          licencia?: string | null
          obs_posteriores?: string | null
          obs_previas?: string | null
          telefono?: string | null
          updated_at?: string
          vehiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_drive_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_drive_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_drive_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculo"
            referencedColumns: ["id"]
          },
        ]
      }
      vehiculo: {
        Row: {
          anio: number | null
          chasis: string | null
          checklist_ingreso: Json
          color: string | null
          combustible: Database["public"]["Enums"]["combustible"] | null
          created_at: string
          destacado: boolean
          empresa_id: string
          estado: Database["public"]["Enums"]["estado_vehiculo"]
          estado_documental: Database["public"]["Enums"]["estado_documental"]
          fecha_ingreso: string | null
          id: string
          kilometros: number | null
          marca: string
          margen_estimado: number | null
          ml_estado: string | null
          ml_fecha_pub: string | null
          ml_link: string | null
          modelo: string
          mostrar_financiacion: boolean
          mostrar_whatsapp: boolean
          motor: string | null
          observaciones: string | null
          ocultar_precio: boolean
          patente: string | null
          permuta_origen_id: string | null
          precio_costo: number | null
          precio_venta: number | null
          publicado_ml: boolean
          publicado_redes: boolean
          publicado_web: boolean
          slug_publico: string | null
          titularidad: Database["public"]["Enums"]["titularidad_vehiculo"]
          transmision: Database["public"]["Enums"]["transmision"] | null
          ubicacion: string | null
          ultimo_digito: string | null
          updated_at: string
          version: string | null
        }
        Insert: {
          anio?: number | null
          chasis?: string | null
          checklist_ingreso?: Json
          color?: string | null
          combustible?: Database["public"]["Enums"]["combustible"] | null
          created_at?: string
          destacado?: boolean
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado_vehiculo"]
          estado_documental?: Database["public"]["Enums"]["estado_documental"]
          fecha_ingreso?: string | null
          id?: string
          kilometros?: number | null
          marca: string
          margen_estimado?: number | null
          ml_estado?: string | null
          ml_fecha_pub?: string | null
          ml_link?: string | null
          modelo: string
          mostrar_financiacion?: boolean
          mostrar_whatsapp?: boolean
          motor?: string | null
          observaciones?: string | null
          ocultar_precio?: boolean
          patente?: string | null
          permuta_origen_id?: string | null
          precio_costo?: number | null
          precio_venta?: number | null
          publicado_ml?: boolean
          publicado_redes?: boolean
          publicado_web?: boolean
          slug_publico?: string | null
          titularidad?: Database["public"]["Enums"]["titularidad_vehiculo"]
          transmision?: Database["public"]["Enums"]["transmision"] | null
          ubicacion?: string | null
          ultimo_digito?: string | null
          updated_at?: string
          version?: string | null
        }
        Update: {
          anio?: number | null
          chasis?: string | null
          checklist_ingreso?: Json
          color?: string | null
          combustible?: Database["public"]["Enums"]["combustible"] | null
          created_at?: string
          destacado?: boolean
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado_vehiculo"]
          estado_documental?: Database["public"]["Enums"]["estado_documental"]
          fecha_ingreso?: string | null
          id?: string
          kilometros?: number | null
          marca?: string
          margen_estimado?: number | null
          ml_estado?: string | null
          ml_fecha_pub?: string | null
          ml_link?: string | null
          modelo?: string
          mostrar_financiacion?: boolean
          mostrar_whatsapp?: boolean
          motor?: string | null
          observaciones?: string | null
          ocultar_precio?: boolean
          patente?: string | null
          permuta_origen_id?: string | null
          precio_costo?: number | null
          precio_venta?: number | null
          publicado_ml?: boolean
          publicado_redes?: boolean
          publicado_web?: boolean
          slug_publico?: string | null
          titularidad?: Database["public"]["Enums"]["titularidad_vehiculo"]
          transmision?: Database["public"]["Enums"]["transmision"] | null
          ubicacion?: string | null
          ultimo_digito?: string | null
          updated_at?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehiculo_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehiculo_permuta_origen_id_fkey"
            columns: ["permuta_origen_id"]
            isOneToOne: false
            referencedRelation: "permuta"
            referencedColumns: ["id"]
          },
        ]
      }
      venta: {
        Row: {
          checklist_entrega: Json
          cliente_id: string | null
          created_at: string
          doc_pendiente: string | null
          empresa_id: string
          estado_entrega: Database["public"]["Enums"]["estado_entrega"]
          fecha_venta: string
          forma_pago: Database["public"]["Enums"]["forma_pago"]
          id: string
          observaciones: string | null
          precio_final: number
          saldo: number | null
          sena: number
          tiene_credito: boolean
          tiene_permuta: boolean
          updated_at: string
          vehiculo_id: string | null
          vendedor_id: string | null
        }
        Insert: {
          checklist_entrega?: Json
          cliente_id?: string | null
          created_at?: string
          doc_pendiente?: string | null
          empresa_id: string
          estado_entrega?: Database["public"]["Enums"]["estado_entrega"]
          fecha_venta?: string
          forma_pago?: Database["public"]["Enums"]["forma_pago"]
          id?: string
          observaciones?: string | null
          precio_final?: number
          saldo?: number | null
          sena?: number
          tiene_credito?: boolean
          tiene_permuta?: boolean
          updated_at?: string
          vehiculo_id?: string | null
          vendedor_id?: string | null
        }
        Update: {
          checklist_entrega?: Json
          cliente_id?: string | null
          created_at?: string
          doc_pendiente?: string | null
          empresa_id?: string
          estado_entrega?: Database["public"]["Enums"]["estado_entrega"]
          fecha_venta?: string
          forma_pago?: Database["public"]["Enums"]["forma_pago"]
          id?: string
          observaciones?: string | null
          precio_final?: number
          saldo?: number | null
          sena?: number
          tiene_credito?: boolean
          tiene_permuta?: boolean
          updated_at?: string
          vehiculo_id?: string | null
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venta_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venta_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venta_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venta_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      vtv: {
        Row: {
          comprobante_url: string | null
          created_at: string
          empresa_id: string
          estado: Database["public"]["Enums"]["estado_vtv"]
          fecha_vencimiento: string | null
          id: string
          jurisdiccion: string | null
          mes_sugerido: number | null
          observaciones: string | null
          patente: string | null
          ultimo_digito: string | null
          updated_at: string
          vehiculo_id: string | null
        }
        Insert: {
          comprobante_url?: string | null
          created_at?: string
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado_vtv"]
          fecha_vencimiento?: string | null
          id?: string
          jurisdiccion?: string | null
          mes_sugerido?: number | null
          observaciones?: string | null
          patente?: string | null
          ultimo_digito?: string | null
          updated_at?: string
          vehiculo_id?: string | null
        }
        Update: {
          comprobante_url?: string | null
          created_at?: string
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado_vtv"]
          fecha_vencimiento?: string | null
          id?: string
          jurisdiccion?: string | null
          mes_sugerido?: number | null
          observaciones?: string | null
          patente?: string | null
          ultimo_digito?: string | null
          updated_at?: string
          vehiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vtv_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vtv_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculo"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_account: {
        Row: {
          access_token_encrypted: string | null
          business_id: string | null
          conectado_at: string | null
          conectado_por: string | null
          created_at: string
          display_phone_number: string | null
          empresa_id: string
          estado: Database["public"]["Enums"]["estado_wa_cuenta"]
          fb_user_id: string | null
          id: string
          last_error: string | null
          phone_number_id: string | null
          provider: string
          updated_at: string
          waba_id: string | null
        }
        Insert: {
          access_token_encrypted?: string | null
          business_id?: string | null
          conectado_at?: string | null
          conectado_por?: string | null
          created_at?: string
          display_phone_number?: string | null
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado_wa_cuenta"]
          fb_user_id?: string | null
          id?: string
          last_error?: string | null
          phone_number_id?: string | null
          provider?: string
          updated_at?: string
          waba_id?: string | null
        }
        Update: {
          access_token_encrypted?: string | null
          business_id?: string | null
          conectado_at?: string | null
          conectado_por?: string | null
          created_at?: string
          display_phone_number?: string | null
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado_wa_cuenta"]
          fb_user_id?: string | null
          id?: string
          last_error?: string | null
          phone_number_id?: string | null
          provider?: string
          updated_at?: string
          waba_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_account_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_account_conectado_por_fkey"
            columns: ["conectado_por"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_bot_config: {
        Row: {
          created_at: string
          direccion: string | null
          empresa_id: string
          financiacion: string | null
          habilitado: boolean
          horarios: string | null
          id: string
          keywords_handoff: Json
          mensaje_fallback: string
          nombre_comercial: string | null
          pausa_intervencion_min: number
          politica_permuta: string | null
          tono: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          direccion?: string | null
          empresa_id: string
          financiacion?: string | null
          habilitado?: boolean
          horarios?: string | null
          id?: string
          keywords_handoff?: Json
          mensaje_fallback?: string
          nombre_comercial?: string | null
          pausa_intervencion_min?: number
          politica_permuta?: string | null
          tono?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          direccion?: string | null
          empresa_id?: string
          financiacion?: string | null
          habilitado?: boolean
          horarios?: string | null
          id?: string
          keywords_handoff?: Json
          mensaje_fallback?: string
          nombre_comercial?: string | null
          pausa_intervencion_min?: number
          politica_permuta?: string | null
          tono?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_bot_config_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversacion: {
        Row: {
          account_id: string | null
          asignado_a: string | null
          bot_activo: boolean
          bot_pausado_hasta: string | null
          cliente_id: string | null
          created_at: string
          empresa_id: string
          estado: Database["public"]["Enums"]["estado_wa_conversacion"]
          id: string
          last_message_at: string | null
          last_message_preview: string | null
          no_leidos: number
          nombre_contacto: string | null
          telefono: string
          ultima_entrada_at: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          asignado_a?: string | null
          bot_activo?: boolean
          bot_pausado_hasta?: string | null
          cliente_id?: string | null
          created_at?: string
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado_wa_conversacion"]
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          no_leidos?: number
          nombre_contacto?: string | null
          telefono: string
          ultima_entrada_at?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          asignado_a?: string | null
          bot_activo?: boolean
          bot_pausado_hasta?: string | null
          cliente_id?: string | null
          created_at?: string
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado_wa_conversacion"]
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          no_leidos?: number
          nombre_contacto?: string | null
          telefono?: string
          ultima_entrada_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversacion_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversacion_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_account"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversacion_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversacion_asignado_a_fkey"
            columns: ["asignado_a"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_evento_log: {
        Row: {
          created_at: string
          datos: Json | null
          detalle: string | null
          empresa_id: string
          id: string
          tipo: Database["public"]["Enums"]["tipo_wa_evento"]
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          datos?: Json | null
          detalle?: string | null
          empresa_id: string
          id?: string
          tipo: Database["public"]["Enums"]["tipo_wa_evento"]
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          datos?: Json | null
          detalle?: string | null
          empresa_id?: string
          id?: string
          tipo?: Database["public"]["Enums"]["tipo_wa_evento"]
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_evento_log_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_evento_log_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_mensaje: {
        Row: {
          conversacion_id: string
          created_at: string
          cuerpo: string | null
          direccion: Database["public"]["Enums"]["direccion_wa_mensaje"]
          empresa_id: string
          enviado_por: string | null
          enviado_por_bot: boolean
          error_mensaje: string | null
          estado: Database["public"]["Enums"]["estado_wa_mensaje"]
          id: string
          media_url: string | null
          raw_payload: Json | null
          tipo: Database["public"]["Enums"]["tipo_wa_mensaje"]
          updated_at: string
          wa_message_id: string | null
        }
        Insert: {
          conversacion_id: string
          created_at?: string
          cuerpo?: string | null
          direccion: Database["public"]["Enums"]["direccion_wa_mensaje"]
          empresa_id: string
          enviado_por?: string | null
          enviado_por_bot?: boolean
          error_mensaje?: string | null
          estado?: Database["public"]["Enums"]["estado_wa_mensaje"]
          id?: string
          media_url?: string | null
          raw_payload?: Json | null
          tipo?: Database["public"]["Enums"]["tipo_wa_mensaje"]
          updated_at?: string
          wa_message_id?: string | null
        }
        Update: {
          conversacion_id?: string
          created_at?: string
          cuerpo?: string | null
          direccion?: Database["public"]["Enums"]["direccion_wa_mensaje"]
          empresa_id?: string
          enviado_por?: string | null
          enviado_por_bot?: boolean
          error_mensaje?: string | null
          estado?: Database["public"]["Enums"]["estado_wa_mensaje"]
          id?: string
          media_url?: string | null
          raw_payload?: Json | null
          tipo?: Database["public"]["Enums"]["tipo_wa_mensaje"]
          updated_at?: string
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_mensaje_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_mensaje_conversacion_id_fkey"
            columns: ["conversacion_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversacion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_mensaje_enviado_por_fkey"
            columns: ["enviado_por"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_plantilla: {
        Row: {
          categoria: Database["public"]["Enums"]["categoria_wa_plantilla"]
          created_at: string
          cuerpo: string
          empresa_id: string
          estado: Database["public"]["Enums"]["estado_wa_plantilla"]
          id: string
          idioma: string
          nombre: string
          updated_at: string
          variables_schema: Json
        }
        Insert: {
          categoria?: Database["public"]["Enums"]["categoria_wa_plantilla"]
          created_at?: string
          cuerpo: string
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado_wa_plantilla"]
          id?: string
          idioma?: string
          nombre: string
          updated_at?: string
          variables_schema?: Json
        }
        Update: {
          categoria?: Database["public"]["Enums"]["categoria_wa_plantilla"]
          created_at?: string
          cuerpo?: string
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado_wa_plantilla"]
          id?: string
          idioma?: string
          nombre?: string
          updated_at?: string
          variables_schema?: Json
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_plantilla_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_programado: {
        Row: {
          cliente_id: string | null
          conversacion_id: string | null
          created_at: string
          creado_por: string | null
          creado_por_sistema: boolean
          cuerpo_texto: string | null
          empresa_id: string
          enviado_at: string | null
          error_mensaje: string | null
          estado: Database["public"]["Enums"]["estado_wa_programado"]
          id: string
          idioma: string | null
          intentos_restantes: number
          motivo: Database["public"]["Enums"]["motivo_wa_programado"]
          plantilla_id: string | null
          plantilla_nombre: string | null
          send_at: string
          telefono: string
          updated_at: string
          variables: Json
        }
        Insert: {
          cliente_id?: string | null
          conversacion_id?: string | null
          created_at?: string
          creado_por?: string | null
          creado_por_sistema?: boolean
          cuerpo_texto?: string | null
          empresa_id: string
          enviado_at?: string | null
          error_mensaje?: string | null
          estado?: Database["public"]["Enums"]["estado_wa_programado"]
          id?: string
          idioma?: string | null
          intentos_restantes?: number
          motivo?: Database["public"]["Enums"]["motivo_wa_programado"]
          plantilla_id?: string | null
          plantilla_nombre?: string | null
          send_at: string
          telefono: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          cliente_id?: string | null
          conversacion_id?: string | null
          created_at?: string
          creado_por?: string | null
          creado_por_sistema?: boolean
          cuerpo_texto?: string | null
          empresa_id?: string
          enviado_at?: string | null
          error_mensaje?: string | null
          estado?: Database["public"]["Enums"]["estado_wa_programado"]
          id?: string
          idioma?: string | null
          intentos_restantes?: number
          motivo?: Database["public"]["Enums"]["motivo_wa_programado"]
          plantilla_id?: string | null
          plantilla_nombre?: string | null
          send_at?: string
          telefono?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_programado_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_programado_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_programado_conversacion_id_fkey"
            columns: ["conversacion_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversacion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_programado_plantilla_id_fkey"
            columns: ["plantilla_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_plantilla"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_programado_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_empresa_id: { Args: never; Returns: string }
      auth_rol: {
        Args: never
        Returns: Database["public"]["Enums"]["rol_usuario"]
      }
      crm_run_daily_jobs: { Args: never; Returns: undefined }
      ml_registrar_notificacion: { Args: { p: Json }; Returns: string }
      stock_publico: { Args: { p_slug: string }; Returns: Json }
    }
    Enums: {
      canal_publicacion: "web" | "mercadolibre" | "redes"
      combustible: "nafta" | "diesel" | "gnc" | "hibrido" | "electrico"
      decision_tasacion: "tomar" | "rechazar" | "consultar" | "negociar"
      estado_comision: "pendiente" | "pagada" | "cancelada"
      estado_consignacion: "activa" | "vencida" | "vendida" | "retirada"
      estado_credito: "activo" | "por_terminar" | "finalizado" | "cancelado"
      estado_documental: "completo" | "incompleto" | "pendiente" | "observado"
      estado_presupuesto:
        | "borrador"
        | "enviado"
        | "aceptado"
        | "rechazado"
        | "vencido"
      estado_encargo:
        | "buscando"
        | "unidad_encontrada"
        | "ofrecido"
        | "cerrado"
        | "perdido"
      estado_entrega: "pendiente" | "en_preparacion" | "listo" | "entregado"
      estado_lead:
        | "nuevo"
        | "contactado"
        | "interesado"
        | "agendo_visita"
        | "visito_agencia"
        | "pidio_financiacion"
        | "reservado"
        | "vendido"
        | "perdido"
      estado_publicacion: "borrador" | "publicado" | "pausado" | "vendido"
      estado_reclamo:
        | "nuevo"
        | "en_revision"
        | "en_taller"
        | "resuelto"
        | "rechazado"
      estado_reserva: "activa" | "vencida" | "caida" | "convertida"
      estado_seguimiento: "pendiente" | "realizado" | "vencido" | "cancelado"
      estado_taller:
        | "pendiente"
        | "en_taller"
        | "listo_publicar"
        | "listo_entregar"
      estado_tasacion:
        | "pendiente"
        | "tasado"
        | "aceptado"
        | "rechazado"
        | "en_negociacion"
      estado_test_drive: "agendado" | "realizado" | "cancelado" | "no_asistio"
      estado_vehiculo:
        | "disponible"
        | "en_preparacion"
        | "publicado"
        | "no_publicado"
        | "pausado"
        | "reservado"
        | "en_negociacion"
        | "vendido"
        | "consignado"
      estado_vtv: "vigente" | "por_vencer" | "vencida" | "pendiente"
      forma_pago: "efectivo" | "transferencia" | "credito" | "mixto" | "permuta"
      origen_lead:
        | "whatsapp"
        | "instagram"
        | "facebook"
        | "mercadolibre"
        | "web"
        | "referido"
        | "presencial"
        | "otro"
      rol_usuario:
        | "dueno"
        | "encargado"
        | "vendedor"
        | "administrativo"
        | "gestoria"
        | "solo_lectura"
      tipo_comision: "fija" | "porcentaje"
      tipo_doc_comercial:
        | "boleto"
        | "recibo_sena"
        | "recibo_pago"
        | "presupuesto"
        | "datero"
        | "autorizacion_test_drive"
        | "autorizacion_entrega"
        | "autorizacion_retiro_doc"
        | "ficha_cliente"
        | "ficha_vehiculo"
        | "autorizacion_conducir"
      tipo_doc_vehiculo:
        | "cedula"
        | "titulo"
        | "vtv"
        | "seguro"
        | "verificacion_policial"
        | "informe_dominio"
        | "libre_deuda"
        | "manuales"
        | "segunda_llave"
        | "comprobantes"
      tipo_gasto:
        | "lavado"
        | "detailing"
        | "mecanica"
        | "cubiertas"
        | "bateria"
        | "gestoria"
        | "verificacion_policial"
        | "vtv"
        | "publicidad"
        | "traslado"
        | "reparaciones"
        | "otros"
      titularidad_vehiculo: "propio" | "consignado" | "tercero"
      transmision: "manual" | "automatica"
      urgencia: "baja" | "media" | "alta"
      categoria_wa_plantilla: "utility" | "marketing" | "authentication"
      direccion_wa_mensaje: "entrante" | "saliente"
      estado_wa_conversacion: "abierta" | "pendiente" | "cerrada"
      estado_wa_cuenta: "conectado" | "desconectado" | "error"
      estado_wa_mensaje:
        | "recibido"
        | "enviado"
        | "entregado"
        | "leido"
        | "fallado"
      estado_wa_plantilla: "aprobada" | "pendiente" | "rechazada" | "desconocido"
      estado_wa_programado: "pendiente" | "enviado" | "fallado" | "cancelado"
      motivo_wa_programado:
        | "seguimiento"
        | "cuota"
        | "postventa"
        | "vtv"
        | "service"
        | "renovacion"
        | "promo"
        | "otro"
      tipo_wa_evento:
        | "conexion"
        | "desconexion"
        | "webhook_error"
        | "mensaje_enviado"
        | "mensaje_fallado"
        | "bot_activado"
        | "bot_pausado"
        | "asignacion"
        | "programado_creado"
        | "programado_cancelado"
        | "otro"
      tipo_wa_mensaje:
        | "texto"
        | "imagen"
        | "audio"
        | "documento"
        | "video"
        | "plantilla"
        | "sistema"
        | "otro"
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
      canal_publicacion: ["web", "mercadolibre", "redes"],
      combustible: ["nafta", "diesel", "gnc", "hibrido", "electrico"],
      decision_tasacion: ["tomar", "rechazar", "consultar", "negociar"],
      estado_comision: ["pendiente", "pagada", "cancelada"],
      estado_consignacion: ["activa", "vencida", "vendida", "retirada"],
      estado_credito: ["activo", "por_terminar", "finalizado", "cancelado"],
      estado_documental: ["completo", "incompleto", "pendiente", "observado"],
      estado_presupuesto: [
        "borrador",
        "enviado",
        "aceptado",
        "rechazado",
        "vencido",
      ],
      estado_encargo: [
        "buscando",
        "unidad_encontrada",
        "ofrecido",
        "cerrado",
        "perdido",
      ],
      estado_entrega: ["pendiente", "en_preparacion", "listo", "entregado"],
      estado_lead: [
        "nuevo",
        "contactado",
        "interesado",
        "agendo_visita",
        "visito_agencia",
        "pidio_financiacion",
        "reservado",
        "vendido",
        "perdido",
      ],
      estado_publicacion: ["borrador", "publicado", "pausado", "vendido"],
      estado_reclamo: [
        "nuevo",
        "en_revision",
        "en_taller",
        "resuelto",
        "rechazado",
      ],
      estado_reserva: ["activa", "vencida", "caida", "convertida"],
      estado_seguimiento: ["pendiente", "realizado", "vencido", "cancelado"],
      estado_taller: [
        "pendiente",
        "en_taller",
        "listo_publicar",
        "listo_entregar",
      ],
      estado_tasacion: [
        "pendiente",
        "tasado",
        "aceptado",
        "rechazado",
        "en_negociacion",
      ],
      estado_test_drive: ["agendado", "realizado", "cancelado", "no_asistio"],
      estado_vehiculo: [
        "disponible",
        "en_preparacion",
        "publicado",
        "no_publicado",
        "pausado",
        "reservado",
        "en_negociacion",
        "vendido",
        "consignado",
      ],
      estado_vtv: ["vigente", "por_vencer", "vencida", "pendiente"],
      forma_pago: ["efectivo", "transferencia", "credito", "mixto", "permuta"],
      origen_lead: [
        "whatsapp",
        "instagram",
        "facebook",
        "mercadolibre",
        "web",
        "referido",
        "presencial",
        "otro",
      ],
      rol_usuario: [
        "dueno",
        "encargado",
        "vendedor",
        "administrativo",
        "gestoria",
        "solo_lectura",
      ],
      tipo_comision: ["fija", "porcentaje"],
      tipo_doc_comercial: [
        "boleto",
        "recibo_sena",
        "recibo_pago",
        "presupuesto",
        "datero",
        "autorizacion_test_drive",
        "autorizacion_entrega",
        "autorizacion_retiro_doc",
        "ficha_cliente",
        "ficha_vehiculo",
        "autorizacion_conducir",
      ],
      tipo_doc_vehiculo: [
        "cedula",
        "titulo",
        "vtv",
        "seguro",
        "verificacion_policial",
        "informe_dominio",
        "libre_deuda",
        "manuales",
        "segunda_llave",
        "comprobantes",
      ],
      tipo_gasto: [
        "lavado",
        "detailing",
        "mecanica",
        "cubiertas",
        "bateria",
        "gestoria",
        "verificacion_policial",
        "vtv",
        "publicidad",
        "traslado",
        "reparaciones",
        "otros",
      ],
      titularidad_vehiculo: ["propio", "consignado", "tercero"],
      transmision: ["manual", "automatica"],
      urgencia: ["baja", "media", "alta"],
      categoria_wa_plantilla: ["utility", "marketing", "authentication"],
      direccion_wa_mensaje: ["entrante", "saliente"],
      estado_wa_conversacion: ["abierta", "pendiente", "cerrada"],
      estado_wa_cuenta: ["conectado", "desconectado", "error"],
      estado_wa_mensaje: [
        "recibido",
        "enviado",
        "entregado",
        "leido",
        "fallado",
      ],
      estado_wa_plantilla: [
        "aprobada",
        "pendiente",
        "rechazada",
        "desconocido",
      ],
      estado_wa_programado: ["pendiente", "enviado", "fallado", "cancelado"],
      motivo_wa_programado: [
        "seguimiento",
        "cuota",
        "postventa",
        "vtv",
        "service",
        "renovacion",
        "promo",
        "otro",
      ],
      tipo_wa_evento: [
        "conexion",
        "desconexion",
        "webhook_error",
        "mensaje_enviado",
        "mensaje_fallado",
        "bot_activado",
        "bot_pausado",
        "asignacion",
        "programado_creado",
        "programado_cancelado",
        "otro",
      ],
      tipo_wa_mensaje: [
        "texto",
        "imagen",
        "audio",
        "documento",
        "video",
        "plantilla",
        "sistema",
        "otro",
      ],
    },
  },
} as const
