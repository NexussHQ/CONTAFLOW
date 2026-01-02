'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle, Info, CheckCircle, XCircle, Trash2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ConfirmDialogVariant = 'default' | 'destructive' | 'warning' | 'success' | 'info';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  isLoading?: boolean;
}

const VARIANT_CONFIG = {
  default: {
    icon: Info,
    iconColor: 'text-blue-500',
    confirmVariant: 'default' as const,
  },
  destructive: {
    icon: Trash2,
    iconColor: 'text-red-500',
    confirmVariant: 'destructive' as const,
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-yellow-500',
    confirmVariant: 'default' as const,
  },
  success: {
    icon: CheckCircle,
    iconColor: 'text-green-500',
    confirmVariant: 'default' as const,
  },
  info: {
    icon: AlertCircle,
    iconColor: 'text-blue-500',
    confirmVariant: 'default' as const,
  },
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  isLoading = false,
}: ConfirmDialogProps) {
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex flex-col items-center gap-2">
            <div className={cn('p-3 rounded-full bg-muted', variant === 'destructive' && 'bg-red-50')}>
              <Icon className={cn('h-6 w-6', config.iconColor)} />
            </div>
            <DialogTitle className="text-center">{title}</DialogTitle>
          </div>
          {description && (
            <DialogDescription className="text-center">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-center">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {cancelLabel}
          </Button>
          <Button
            variant={config.confirmVariant}
            onClick={handleConfirm}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading ? 'Procesando...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Componentes de conveniencia para casos comunes
interface DeleteConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName?: string;
  itemType?: string;
}

export function DeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
  itemName,
  itemType = 'elemento',
}: DeleteConfirmDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      variant="destructive"
      title="¿Eliminar este elemento?"
      description={
        itemName
          ? `¿Estás seguro de que deseas eliminar "${itemName}"? Esta acción no se puede deshacer.`
          : `¿Estás seguro de que deseas eliminar este ${itemType}? Esta acción no se puede deshacer.`
      }
      confirmLabel="Sí, eliminar"
      cancelLabel="Cancelar"
    />
  );
}

interface ConvertToClientDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  contactName?: string;
}

export function ConvertToClientDialog({
  open,
  onClose,
  onConfirm,
  contactName,
}: ConvertToClientDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      variant="success"
      title="¿Convertir a Cliente?"
      description={
        contactName
          ? `¿Deseas convertir "${contactName}" de Prospecto a Cliente? Esto le dará acceso al área de postventa.`
          : '¿Deseas convertir este Prospecto a Cliente? Esto le dará acceso al área de postventa.'
      }
      confirmLabel="Sí, convertir"
      cancelLabel="Cancelar"
    />
  );
}

interface MoveToWonDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  contactName?: string;
}

export function MoveToWonDialog({
  open,
  onClose,
  onConfirm,
  contactName,
}: MoveToWonDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      variant="success"
      title="¿Marcar como Ganado?"
      description={
        contactName
          ? `¿Deseas marcar "${contactName}" como Ganado? Esto cerrará la venta en el pipeline.`
          : '¿Deseas marcar esta oportunidad como Ganado? Esto cerrará la venta en el pipeline.'
      }
      confirmLabel="Sí, marcar como Ganado"
      cancelLabel="Cancelar"
    />
  );
}

interface SignOutDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function SignOutDialog({ open, onClose, onConfirm }: SignOutDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      variant="info"
      title="¿Cerrar sesión?"
      description="Cerrarás tu sesión y serás redirigido a la página de inicio."
      confirmLabel="Cerrar Sesión"
      cancelLabel="Cancelar"
    />
  );
}
