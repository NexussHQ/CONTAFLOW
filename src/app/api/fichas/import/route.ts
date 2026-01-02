import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { contacts, mapping } = await request.json();

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json(
        { error: 'No hay contactos para importar' },
        { status: 400 }
      );
    }

    if (!mapping || typeof mapping !== 'object') {
      return NextResponse.json(
        { error: 'El mapeo de campos es requerido' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Obtener la primera columna Kanban para asignar por defecto
    const { data: firstColumn } = await supabase
      .from('columnas_kanban')
      .select('id')
      .eq('user_id', user.id)
      .eq('tipo', 'ventas')
      .order('posicion', { ascending: true })
      .limit(1)
      .single();

    const defaultColumnId = firstColumn?.id || null;

    // Procesar y validar cada contacto
    const validatedContacts = contacts
      .map((contact: any) => {
        const nombre = contact[mapping.nombre] || '';
        const ruc = contact[mapping.ruc] || '';
        const email = contact[mapping.email] || '';
        const telefono = contact[mapping.telefono] || '';
        const direccion = contact[mapping.direccion] || '';

        // Validaciones básicas
        if (!nombre.trim()) return null;
        if (!ruc.trim()) return null;

        // Validación de RUC (Ecuador - 13 dígitos)
        const rucClean = ruc.replace(/[^0-9]/g, '');
        if (rucClean.length !== 13) {
          console.warn(`RUC inválido: ${ruc}`);
        }

        return {
          user_id: user.id,
          nombre: nombre.trim(),
          ruc: rucClean,
          email: email.trim(),
          telefono: telefono.trim(),
          direccion: direccion.trim(),
          tipo: 'lead',
          relacion: '',
          columna_kanban_id: defaultColumnId,
          custom_values: {}
        };
      })
      .filter((contact): contact is NonNullable<typeof contact> => contact !== null);

    if (validatedContacts.length === 0) {
      return NextResponse.json(
        { error: 'No hay contactos válidos para importar' },
        { status: 400 }
      );
    }

    // Insertar en batch (máximo 1000 registros)
    const batchSize = 1000;
    const batches = Math.ceil(validatedContacts.length / batchSize);
    let importedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < batches; i++) {
      const start = i * batchSize;
      const end = start + batchSize;
      const batch = validatedContacts.slice(start, end);

      try {
        const { error: insertError } = await supabase
          .from('fichas')
          .insert(batch)
          .select();

        if (insertError) {
          console.error(`Error al insertar lote ${i + 1}:`, insertError);
          errors.push(`Lote ${i + 1}: ${insertError.message}`);
        } else {
          importedCount += batch.length;
        }
      } catch (error) {
        console.error(`Error en lote ${i + 1}:`, error);
        errors.push(`Lote ${i + 1}: Error inesperado`);
      }
    }

    // Registrar timeline events para cada contacto importado
    if (importedCount > 0) {
      const { data: importedContacts } = await supabase
        .from('fichas')
        .select('id, nombre')
        .eq('user_id', user.id)
        .order('creado_at', { ascending: false })
        .limit(importedCount);

      if (importedContacts) {
        const timelineEvents = importedContacts.map(contact => ({
          ficha_id: contact.id,
          tipo: 'importacion',
          descripcion: `Contacto importado masivamente`,
          usuario_id: user.id
        }));

        if (timelineEvents.length > 0) {
          await supabase.from('timeline').insert(timelineEvents);
        }
      }
    }

    return NextResponse.json({
      success: true,
      imported: importedCount,
      total: contacts.length,
      errors: errors.length > 0 ? errors : undefined
    }, { status: 200 });

  } catch (error) {
    console.error('Error al importar contactos:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al importar contactos' },
      { status: 500 }
    );
  }
}
