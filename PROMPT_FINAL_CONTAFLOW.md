# 🎯 PROMPT FINAL: DESARROLLO COMPLETO DE CONTAFLOW
## IA: GLM 4.7 | Stack: Next.js 14 + TypeScript + Supabase

---

## 📋 INTRODUCCIÓN Y ENFOQUE

Desarrolla **CONTAFLOW**, un CRM web responsive minimalista para profesionales de servicios (contadores, abogados, consultores). La aplicación debe ser visualmente limpia, moderna y funcional, priorizando la usabilidad sobre características complejas.

**Regla de oro:** Ejecuta el desarrollo completo sin hacer preguntas intermedias. Sigue el plan ordenado paso a paso. Si encuentras ambigüedades, toma la decisión más pragmática y continúa.

---

## ⚙️ STACK TECNOLÓGICO (NO CAMBIAR)

```yaml
Framework: Next.js 14 (App Router)
Lenguaje: TypeScript 5+
Estilos: Tailwind CSS v3.4+
UI Components: Shadcn/ui
Iconos: Lucide React
Animaciones: Framer Motion
Formularios: React Hook Form + Zod
QR: qrcode.react
Backend: Supabase (Auth, PostgreSQL, Storage)
Deploy: Docker → VPS
```

---

## 🎨 FILOSOFÍA DE DISEÑO

**Zero-UI Philosophy:**
- Interfaz extremadamente limpia, mucho espacio blanco
- Sin menús complejos o navegación profunda
- El protagonista es el panel de acción (Kanban)
- Micro-interacciones sutiles con Framer Motion
- Paleta de colores: neutra con acentos mínimos
- Tipografía: Sans-serif moderna (Inter o similar)
- Modo oscuro/claro automático

**Principios:**
1. Minimalismo funcional
2. Acceso rápido a información crítica
3. Sin fricción en workflows comunes
4. Responsive primero (mobile-first)

---

## 📁 ESTRUCTURA DE PROYECTO

```
contaflow/
├── src/
│   ├── app/                    # App Router
│   │   ├── (auth)/            # Layout de autenticación
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (dashboard)/       # Layout protegido
│   │   │   ├── dashboard/     # Vista principal
│   │   │   ├── ventas/        # Panel ventas
│   │   │   ├── postventa/     # Panel post-venta
│   │   │   └── ficha/         # Ficha maestra
│   │   ├── layout.tsx
│   │   └── page.tsx           # Landing/Redirect
│   ├── components/
│   │   ├── ui/                # Shadcn components
│   │   ├── kanban/            # Componentes kanban
│   │   ├── ficha/             # Componentes ficha
│   │   ├── timeline/          # Historial unificado
│   │   ├── voice/             # Botón voz
│   │   └── shared/            # Componentes compartidos
│   ├── lib/
│   │   ├── supabase.ts        # Cliente Supabase
│   │   ├── utils.ts           # Utilidades
│   │   └── validations.ts     # Zod schemas
│   ├── types/                 # TypeScript types
│   ├── hooks/                 # Custom hooks
│   └── styles/                # Estilos globales
├── supabase/
│   └── migrations/            # SQL migrations
├── docker/
│   └── Dockerfile
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

---

## 🗄️ BASE DE DATOS (Supabase)

```sql
-- Tabla: fichas (Ficha Maestra)
CREATE TABLE fichas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL DEFAULT 'prospecto', -- prospecto | cliente
  nombre VARCHAR(200) NOT NULL,
  ruc VARCHAR(13), -- Ecuador: 13 dígitos
  telefono VARCHAR(20),
  email VARCHAR(255),
  relacion VARCHAR(20) DEFAULT 'lead', -- lead | cliente | socio | colega
  campos_personalizados JSONB DEFAULT '{}',
  etapa_ventas VARCHAR(50), -- ID de columna kanban ventas
  etapa_postventa VARCHAR(50), -- ID de columna kanban postventa
  creado_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  actualizado_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: columnas_kanban (Configuración columnas por usuario)
CREATE TABLE columnas_kanban (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL, -- ventas | postventa
  nombre VARCHAR(100) NOT NULL,
  posicion INTEGER NOT NULL,
  color VARCHAR(7) DEFAULT '#6366f1'
);

-- Tabla: timeline (Historial unificado)
CREATE TABLE timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_id UUID REFERENCES fichas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL, -- nota | llamada | email | reunion | tarea | sistema
  titulo VARCHAR(200),
  contenido TEXT,
  fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: etiquetas_ficha
CREATE TABLE etiquetas_ficha (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre VARCHAR(50) NOT NULL,
  color VARCHAR(7) NOT NULL
);

-- Tabla: ficha_etiquetas (Muchos a muchos)
CREATE TABLE ficha_etiquetas (
  ficha_id UUID REFERENCES fichas(id) ON DELETE CASCADE,
  etiqueta_id UUID REFERENCES etiquetas_ficha(id) ON DELETE CASCADE,
  PRIMARY KEY (ficha_id, etiqueta_id)
);

-- Índices
CREATE INDEX idx_fichas_user ON fichas(user_id);
CREATE INDEX idx_fichas_tipo ON fichas(tipo);
CREATE INDEX idx_timeline_ficha ON timeline(ficha_id);
```

---

## 🔐 AUTENTICACIÓN (Supabase Auth)

**Flujo:**
1. Registro/Inicio de sesión con email + password
2. Opcional: Google Auth
3. Sesión persistente con RLS (Row Level Security)

**Políticas RLS:**
```sql
-- Solo usuario propietario puede ver/modificar sus fichas
CREATE POLICY "Usuarios pueden ver sus fichas" ON fichas
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden modificar sus fichas" ON fichas
  FOR ALL USING (auth.uid() = user_id);

-- Similar para otras tablas...
```

---

## 🏗️ PLAN DE DESARROLLO ORDENADO

### FASE 1: CONFIGURACIÓN INICIAL (15 min)
1. Inicializar proyecto Next.js 14 con TypeScript
2. Instalar dependencias: Tailwind, Shadcn/ui, Framer Motion, React Hook Form, Zod, qrcode.react, @supabase/supabase-js
3. Configurar Shadcn/ui (agregar componentes base)
4. Configurar Supabase cliente
5. Crear estructura base de carpetas

### FASE 2: SETUP BASE DE DATOS (15 min)
1. Crear proyecto en Supabase (simulado - crea migrations)
2. Crear SQL migration con todas las tablas
3. Configurar RLS policies
4. Crear tipos TypeScript basados en esquema
5. Probar conexión localmente

### FASE 3: SISTEMA DE AUTENTICACIÓN (30 min)
1. Crear layout (auth) con página login
2. Implementar registro de usuario
3. Implementar inicio de sesión
4. Crear middleware de protección de rutas
5. Manejo de sesión y logout

### FASE 4: LAYOUT DASHBOARD Y NAVEGACIÓN (20 min)
1. Crear layout (dashboard) protegido
2. Navbar minimalista con usuario
3. Sidebar colapsable con navegación principal
4. Switch modo oscuro/claro
5. Responsive breakpoints

### FASE 5: FICHA MAESTRA - DATA LAYER (25 min)
1. Crear Supabase client functions para fichas
2. Implementar CRUD completo (Create, Read, Update, Delete)
3. Crear tipos TypeScript
4. Implementar búsqueda y filtrado básico
5. Manejo de campos personalizados JSONB

### FASE 6: FICHA MAESTRA - UI (35 min)
1. Componente lista de fichas
2. Componente detalle de ficha
3. Formulario de creación/edición con React Hook Form + Zod
4. Validación RUC Ecuador (13 dígitos)
5. Visualización de badges de relación
6. Generador de QR con qrcode.react
7. Carga de archivos (simulado)

### FASE 7: KANBAN VENTAS (30 min)
1. Componente Kanban base reutilizable
2. Drag and drop con Framer Motion
3. Columnas por defecto: Por Contactar, Conversación, Propuesta, Ganado
4. Añadir tarjeta de ficha a kanban
5. Mover ficha entre columnas
6. Editar columnas (nombre, color, posición)
7. Crear columnas personalizadas

### FASE 8: KANBAN POST-VENTA (30 min)
1. Reutilizar componente Kanban de ventas
2. Columnas por defecto: Onboarding, En Proceso, Por Facturar, Archivado
3. Integración con estado de ficha
4. Configuración independiente por usuario

### FASE 9: TIMELINE / HISTORIAL UNIFICADO (25 min)
1. Componente timeline visual (estilo chat)
2. Crear nota/actividad desde ficha
3. Filtrar por tipo (nota, llamada, email, etc.)
4. Scroll infinito o paginación básica
5. Animaciones suaves de entrada

### FASE 10: VISTA "FOCUS DAY" (20 min)
1. Página dashboard con prioridades del día
2. Fichas destacadas (cercanas a cierre, urgentes)
3. Resumen de actividad reciente
4. Accesos rápidos a acciones frecuentes
5. Estadísticas simples (tarjetas ganadas hoy, etc.)

### FASE 11: IMPORTAR/EXPORTAR (20 min)
1. Función exportar a CSV
2. Función exportar a XLSX (usar xlsx library)
3. Importar desde CSV con mapeo de columnas
4. Validar datos antes de importar
5. Progreso de importación

### FASE 12: BOTÓN DE VOZ (IA VOICE-TO-ACTION) (25 min)
1. Componente botón flotante micrófono
2. Integrar Web Speech API (Speech Recognition)
3. Convertir voz a texto
4. Parsear comandos simples: "nueva ficha Juan Pérez", "mover a propuesta", "añadir nota reunión mañana"
5. Ejecutar acciones correspondientes
6. Feedback visual de escucha/procesando

### FASE 13: ETIQUETAS Y FILTROS (20 min)
1. Sistema de etiquetas por usuario
2. Añadir/editar/eliminar etiquetas
3. Asignar etiquetas a fichas
4. Filtrar fichas por etiquetas
5. Visualización de etiquetas en tarjetas

### FASE 14: PERFIL DE USUARIO Y CONFIGURACIÓN (20 min)
1. Página de perfil
2. Editar nombre, email
3. Cambiar contraseña
4. Preferencias de tema
5. Resetear datos (con confirmación)

### FASE 15: RESPONSIVE Y POLISH (30 min)
1. Optimizar para móviles (kanban horizontal scroll)
2. Ajustar breakpoints en todos los componentes
3. Transiciones suaves entre páginas
4. Loading states en todas las operaciones
5. Error handling con toasts
6. Accesibilidad básica (ARIA, focus)

### FASE 16: DOCKER Y DEPLOY (15 min)
1. Crear Dockerfile para producción
2. Crear docker-compose para desarrollo
3. Configurar environment variables
4. Instrucciones de deployment

### FASE 17: TESTING Y BUGFIX (20 min)
1. Testear flujo completo usuario
2. Verificar todas las funcionalidades
3. Corregir bugs encontrados
4. Validaciones de formularios

### FASE 18: DOCUMENTACIÓN RÁPIDA (15 min)
1. README con setup local
2. Arquitectura del proyecto
3. API endpoints Supabase
4. Features principales

---

## 🎨 PALETA DE COLORES Y ESTILOS

```css
/* Light Mode */
--background: #ffffff;
--foreground: #09090b;
--primary: #6366f1;
--primary-foreground: #ffffff;
--secondary: #f4f4f5;
--secondary-foreground: #18181b;
--muted: #f4f4f5;
--muted-foreground: #71717a;
--border: #e4e4e7;
--success: #22c55e;
--warning: #f59e0b;
--danger: #ef4444;

/* Dark Mode */
--background: #09090b;
--foreground: #fafafa;
--primary: #818cf8;
--primary-foreground: #ffffff;
--secondary: #27272a;
--secondary-foreground: #fafafa;
--muted: #27272a;
--muted-foreground: #a1a1aa;
--border: #27272a;

/* Tipografía */
--font-sans: 'Inter', system-ui, sans-serif;
```

---

## 🧩 COMPONENTES SHADCN/UI REQUERIDOS

Instalar estos componentes con `npx shadcn-ui@latest add`:

```
button
card
input
label
select
textarea
dialog
dropdown-menu
popover
toast
switch
badge
avatar
separator
scroll-area
tabs
command
```

---

## 🔧 UTILIDADES Y HELPERS

### Validación RUC Ecuador
```typescript
export function validarRUC(ruc: string): boolean {
  // 13 dígitos numéricos
  if (!/^\d{13}$/.test(ruc)) return false;
  
  // Lógica de validación módulo 11 (implementar)
  // ...
  return true;
}
```

### Formatear fecha
```typescript
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}
```

### Generar initials
```typescript
export function getInitials(nombre: string): string {
  return nombre
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
```

---

## 📱 BREAKPOINTS RESPONSIVE

```typescript
const breakpoints = {
  sm: '640px',   // Mobile horizontal
  md: '768px',   // Tablet
  lg: '1024px',  // Desktop
  xl: '1280px',  // Large desktop
  '2xl': '1536px' // Extra large
};
```

---

## 🎬 ANIMACIONES FRAMER MOTION

```typescript
// Transición de página
export const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3 }
};

// Tarjeta kanban
export const cardVariants = {
  hover: { scale: 1.02, boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)' },
  drag: { rotate: 2, scale: 1.05 }
};

// Fade in
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.2 }
};
```

---

## 🚀 COMANDOS DE DESARROLLO

```bash
# Iniciar proyecto
npx create-next-app@latest contaflow --typescript --tailwind --app --eslint

# Instalar dependencias
npm install @supabase/supabase-js framer-motion react-hook-form zod qrcode.react xlsx
npm install @hookform/resolvers lucide-react date-fns

# Inicializar Shadcn/ui
npx shadcn-ui@latest init

# Agregar componentes
npx shadcn-ui@latest add button card input label select textarea dialog dropdown-menu popover toast switch badge avatar separator scroll-area tabs command

# Desarrollo
npm run dev

# Build
npm run build

# Docker
docker build -t contaflow .
docker run -p 3000:3000 contaflow
```

---

## 🔒 CONFIGURACIÓN SEGURIDAD

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

### .gitignore
```
.env.local
.env.*.local
node_modules
.next
dist
```

---

## 📋 CHEAT SHEET DE COMANDOS DE VOZ

| Comando | Acción | Ejemplo |
|---------|--------|---------|
| "nueva ficha [nombre]" | Crear ficha nueva | "nueva ficha María Gómez" |
| "nota [texto]" | Añadir nota a ficha actual | "nota llamada confirmada" |
| "mover a [etapa]" | Mover ficha en kanban | "mover a propuesta" |
| "convertir a cliente" | Cambiar tipo prospecto → cliente | "convertir a cliente" |
| "tarea [descripción]" | Crear tarea en timeline | "tarea enviar contrato mañana" |
| "llamar a [nombre]" | Registrar llamada | "llamar a Juan" |
| "etiqueta [nombre]" | Añadir etiqueta | "etiqueta urgente" |

---

## ✅ CRITERIOS DE FINALIZACIÓN

La aplicación está completa cuando:

1. ✅ Usuario puede registrarse e iniciar sesión
2. ✅ Puede crear, editar y eliminar fichas
3. ✅ Puede mover fichas en kanban ventas y post-venta
4. ✅ Puede ver el timeline unificado
5. ✅ Puede crear notas y actividades
6. ✅ Puede usar el botón de voz para acciones básicas
7. ✅ Puede importar/exportar fichas
8. ✅ La UI es responsive y visualmente limpia
9. ✅ Tiene modo oscuro/claro
10. ✅ El Dockerfile funciona correctamente

---

## 🚨 NOTAS IMPORTANTES

1. **No hagas preguntas intermedias.** Si algo no está claro, toma la mejor decisión pragmática.
2. **Prioriza funcionalidad sobre perfección.** Es mejor que funcione que sea perfecto.
3. **Usa componentes reutilizables.** No dupliques código.
4. **Mantén el código limpio y comentado.**
5. **Usa TypeScript estricto.** No uses `any`.
6. **Implementa error handling básico.** Usa toasts para feedback.
7. **Usa las animaciones con moderación.** Sutiles y profesionales.
8. **Sigue la estructura de carpetas propuesta.**
9. **Ejecuta en el orden del plan.** No saltes fases.
10. **Prueba cada fase antes de continuar.**

---

## 🎯 START NOW

Comienza desde la FASE 1 y ejecuta el desarrollo completo. Crea todos los archivos necesarios siguiendo el plan ordenado. No te detengas hasta que todas las fases estén completas.

**¡Desarrolla CONTAFLOW ahora!**
