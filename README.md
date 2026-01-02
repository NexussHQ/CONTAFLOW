# CONTAFLOW

CRM minimalista para profesionales de servicios (contadores, abogados, consultores).

## 🚀 Stack Tecnológico

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Estilos:** Tailwind CSS v3.4+
- **UI Components:** Shadcn/ui + Lucide React
- **Animaciones:** Framer Motion
- **Formularios:** React Hook Form + Zod
- **QR:** qrcode.react
- **Backend/DB:** Supabase (Auth + PostgreSQL + Storage)
- **Deploy:** Docker → Coolify/Dokploy en VPS

## 📋 Características

### Ficha Maestra (Corazón del sistema)
- Campos fijos: ID, tipo (Prospecto/Cliente), nombre, RUC (13 dígitos Ecuador), teléfono, email
- Campos personalizados: texto, fecha, número, lista, archivo (JSONB)

### Dos Módulos (Hemisferios)

| Panel Ventas | Panel Post-Venta |
|--------------|------------------|
| Kanban: Por Contactar → Conversación → Propuesta → Ganado | Kanban: Onboarding → En Proceso → Por Facturar → Archivado |
| Convertir prospecto → cliente automáticamente | Gestión operativa de servicios |

### Funcionalidades Clave
- Kanban editable (añadir/renombrar/reordenar columnas)
- Vista "Focus Day" (prioridades del día)
- Historial unificado tipo timeline/chat
- Importación/exportación CSV/XLSX
- Botón maestro de voz (IA voice-to-action)

### Tipos de Relación (Badges)
- 🔴 Lead | 🟢 Cliente | 🔵 Socio | 🟣 Colega

## 🛠️ Instalación y Configuración

### 1. Instalar dependencias

⏳ **IMPORTANTE:** Ejecuta el comando `npm install` en tu terminal. Este proceso puede tardar varios minutos dependiendo de tu conexión a internet.

```bash
npm install
```

### 2. Configurar Supabase

1. Crear un proyecto en [Supabase](https://supabase.com)
2. Ejecutar la migración SQL en `supabase/migrations/001_initial_schema.sql`
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
│   │   │   ├── dashboard/     # Vista principal
│   │   │   ├── ventas/        # Panel ventas
│   │   │   ├── postventa/     # Panel post-venta
│   │   │   └── ficha/         # Ficha maestra
│   │   └── layout.tsx
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
│   └── styles/                # Estilos globales
├── supabase/
│   └── migrations/            # SQL migrations
├── docker/
│   └── Dockerfile
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

## 🐳 Deploy con Docker

### Construir imagen

```bash
docker build -t contaflow .
```

### Ejecutar contenedor

```bash
docker run -p 3000:3000 -e NEXT_PUBLIC_SUPABASE_URL=your_url -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key contaflow
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

## 🚀 Migración a Supabase Self-Hosted

¿Planificas alojar ContaFlow en tu propio VPS con Supabase Self-Hosted? Ya tienes todo listo:

### ⚠️ URGENTE: Si vas a borrar la instancia de Supabase Cloud

**DEBES EJECUTAR EL SCRIPT DE BACKUP ANTES DE BORRAR.**

Lee **[EMERGENCIA-URGENTE-LEER-ANTES.md](EMERGENCIA-URGENTE-LEER-ANTES.md)** para entender POR QUÉ y CÓMO hacerlo.

### Recursos Disponibles

- **[PASOS RÁPIDOS - EJECUTAR AHORA](PASOS-RAPIDOS-URGENTE.md)** - Si vas a borrar Supabase Cloud, LEE ESTO PRIMERO
- **[EMERGENCIA-URGENTE-LEER-ANTES.md](EMERGENCIA-URGENTE-LEER-ANTES.md)** - Explicación detallada de POR QUÉ debes hacer el backup antes de borrar
- **[Resumen Rápido](RESUMEN-MIGRACION-RAPIDA.md)** - Guía de 5 minutos para migrar
- **[Guía de Manejo de Respaldos Locales](INSTRUCCIONES-MANEJO-RESPALDOS-LOCAL.md)** - Dónde se guardan los respaldos y cómo usarlos
- **[Guía Completa](INSTRUCCIONES-MIGRACION-SUPABASE-SELF-HOSTED.md)** - Tutorial detallado paso a paso
- **[Scripts de Backup](scripts/README.md)** - Scripts automatizados para respaldar tu BD

### Proceso Simplificado

1. **Crear respaldo:** Ejecuta [`scripts/backup-supabase.ps1`](scripts/backup-supabase.ps1) (Windows) o [`scripts/backup-supabase.sh`](scripts/backup-supabase.sh) (Linux/Mac)
2. **Instalar Supabase Self-Hosted** en tu VPS usando Docker
3. **Transferir y restaurar** el backup en la VPS
4. **Actualizar configuración** de la aplicación con nuevas credenciales
5. **Verificar** que todo funciona

### Archivos de Migración Disponibles

- ✅ Scripts automatizados de backup (PowerShell y Bash)
- ✅ Guía de emergencia para cuando vas a borrar Supabase Cloud
- ✅ Guía de manejo de respaldos locales - **Respaldos siempre disponibles en `backups/`**
- ✅ Guía completa de migración con solución de problemas
- ✅ Documentación detallada de cada paso
- ✅ Instrucciones de mantenimiento futuro

**⚠️ CRÍTICO:** Si vas a borrar la instancia de Supabase Cloud, **DEBES EJECUTAR EL SCRIPT DE BACKUP ANTES**. Lee [EMERGENCIA-URGENTE-LEER-ANTES.md](EMERGENCIA-URGENTE-LEER-ANTES.md).

**Sin perder datos nunca** - Los respaldos se guardan en la carpeta `backups/` del proyecto e incluyen esquema, datos y configuraciones completas.

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
