import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'ghost';
  };
  className?: string;
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  action, 
  className 
}: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 text-center',
      className
    )}>
      {icon && (
        <div className="mb-4">
          {icon}
        </div>
      )}
      
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      
      {description && (
        <p className="text-sm text-muted-foreground mb-4 max-w-md">
          {description}
        </p>
      )}
      
      {action && (
        <button
          onClick={action.onClick}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            action.variant === 'outline' && 'border hover:bg-accent',
            action.variant === 'ghost' && 'hover:bg-accent',
            action.variant === 'default' && 'bg-primary text-primary-foreground hover:bg-primary/90',
            !action.variant && 'bg-primary text-primary-foreground hover:bg-primary/90'
          )}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// Variants predefinidos para uso común
export function EmptyContacts({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon={<span className="text-6xl">👥</span>}
      title="No hay contactos"
      description="Crea tu primer contacto o impórtalos desde un archivo CSV"
      action={
        onCreate ? {
          label: 'Crear Contacto',
          onClick: onCreate,
          variant: 'default'
        } : undefined
      }
    />
  );
}

export function EmptyTasks({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon={<span className="text-6xl">📋</span>}
      title="No hay tareas"
      description="Organiza tu día creando nuevas tareas"
      action={
        onCreate ? {
          label: 'Crear Tarea',
          onClick: onCreate,
          variant: 'default'
        } : undefined
      }
    />
  );
}

export function EmptyKanban({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon={<span className="text-6xl">📊</span>}
      title="Tablero vacío"
      description="Añade contactos a tu pipeline para comenzar"
      action={
        onCreate ? {
          label: 'Crear Contacto',
          onClick: onCreate,
          variant: 'default'
        } : undefined
      }
    />
  );
}

export function EmptySearch({ query }: { query: string }) {
  return (
    <EmptyState
      icon={<span className="text-6xl">🔍</span>}
      title="No se encontraron resultados"
      description={`No encontramos nada para "${query}"`}
    />
  );
}

export function EmptyStateLoading({ 
  title = 'Cargando...',
  description = 'Por favor espera un momento' 
}: { 
  title?: string; 
  description?: string; 
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-12 h-12 border-4 border-t-4 border-primary rounded-full animate-spin mb-4" />
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
