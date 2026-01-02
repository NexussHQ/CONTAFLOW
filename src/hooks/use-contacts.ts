import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface Contact {
  id: string;
  user_id: string;
  nombre: string;
  ruc: string;
  tipo: 'lead' | 'cliente' | 'socio' | 'colega';
  relacion: string;
  telefono: string;
  email: string;
  direccion: string;
  creado_at: string;
  actualizado_at: string;
  columna_kanban_id: string | null;
  custom_values: Record<string, any>;
  columnas_kanban?: {
    id: string;
    nombre: string;
    color: string;
  };
  timeline?: Array<{
    id: string;
    tipo: string;
    descripcion: string;
    creado_at: string;
  }>;
}

interface UseContactsReturn {
  contacts: Contact[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createContact: (contact: Partial<Contact>) => Promise<Contact | null>;
  updateContact: (id: string, updates: Partial<Contact>) => Promise<boolean>;
  deleteContact: (id: string) => Promise<boolean>;
  convertToClient: (id: string) => Promise<boolean>;
}

export function useContacts(filters?: { tipo?: string; relacion?: string; columnaId?: string }): UseContactsReturn {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      
      let query = supabase
        .from('fichas')
        .select('*, columnas_kanban(id, nombre, color), timeline(id, tipo, descripcion, creado_at)');
      
      if (filters?.tipo) query = query.eq('tipo', filters.tipo);
      if (filters?.relacion) query = query.eq('relacion', filters.relacion);
      if (filters?.columnaId) query = query.eq('columna_kanban_id', filters.columnaId);
      
      const { data, error: fetchError } = await query.order('creado_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      setContacts(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar contactos');
      console.error('Error fetching contacts:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const createContact = useCallback(async (contact: Partial<Contact>): Promise<Contact | null> => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('fichas')
        .insert({
          nombre: contact.nombre || '',
          ruc: contact.ruc || '',
          tipo: contact.tipo || 'lead',
          relacion: contact.relacion || '',
          telefono: contact.telefono || '',
          email: contact.email || '',
          direccion: contact.direccion || '',
          custom_values: contact.custom_values || {}
        })
        .select()
        .single();

      if (error) throw error;
      await fetchContacts();
      return data;
    } catch (err) {
      console.error('Error creating contact:', err);
      return null;
    }
  }, [fetchContacts]);

  const updateContact = useCallback(async (id: string, updates: Partial<Contact>): Promise<boolean> => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('fichas')
        .update({
          ...updates,
          actualizado_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      await fetchContacts();
      return true;
    } catch (err) {
      console.error('Error updating contact:', err);
      return false;
    }
  }, [fetchContacts]);

  const deleteContact = useCallback(async (id: string): Promise<boolean> => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('fichas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchContacts();
      return true;
    } catch (err) {
      console.error('Error deleting contact:', err);
      return false;
    }
  }, [fetchContacts]);

  const convertToClient = useCallback(async (id: string): Promise<boolean> => {
    try {
      return await updateContact(id, { tipo: 'cliente' });
    } catch (err) {
      console.error('Error converting to client:', err);
      return false;
    }
  }, [updateContact]);

  return {
    contacts,
    loading,
    error,
    refetch: fetchContacts,
    createContact,
    updateContact,
    deleteContact,
    convertToClient
  };
}

export function useLeads() {
  return useContacts({ tipo: 'lead' });
}

export function useClients() {
  return useContacts({ tipo: 'cliente' });
}

export function useContactById(id: string) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContact = async () => {
      try {
        setLoading(true);
        setError(null);
        const supabase = createClient();
        
        const { data, error: fetchError } = await supabase
          .from('fichas')
          .select('*, columnas_kanban(id, nombre, color), timeline(*)')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;
        setContact(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar contacto');
        console.error('Error fetching contact:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchContact();
    }
  }, [id]);

  return { contact, loading, error };
}
