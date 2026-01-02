# CONTAFLOW

CRM minimalista para profesionales de servicios (contadores, abogados, consultores).

## 🚀 Stack Tecnológico

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Estilos:** Tailwind CSS v3.4+
- **UI Components:** Shadcn/ui + Lucide React
- **Animaciones:** Framer Motion
- **Formularios:** React Hook Form + Zod
- **Drag & Drop:** @hello-pangea/dnd
- **QR:** qrcode.react
- **Backend/DB:** Supabase (Auth + PostgreSQL + Storage)
- **Deploy:** Docker → Coolify/Dokploy en VPS

## 📋 Características Principales

### Dashboard "Focus Day"
Pantalla principal con vista holística del negocio:
- **Estadísticas en tiempo real**: Total de contactos, clientes, prospectos y tareas pendientes
- **Tareas de Alta Prioridad**: Lista urgente de tareas que necesitan atención inmediata
- **Tareas para Hoy**: Tareas vencidas o que deben completarse hoy
- **Contactos Recientes**: Últimas fichas creadas
- **Actividad Reciente**: Timeline con las últimas acciones registradas
- **Acciones Rápidas**: Botones de acceso directo a funcionalidades principales

### Ficha Maestra (Corazón del sistema)
Gestión unificada de clientes y prospectos:
- **Campos fijos**: ID, tipo (Prospecto/Cliente), nombre, RUC (13 dígitos Ecuador), teléfono, email
- **Campos personalizados**: texto, fecha, número, lista, archivo (almacenados en JSONB)
- **Historial completo**: Timeline unificado tipo chat con todas las interacciones
- **Vista detallada**: Información completa del contacto con todas sus interacciones

### Dos Módulos (Hemisferios)

| Panel Ventas | Panel Post-Venta |
|--------------|------------------|
| Kanban: Por Contactar → Conversación → Propuesta → Ganado | Kanban: Onboarding → En Proceso → Por Facturar → Archivado |
| Conversión automática de prospecto a cliente | Gestión operativa de servicios |
| Seguimiento de pipeline de ventas | Gestión de entregas y facturación |

### Gestión de Tareas Avanzada
Sistema completo de gestión de tareas:
- **Tareas con subtareas**: División de grandes tareas en pasos más pequeños
- **Prioridades**: Alta, normal (con indicadores visuales)
- **Fechas de vencimiento**: Con alertas de vencimiento
- **Vista calendario**: Visualización temporal de tareas
- **Estados**: Pendiente, completada (con registro de fecha de completion)
- **Asociación a fichas**: Cada tarea puede estar vinculada a un contacto
- **Progress tracking**: Indicador de progreso basado en subtareas completadas

### Kanban Interactivo
Tableros visuales de gestión:
- **Drag & Drop**: Arrastrar y soltar tarjetas entre columnas
- **Columnas editables**: Añadir, renombrar y reordenar columnas
- **Colores personalizables**: Cada columna puede tener su color distintivo
- **Contadores de fichas**: Visualización del número de fichas por columna
- **Alertas de etapa**: Indicadores visuales en etapas clave (ej. "Ganado")
- **Animaciones suaves**: Transiciones fluidas con Framer Motion

### Timeline Unificado
Historial completo de interacciones:
- **Múltiples tipos de eventos**: Notas, llamadas, emails, reuniones, tareas, eventos de sistema
- **Cronología inversa**: Eventos más recientes primero
- **Asociación a fichas**: Cada evento está vinculado a un contacto
- **Iconos distintivos**: Emojis para identificar rápidamente el tipo de evento
- **Registro automático**: El sistema registra automáticamente acciones importantes

### Importación/Exportación de Datos
Flexibilidad en la gestión de datos:
- **Importación CSV**: Importar contactos masivamente con mapeo de columnas
- **Exportación CSV**: Exportar todas las fichas en formato CSV
- **Validación de datos**: Verificación automática durante importación
- **Mapeo flexible**: Asignar columnas del CSV a campos del sistema
- **Reportes**: Notificación del número de contactos importados exitosamente

### Búsqueda y Filtros
Localización rápida de información:
- **Búsqueda global**: Buscar por nombre, email, teléfono o RUC
- **Búsqueda instantánea**: Resultados en tiempo real mientras se escribe
- **Filtros por tipo**: Filtrar entre prospectos y clientes
- **Ordenamiento**: Ordenar por fecha de creación u otros criterios

### Comandos de Voz
Control hands-free del sistema:
- **Crear ficha**: "nueva ficha [nombre]"
- **Añadir nota**: "nota [texto]"
- **Mover en kanban**: "mover a [etapa]"
- **Convertir a cliente**: "convertir a cliente"
- **Crear tarea**: "tarea [descripción]"
- **Registrar llamada**: "llamar a [nombre]"
- **Añadir etiqueta**: "etiqueta [nombre]"

### UI/UX Avanzada
Experiencia de usuario optimizada:
- **Modo claro/oscuro**: Toggle de tema con persistencia
- **Diseño responsivo**: Optimizado para móvil, tablet y desktop
- **Animaciones fluidas**: Transiciones suaves en todas las interacciones
- **Loading skeletons**: Indicadores de carga elegantes
- **Notificaciones toast**: Feedback instantáneo de acciones
- **Navegación intuitiva**: Menú lateral y móvil adaptativo
- **Menú de búsqueda rápida**: Command palette para acceso rápido a funcionalidades

### Tipos de Relación (Badges)
Clasificación de contactos:
- 🔴 **Lead** - Prospecto inicial
- 🟢 **Cliente** - Cliente activo
- 🔵 **Socio** - Socio del negocio
- 🟣 **Colega** - Colega o colaborador

## 🛠️ Instalación y Configuración

### 1. Instalar dependencias

⏳ **IMPORTANTE:** Ejecuta el comando `npm install` en tu terminal. Este proceso puede tardar varios minutos dependiendo de tu conexión a internet.

```bash
npm install
```

### 2. Configurar Supabase

1. Crear un proyecto en [Supabase](https://supabase.com)
2. Ejecutar las migraciones SQL en `supabase/migrations/` en orden:
   - `001_initial_schema.sql`
   - `002_complete_schema.sql`
   - `003_fix_registration_with_email_confirmation.sql`
   - `004_fix_registration_safe.sql`
   - `005_add_subtasks.sql`
3. Configurar RLS (Row Level Security) policies
4. Copiar las credenciales a `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Ejecutar en desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 🏗️ Arquitectura del Proyecto

```
contaflow/
├── src/
│   ├── app/                    # App Router
│   │   ├── (auth)/            # Layout de autenticación
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (dashboard)/       # Layout protegido
│   │   │   ├── dashboard/     # Vista principal (Focus Day)
│   │   │   ├── ventas/        # Panel ventas (Kanban)
│   │   │   ├── postventa/     # Panel post-venta (Kanban)
│   │   │   ├── fichas/        # Listado de fichas
│   │   │   ├── ficha/[id]/    # Detalle de ficha
│   │   │   ├── tasks/         # Gestión de tareas
│   │   │   └── ajustes/       # Ajustes del sistema
│   │   ├── api/               # API Routes
│   │   │   ├── auth/          # Endpoints de autenticación
│   │   │   ├── fichas/        # CRUD de fichas
│   │   │   │   ├── export/    # Exportar CSV
│   │   │   │   └── import/    # Importar CSV
│   │   │   └── ...
│   │   ├── layout.tsx          # Layout raíz
│   │   ├── page.tsx            # Landing page
│   │   └── globals.css         # Estilos globales
│   ├── components/
│   │   ├── ui/                # Shadcn components
│   │   ├── kanban/            # Componentes kanban
│   │   │   ├── kanban.tsx               # Tablero principal
│   │   │   ├── kanban-with-tasks.tsx     # Kanban con tareas
│   │   │   └── column-editor.tsx        # Editor de columnas
│   │   ├── ficha/             # Componentes ficha
│   │   │   ├── ficha-card.tsx           # Tarjeta de ficha
│   │   │   └── ficha-form.tsx           # Formulario de ficha
│   │   ├── tasks/             # Componentes de tareas
│   │   │   ├── task-form.tsx             # Formulario de tarea
│   │   │   ├── task-item.tsx             # Item de tarea
│   │   │   ├── task-item-with-subtasks.tsx  # Tarea con subtareas
│   │   │   ├── subtask-item.tsx           # Item de subtarea
│   │   │   ├── subtask-list.tsx           # Lista de subtareas
│   │   │   ├── focus-day.tsx              # Vista focus day
│   │   │   └── calendar-view.tsx         # Vista calendario
│   │   ├── timeline/          # Historial unificado
│   │   │   └── timeline.tsx              # Timeline de eventos
│   │   ├── voice/             # Botón voz
│   │   │   └── voice-button.tsx           # Reconocimiento de voz
│   │   ├── import-export/      # Importación/Exportación
│   │   │   └── import-modal.tsx           # Modal de importación
│   │   └── shared/            # Componentes compartidos
│   │       ├── dashboard-nav.tsx           # Navegación dashboard
│   │       ├── mobile-nav.tsx              # Navegación móvil
│   │       ├── mode-toggle.tsx             # Toggle tema
│   │       ├── user-menu.tsx              # Menú usuario
│   │       ├── search-command.tsx          # Command palette
│   │       ├── confirm-dialog.tsx          # Diálogo de confirmación
│   │       ├── export-dialog.tsx          # Diálogo de exportación
│   │       ├── empty-state.tsx            # Estado vacío
│   │       ├── loading-skeleton.tsx       # Skeleton de carga
│   │       └── theme-provider.tsx         # Provider de tema
│   ├── hooks/
│   │   ├── use-tasks.ts        # Hook personalizado para tareas
│   │   ├── use-subtasks.ts     # Hook personalizado para subtareas
│   │   ├── use-contacts.ts     # Hook personalizado para contactos
│   │   └── use-realtime.ts     # Hook personalizado para tiempo real
│   ├── lib/
│   │   ├── supabase/          # Cliente Supabase
│   │   │   ├── client.ts                # Cliente cliente
│   │   │   └── server.ts                # Cliente servidor
│   │   ├── utils.ts            # Utilidades generales
│   │   ├── constants.ts        # Constantes del sistema
│   │   └── validations.ts     # Zod schemas
│   ├── types/                 # TypeScript types
│   │   └── index.ts                    # Definición de tipos
│   ├── stores/                # Estado global
│   │   └── ui-store.ts               # Store de UI
│   └── middleware.ts          # Middleware de autenticación
├── supabase/
│   ├── migrations/            # SQL migrations
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_complete_schema.sql
│   │   ├── 003_fix_registration_with_email_confirmation.sql
│   │   ├── 004_fix_registration_safe.sql
│   │   └── 005_add_subtasks.sql
│   └── config.toml           # Configuración Supabase
├── scripts/                 # Scripts utilitarios
│   ├── backup-supabase.ps1    # Script de backup (Windows)
│   ├── backup-supabase.sh     # Script de backup (Linux/Mac)
│   └── README.md             # Documentación de scripts
├── docker/
│   └── Dockerfile            # Configuración Docker
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── .gitignore               # Archivos ignorados por git
```

## 🐳 Deploy con Docker

### Construir imagen

```bash
docker build -t contaflow .
```

### Ejecutar contenedor

```bash
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=your_url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key \
  contaflow
```

### Variables de Entorno

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima de Supabase |
| `NODE_ENV` | Entorno (production/development) |

## 🎨 Paleta de Colores

### Light Mode
- Background: `#ffffff`
- Primary: `#6366f1` (Indigo)
- Secondary: `#f4f4f5`
- Accent: `#f4f4f5`
- Muted: `#f4f4f5`

### Dark Mode
- Background: `#09090b`
- Primary: `#818cf8`
- Secondary: `#27272a`
- Accent: `#27272a`
- Muted: `#27272a`

## 📊 Comandos de Voz

| Comando | Acción | Ejemplo |
|---------|--------|---------|
| "nueva ficha [nombre]" | Crear ficha nueva | "nueva ficha María Gómez" |
| "nota [texto]" | Añadir nota a ficha actual | "nota llamada confirmada" |
| "mover a [etapa]" | Mover ficha en kanban | "mover a propuesta" |
| "convertir a cliente" | Cambiar tipo prospecto → cliente | "convertir a cliente" |
| "tarea [descripción]" | Crear tarea en timeline | "tarea enviar contrato mañana" |
| "llamar a [nombre]" | Registrar llamada | "llamar a Juan" |
| "etiqueta [nombre]" | Añadir etiqueta | "etiqueta urgente" |

## 🔒 Seguridad

- Autenticación con Supabase Auth
- Row Level Security (RLS) en todas las tablas
- HTTPS obligatorio en producción
- Validación de RUC Ecuador (13 dígitos)
- Zod para validación de formularios
- CSRF protection con Next.js
- Middleware de autenticación en rutas protegidas

## 📚 Base de Datos

### Tablas Principales
- **fichas**: Gestión de clientes y prospectos
- **tasks**: Tareas con subtareas
- **subtasks**: Subtareas de tareas
- **timeline**: Historial de eventos
- **kanban_columns**: Configuración de columnas kanban
- **profiles**: Perfiles de usuarios

### Migraciones Disponibles
- Estructura inicial de la base de datos
- Esquema completo con todas las tablas
- Corrección de registro con confirmación de email
- Corrección segura de registro
- Agregado de sistema de subtareas

Para más detalles sobre la estructura de la base de datos, consulta [`ESTRUCTURA-BD-PRODUCCION.md`](ESTRUCTURA-BD-PRODUCCION.md).

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📞 Soporte

Para reportar bugs o solicitar features, por favor abre un issue en el repositorio.

---

**CONTAFLOW** - CRM minimalista para profesionales que valoran la simplicidad y la eficiencia.
