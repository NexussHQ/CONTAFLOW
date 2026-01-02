#!/bin/bash

# Script de Respaldo Completo de Supabase Cloud
# Uso: ./scripts/backup-supabase.sh

set -e  # Detener script si hay error

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== SCRIPT DE RESPALDO SUPABASE CLOUD ===${NC}"
echo "Fecha: $(date)"
echo ""

# Directorio de respaldos
BACKUP_DIR="backups/supabase-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}📁 Directorio de respaldo: $BACKUP_DIR${NC}"

# Verificar variables de entorno
if [ ! -f .env.local ]; then
    echo -e "${RED}❌ Error: No se encontró .env.local${NC}"
    exit 1
fi

# Obtener PROJECT REF del .env.local
PROJECT_REF=$(grep SUPABASE_URL .env.local | grep -oP 'projects/\K[^/]+')

if [ -z "$PROJECT_REF" ]; then
    echo -e "${RED}❌ Error: No se pudo obtener el PROJECT REF del .env.local${NC}"
    exit 1
fi

echo -e "${GREEN}✓ PROJECT REF detectado: $PROJECT_REF${NC}"

# Paso 1: Respaldo de archivo .env.local
echo -e "\n${YELLOW}1. Respaldo de configuraciones...${NC}"
cp .env.local "$BACKUP_DIR/.env.local.backup"
echo -e "${GREEN}✓ .env.local respaldado${NC}"

# Paso 2: Respaldo de config.toml
if [ -f supabase/config.toml ]; then
    cp supabase/config.toml "$BACKUP_DIR/config.toml.backup"
    echo -e "${GREEN}✓ config.toml respaldado${NC}"
fi

# Paso 3: Verificar enlaces con Supabase
echo -e "\n${YELLOW}2. Verificando enlace con Supabase Cloud...${NC}"

if [ ! -f .supabase/config.toml ]; then
    echo -e "${YELLOW}⚠ No se encontró enlace previo. Enlazando...${NC}"
    supabase link --project-ref "$PROJECT_REF"
else
    echo -e "${GREEN}✓ Enlace existente detectado${NC}"
fi

# Paso 4: Exportar esquema completo
echo -e "\n${YELLOW}3. Exportando esquema de base de datos...${NC}"
supabase db dump -f "$BACKUP_DIR/backup-esquema.sql" --schema-only
echo -e "${GREEN}✓ Esquema exportado a $BACKUP_DIR/backup-esquema.sql${NC}"

# Paso 5: Exportar datos completos
echo -e "\n${YELLOW}4. Exportando datos de la base de datos...${NC}"
supabase db dump -f "$BACKUP_DIR/backup-datos.sql" --data-only
echo -e "${GREEN}✓ Datos exportados a $BACKUP_DIR/backup-datos.sql${NC}"

# Paso 6: Exportar backup completo
echo -e "\n${YELLOW}5. Exportando backup completo...${NC}"
supabase db dump -f "$BACKUP_DIR/backup-completo.sql"
echo -e "${GREEN}✓ Backup completo exportado a $BACKUP_DIR/backup-completo.sql${NC}"

# Paso 7: Generar diff de migraciones
echo -e "\n${YELLOW}6. Generando diff de migraciones...${NC}"
supabase db diff -f "$BACKUP_DIR/backup-diff.sql" --use-migra || true
echo -e "${GREEN}✓ Diff generado a $BACKUP_DIR/backup-diff.sql${NC}"

# Paso 8: Listar migraciones actuales
echo -e "\n${YELLOW}7. Listando migraciones aplicadas...${NC}"
supabase migration list > "$BACKUP_DIR/migraciones-aplicadas.txt"
echo -e "${GREEN}✓ Lista de migraciones guardada${NC}"

# Paso 9: Copiar archivos de migración
echo -e "\n${YELLOW}8. Copiando archivos de migración...${NC}"
cp -r supabase/migrations "$BACKUP_DIR/"
echo -e "${GREEN}✓ Archivos de migración copiados${NC}"

# Paso 10: Generar documentación del estado
echo -e "\n${YELLOW}9. Generando documentación del estado actual...${NC}"
cat > "$BACKUP_DIR/estado-actual.md" << EOF
# Estado de la Base de Datos - $(date)

## Información del Proyecto
- **Project REF**: $PROJECT_REF
- **Fecha de Respaldo**: $(date)
- **Directorio del Proyecto**: $(pwd)

## Configuraciones
EOF

cat >> "$BACKUP_DIR/estado-actual.md" << 'EOF'
### Variables de Entorno (primeros caracteres)
```bash
SUPABASE_URL: [CONFIGURADO]
SUPABASE_ANON_KEY: [CONFIGURADO]
SUPABASE_SERVICE_ROLE_KEY: [CONFIGURADO]
```

## Tablas en la Base de Datos
(Ver backup-esquema.sql para detalles completos)

## Registros por Tabla
(Ver backup-datos.sql para datos completos)

## Migraciones Aplicadas
(Ver migraciones-aplicadas.txt para lista detallada)

## Archivos de Respaldo
1. **.env.local.backup** - Configuraciones de entorno
2. **config.toml.backup** - Configuración de Supabase
3. **backup-esquema.sql** - Estructura de la base de datos
4. **backup-datos.sql** - Datos de la base de datos
5. **backup-completo.sql** - Backup completo (esquema + datos)
6. **backup-diff.sql** - Diferencias con migraciones locales
7. **migraciones-aplicadas.txt** - Lista de migraciones
8. **migrations/** - Archivos SQL de migraciones

## Instrucciones de Restauración

### Para Supabase Self-Hosted

1. **Instalar Supabase Self-Hosted** en tu VPS
   ```bash
   docker compose up -d
   ```

2. **Actualizar .env.local** con nuevas credenciales
   ```bash
   SUPABASE_URL=http://localhost:54321
   SUPABASE_ANON_KEY=nueva_clave_anon
   SUPABASE_SERVICE_ROLE_KEY=nueva_clave_service
   ```

3. **Restaurar el esquema**
   ```bash
   psql -h localhost -U postgres -d postgres -f backup-esquema.sql
   ```

4. **Restaurar los datos**
   ```bash
   psql -h localhost -U postgres -d postgres -f backup-datos.sql
   ```

5. **Verificar migraciones**
   ```bash
   supabase migration list
   ```

6. **Aplicar cualquier migración pendiente**
   ```bash
   supabase db push
   ```

### Para Supabase Cloud (Nuevo Proyecto)

1. **Crear nuevo proyecto** en Supabase Cloud
2. **Actualizar .env.local** con nuevas credenciales
3. **Enlazar al nuevo proyecto**
   ```bash
   supabase link --project-ref NUEVO_PROJECT_REF
   ```
4. **Restaurar desde archivo SQL completo**
   ```bash
   supabase db reset --db-url "postgresql://postgres:[password]@[db].[ref].supabase.co:5432/postgres" -f backup-completo.sql
   ```

## Notas Importantes

- Los archivos de migración en `supabase/migrations/` son el código fuente de la BD
- Siempre mantén copias de estos archivos
- Verifica que el backup sea exitoso antes de eliminar la BD original
- El backup completo contiene tanto esquema como datos
EOF

echo -e "${GREEN}✓ Documentación generada${NC}"

# Paso 11: Comprimir backup (opcional)
echo -e "\n${YELLOW}10. Comprimiendo backup...${NC}"
cd backups
tar -czf "supabase-$(date +%Y%m%d-%H%M%S).tar.gz" "supabase-$(date +%Y%m%d-%H%M%S)"
cd ..

echo -e "${GREEN}✓ Backup comprimido creado${NC}"

# Paso 12: Generar resumen final
echo -e "\n${GREEN}=== RESPALDO COMPLETO EXITOSO ===${NC}"
echo ""
echo "📁 Ubicación del backup: $BACKUP_DIR"
echo "📦 Archivo comprimido: backups/supabase-$(date +%Y%m%d-%H%M%S).tar.gz"
echo ""
echo "📋 Archivos generados:"
ls -lh "$BACKUP_DIR"
echo ""
echo -e "${GREEN}✅ ¡Respaldo completado con éxito!${NC}"
echo -e "${YELLOW}⚠️  IMPORTANTE: Guarda el directorio $BACKUP_DIR en un lugar seguro antes de desconectar la BD.${NC}"
