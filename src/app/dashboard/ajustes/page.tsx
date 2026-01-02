'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Moon, Sun, User, Plus, Trash2, Edit, GripVertical, Bell, Database } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { ColumnEditor } from '@/components/kanban/column-editor';
import { CUSTOM_FIELD_TYPES, KANBAN_TYPES } from '@/lib/constants';

interface KanbanColumn {
  id: string;
  nombre: string;
  color: string;
  posicion: number;
}

interface CustomField {
  id: string;
  field_key: string;
  field_label: string;
  field_type: 'text' | 'date' | 'number' | 'select';
  options: any;
  is_required: boolean;
  position: number;
}

export default function AjustesPage() {
  const [user, setUser] = useState<{ nombre?: string; email?: string } | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Estado para gestión de perfiles
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');

  // Estado para campos personalizados
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [isEditingField, setIsEditingField] = useState(false);
  const [editingFieldData, setEditingFieldData] = useState<CustomField | null>(null);

  // Estado para columnas de pipelines
  const [salesColumns, setSalesColumns] = useState<KanbanColumn[]>([]);
  const [opsColumns, setOpsColumns] = useState<KanbanColumn[]>([]);
  const [columnEditorOpen, setColumnEditorOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<KanbanColumn | null>(null);
  const [activeTab, setActiveTab] = useState('profile');

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    cargarUsuario();
    cargarDatosAjustes();

    const theme = localStorage.getItem('theme');
    setDarkMode(theme === 'dark');
  }, []);

  const cargarUsuario = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (user && !error) {
      setUser({
        nombre: user.user_metadata.nombre || user.email?.split('@')[0],
        email: user.email,
      });
      setFullName(user.user_metadata.nombre || '');
      setCompanyName(user.user_metadata.company_name || '');
    }
  };

  const cargarDatosAjustes = async () => {
    try {
      const { data: columnsData } = await supabase
        .from('columnas_kanban')
        .select('*')
        .order('posicion', { ascending: true });

      if (columnsData) {
        setSalesColumns(columnsData.filter(c => c.tipo === 'ventas'));
        setOpsColumns(columnsData.filter(c => c.tipo === 'postventa'));
      }

      const { data: fieldsData } = await supabase
        .from('custom_field_definitions')
        .select('*')
        .order('position', { ascending: true });

      if (fieldsData) {
        setCustomFields(fieldsData);
      }
    } catch (error) {
      console.error('Error al cargar ajustes:', error);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    router.push('/login');
  };

  const toggleDarkMode = () => {
    const newTheme = !darkMode ? 'dark' : 'light';
    setDarkMode(!darkMode);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark');
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      const { error } = await supabase.auth.updateUser({
        data: {
          nombre: fullName,
          company_name: companyName,
        },
      });

      if (error) throw error;

      setUser({ ...user, nombre: fullName });
      toast({
        title: 'Perfil actualizado',
        description: 'Tu información de perfil se ha actualizado correctamente.',
      });
    } catch (error) {
      toast({
        title: 'Error al actualizar perfil',
        description: 'No se pudo actualizar la información. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateCustomField = async (fieldData: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('custom_field_definitions')
        .insert({
          user_id: user.id,
          field_key: fieldData.field_key.toLowerCase().replace(/\s+/g, '_'),
          field_label: fieldData.field_label,
          field_type: fieldData.field_type,
          options: fieldData.options,
          is_required: fieldData.is_required || false,
          position: customFields.length,
        });

      if (error) throw error;

      await cargarDatosAjustes();
      toast({
        title: 'Campo creado',
        description: 'El campo personalizado se ha creado correctamente.',
      });
    } catch (error) {
      toast({
        title: 'Error al crear campo',
        description: 'No se pudo crear el campo. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateCustomField = async (fieldData: any) => {
    if (!editingFieldData) return;

    try {
      const { error } = await supabase
        .from('custom_field_definitions')
        .update({
          field_label: fieldData.field_label,
          field_type: fieldData.field_type,
          options: fieldData.options,
          is_required: fieldData.is_required || false,
        })
        .eq('id', editingFieldData.id);

      if (error) throw error;

      await cargarDatosAjustes();
      setIsEditingField(false);
      setEditingFieldData(null);
      toast({
        title: 'Campo actualizado',
        description: 'El campo personalizado se ha actualizado correctamente.',
      });
    } catch (error) {
      toast({
        title: 'Error al actualizar campo',
        description: 'No se pudo actualizar el campo. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteCustomField = async (fieldId: string) => {
    if (!confirm('¿Estás seguro de eliminar este campo?')) return;

    try {
      const { error } = await supabase
        .from('custom_field_definitions')
        .delete()
        .eq('id', fieldId);

      if (error) throw error;

      await cargarDatosAjustes();
      toast({
        title: 'Campo eliminado',
        description: 'El campo personalizado se ha eliminado correctamente.',
      });
    } catch (error) {
      toast({
        title: 'Error al eliminar campo',
        description: 'No se pudo eliminar el campo. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    }
  };

  const handleCreateColumn = async (columnData: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const tipo = activeTab === 'sales' ? 'ventas' : 'postventa';
      const { data: existingColumns } = await supabase
        .from('columnas_kanban')
        .select('*')
        .eq('user_id', user.id)
        .eq('tipo', tipo);

      const maxPos = existingColumns?.reduce((max, col) => Math.max(max, col.posicion), 0);

      const { error } = await supabase
        .from('columnas_kanban')
        .insert({
          user_id: user.id,
          tipo,
          nombre: columnData.nombre,
          color: columnData.color,
          posicion: maxPos + 1,
        });

      if (error) throw error;

      await cargarDatosAjustes();
      toast({
        title: 'Columna creada',
        description: 'La columna se ha añadido al pipeline correctamente.',
      });
    } catch (error) {
      toast({
        title: 'Error al crear columna',
        description: 'No se pudo crear la columna. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateColumn = async (columnData: any) => {
    if (!editingColumn) return;

    try {
      const { error } = await supabase
        .from('columnas_kanban')
        .update({
          nombre: columnData.nombre,
          color: columnData.color,
        })
        .eq('id', editingColumn.id);

      if (error) throw error;

      await cargarDatosAjustes();
      setEditingColumn(null);
      toast({
        title: 'Columna actualizada',
        description: 'La columna se ha actualizado correctamente.',
      });
    } catch (error) {
      toast({
        title: 'Error al actualizar columna',
        description: 'No se pudo actualizar la columna. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta columna? Esto podría afectar a tus contactos.')) return;

    try {
      const { error } = await supabase
        .from('columnas_kanban')
        .delete()
        .eq('id', columnId);

      if (error) throw error;

      await cargarDatosAjustes();
      toast({
        title: 'Columna eliminada',
        description: 'La columna se ha eliminado correctamente.',
      });
    } catch (error) {
      toast({
        title: 'Error al eliminar columna',
        description: 'No se pudo eliminar la columna. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    }
  };

  const handleEditFieldClick = (field: CustomField) => {
    setEditingFieldData(field);
    setIsEditingField(true);
  };

  const handleEditColumnClick = (column: KanbanColumn) => {
    setEditingColumn(column);
    setColumnEditorOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ajustes</h1>
        <p className="text-muted-foreground">
          Configura tu experiencia en LeadFlow
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="custom">Campos</TabsTrigger>
          <TabsTrigger value="sales">Ventas</TabsTrigger>
          <TabsTrigger value="operations">Operaciones</TabsTrigger>
        </TabsList>

        {/* Tab: Perfil */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Información del Perfil
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nombre Completo</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Tu nombre completo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName">Nombre de Empresa</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Nombre de tu empresa"
                />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveProfile} disabled={isSaving}>
                  {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Moon className="h-5 w-5" />
                Preferencias
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Label htmlFor="darkMode">Modo Oscuro</Label>
                  <p className="text-sm text-muted-foreground">
                    {darkMode ? 'Activado' : 'Desactivado'}
                  </p>
                </div>
                <button
                  id="darkMode"
                  onClick={toggleDarkMode}
                  className="relative inline-flex h-10 w-10 items-center rounded-full bg-muted transition-colors"
                >
                  {darkMode ? (
                    <Moon className="absolute left-2 h-4 w-4" />
                  ) : (
                    <Sun className="absolute right-2 h-4 w-4" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Label>Notificaciones</Label>
                  <p className="text-sm text-muted-foreground">
                    Recibir recordatorios
                  </p>
                </div>
                <div className="w-10 h-6 bg-primary rounded-full" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Cuenta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={handleLogout}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Cerrando...' : 'Cerrar Sesión'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Campos Personalizados */}
        <TabsContent value="custom" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Campos Personalizados
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {customFields.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-4">
                    No tienes campos personalizados
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Crea campos personalizados para añadir información adicional a tus contactos
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {customFields.map((field) => (
                    <div
                      key={field.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{field.field_label}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {CUSTOM_FIELD_TYPES[field.field_type]?.label}
                          </span>
                          {field.is_required && (
                            <span className="text-xs text-destructive">* Requerido</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditFieldClick(field)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCustomField(field.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Pipeline Ventas */}
        <TabsContent value="sales" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {KANBAN_TYPES.ventas.icon}
                  Pipeline de Ventas
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {salesColumns.map((column) => (
                  <div
                    key={column.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                    style={{ borderLeftColor: column.color, borderLeftWidth: 4 }}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: column.color }}
                      />
                      <div>
                        <p className="font-medium">{column.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          Posición: {column.posicion}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditColumnClick(column)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteColumn(column.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Pipeline Operaciones */}
        <TabsContent value="operations" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {KANBAN_TYPES.postventa.icon}
                  Pipeline de Operaciones
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {opsColumns.map((column) => (
                  <div
                    key={column.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                    style={{ borderLeftColor: column.color, borderLeftWidth: 4 }}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: column.color }}
                      />
                      <div>
                        <p className="font-medium">{column.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          Posición: {column.posicion}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditColumnClick(column)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteColumn(column.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Column Editor Modal */}
      <ColumnEditor
        open={columnEditorOpen}
        onClose={() => {
          setColumnEditorOpen(false);
          setEditingColumn(null);
          setActiveTab(activeTab);
        }}
        onSave={editingColumn ? handleUpdateColumn : handleCreateColumn}
        column={editingColumn}
        isEditing={!!editingColumn}
      />
    </div>
  );
}
