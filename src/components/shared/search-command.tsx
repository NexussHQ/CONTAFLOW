'use client';

import { useState, useEffect } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { DialogTitle } from '@/components/ui/dialog';
import { Search, Plus, Folder, FileText, CheckSquare, Settings, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useContacts } from '@/hooks/use-contacts';
import { useTasks } from '@/hooks/use-tasks';
import { CONTACT_TYPES, KANBAN_TYPES } from '@/lib/constants';
import { useUIStore } from '@/stores/ui-store';

interface SearchResult {
  id: string;
  type: 'contact' | 'task' | 'action';
  title: string;
  subtitle?: string;
  icon: any;
  action?: () => void;
}

export function SearchCommand() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const router = useRouter();
  const { contacts } = useContacts();
  const { tasks } = useTasks();
  const { searchOpen, setSearchOpen, toggleSearch } = useUIStore();

  useEffect(() => {
    setSearchOpen(open);
  }, [open, setSearchOpen]);

  // Manejar atajo de teclado Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleSearch();
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, toggleSearch]);

  useEffect(() => {
    if (!query.trim()) {
      setResults(getDefaultActions());
      return;
    }

    const searchResults: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    // Buscar contactos
    contacts.forEach(contact => {
      if (
        contact.nombre.toLowerCase().includes(lowerQuery) ||
        contact.email?.toLowerCase().includes(lowerQuery) ||
        contact.ruc?.includes(lowerQuery) ||
        contact.telefono?.includes(lowerQuery)
      ) {
        const contactType = CONTACT_TYPES[contact.tipo];
        searchResults.push({
          id: `contact-${contact.id}`,
          type: 'contact',
          title: contact.nombre,
          subtitle: contact.email || contact.telefono || contact.ruc,
          icon: contactType.emoji,
          action: () => router.push(`/ficha/${contact.id}`)
        });
      }
    });

    // Buscar tareas
    tasks.forEach(task => {
      if (
        task.title.toLowerCase().includes(lowerQuery) ||
        task.description?.toLowerCase().includes(lowerQuery)
      ) {
        const isCompleted = task.status === 'completed';
        searchResults.push({
          id: `task-${task.id}`,
          type: 'task',
          title: task.title,
          subtitle: task.description || `${isCompleted ? '✅' : '📋'} Tarea`,
          icon: isCompleted ? '✅' : '📝',
          action: () => router.push('/tasks')
        });
      }
    });

    // Añadir acciones predeterminadas si hay coincidencias
    if (lowerQuery.includes('crear') || lowerQuery.includes('nuevo')) {
      searchResults.push({
        id: 'action-create-contact',
        type: 'action',
        title: 'Crear Nuevo Contacto',
        icon: <Plus className="h-4 w-4" />,
        action: () => {
          setOpen(false);
          router.push('/fichas');
        }
      });
      searchResults.push({
        id: 'action-create-task',
        type: 'action',
        title: 'Crear Nueva Tarea',
        icon: <CheckSquare className="h-4 w-4" />,
        action: () => {
          setOpen(false);
          router.push('/tasks');
        }
      });
    }

    if (lowerQuery.includes('ajuste') || lowerQuery.includes('setting')) {
      searchResults.push({
        id: 'action-settings',
        type: 'action',
        title: 'Ir a Ajustes',
        icon: <Settings className="h-4 w-4" />,
        action: () => {
          setOpen(false);
          router.push('/ajustes');
        }
      });
    }

    // Limitar a 10 resultados
    setResults(searchResults.slice(0, 10));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, contacts, tasks, router]);

  const getDefaultActions = (): SearchResult[] => [
    {
      id: 'action-contacts',
      type: 'action',
      title: 'Ver Todos los Contactos',
      icon: <Users className="h-4 w-4" />,
      action: () => {
        setOpen(false);
        router.push('/fichas');
      }
    },
    {
      id: 'action-tasks',
      type: 'action',
      title: 'Ver Todas las Tareas',
      icon: <CheckSquare className="h-4 w-4" />,
      action: () => {
        setOpen(false);
        router.push('/tasks');
      }
    },
    {
      id: 'action-dashboard',
      type: 'action',
      title: 'Ir al Dashboard',
      icon: <Folder className="h-4 w-4" />,
      action: () => {
        setOpen(false);
        router.push('/dashboard');
      }
    },
    {
      id: 'action-sales',
      type: 'action',
      title: 'Ir a Ventas',
      icon: <FileText className="h-4 w-4" />,
      action: () => {
        setOpen(false);
        router.push('/ventas');
      }
    },
    {
      id: 'action-operations',
      type: 'action',
      title: 'Ir a Operaciones',
      icon: <FileText className="h-4 w-4" />,
      action: () => {
        setOpen(false);
        router.push('/postventa');
      }
    },
    {
      id: 'action-create-contact',
      type: 'action',
      title: 'Crear Nuevo Contacto',
      icon: <Plus className="h-4 w-4" />,
      action: () => {
        setOpen(false);
        router.push('/fichas');
      }
    },
    {
      id: 'action-create-task',
      type: 'action',
      title: 'Crear Nueva Tarea',
      icon: <CheckSquare className="h-4 w-4" />,
      action: () => {
        setOpen(false);
        router.push('/tasks');
      }
    },
    {
      id: 'action-settings',
      type: 'action',
      title: 'Ir a Ajustes',
      icon: <Settings className="h-4 w-4" />,
      action: () => {
        setOpen(false);
        router.push('/ajustes');
      }
    },
  ];

  const handleSelect = (result: SearchResult) => {
    if (result.action) {
      result.action();
    }
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <DialogTitle className="sr-only">Búsqueda Global</DialogTitle>
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <CommandInput
            placeholder="Buscar contactos, tareas o acciones..."
            value={query}
            onValueChange={setQuery}
            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <CommandList>
          {query.trim() === '' ? (
            <CommandGroup heading="Acciones Rápidas">
              {results.map((result) => (
                <CommandItem
                  key={result.id}
                  onSelect={() => handleSelect(result)}
                  className="flex items-center gap-3"
                >
                  <span className="text-lg">{result.icon}</span>
                  <span className="flex-1">{result.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : results.length === 0 ? (
            <CommandEmpty>
              <div className="py-6 text-center text-sm">
                No se encontraron resultados para &quot;<span className="font-medium">{query}</span>&quot;
              </div>
            </CommandEmpty>
          ) : (
            <>
              <CommandGroup heading="Resultados">
                {results.map((result) => (
                  <CommandItem
                    key={result.id}
                    onSelect={() => handleSelect(result)}
                    className="flex items-center gap-3"
                  >
                    <span className="text-lg">{result.icon}</span>
                    <div className="flex flex-1 flex-col">
                      <span className="text-sm font-medium">{result.title}</span>
                      {result.subtitle && (
                        <span className="text-xs text-muted-foreground">
                          {result.subtitle}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
