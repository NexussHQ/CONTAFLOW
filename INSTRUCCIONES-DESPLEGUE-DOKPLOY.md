# Instrucciones de Despliegue en Dokploy

**Versión:** 1.0  
**Fecha:** 2026-01-02  
**Plataforma:** Dokploy

---

## 📋 Información de Producción

### Datos del Proyecto
- **Nombre del proyecto:** CONTAFLOW
- **Tipo:** Aplicación Next.js (Full Stack)
- **Dominio de producción:** https://contaflow.bnex.cloud/
- **Puerto interno:** 3000
- **Framework:** Next.js 14 (App Router)
- **Base de datos:** Supabase (Cloud o Self-Hosted)

---

## 🚀 Requisitos Previos

### 1. Variables de Entorno Obligatorias

Antes de desplegar, asegúrate de tener las siguientes credenciales de Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

### 2. Archivo de Configuración

El proyecto ya incluye:
- ✅ `Dockerfile` optimizado
- ✅ `next.config.js` con `output: 'standalone'`
- ✅ Imagen alpine minimalista
- ✅ Usuario no-root en contenedor

---

## 🐳 Instrucciones de Despliegue en Dokploy

### Paso 1: Preparar el Repositorio

1. Asegúrate de que los cambios están en GitHub:
```bash
git status
git push origin pruebas-oscar
```

2. Verifica que las ramas están actualizadas:
```bash
git branch -a
```

### Paso 2: Crear la Aplicación en Dokploy

1. Inicia sesión en tu panel de Dokploy
2. Crea una nueva aplicación:
   - **Nombre:** contaflow
   - **Tipo de despliegue:** Docker
   - **Repositorio:** https://github.com/NexussHQ/CONTAFLOW.git
   - **Rama:** pruebas-oscar (o main cuando estés listo para producción)

### Paso 3: Configurar la Aplicación

#### Configuración General
- **Nombre:** contaflow
- **Dominio:** contaflow.bnex.cloud
- **Puerto:** 3000
- **Tipo de aplicación:** Web App

#### Configuración de Docker
- **Dockerfile Path:** Dockerfile (automático)
- **Imagen:** contaflow (se construirá automáticamente)
- **Contexto:** / (raíz del proyecto)

#### Variables de Entorno

En Dokploy, agrega las siguientes variables de entorno:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto-real.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-real
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

**IMPORTANTE:**
- Reemplaza `https://tu-proyecto-real.supabase.co` con tu URL real de Supabase
- Reemplaza `tu-anon-key-real` con tu ANON KEY real
- Estas credenciales están en tu dashboard de Supabase → Settings → API

### Paso 4: Configuración de Dominio

1. En Dokploy, ve a la sección "Domains"
2. Agrega tu dominio:
   - **Dominio principal:** contaflow.bnex.cloud
   - **SSL:** Habilitar (certificado automático con Let's Encrypt)
3. Verifica el DNS:
   - Si usas un subdominio, asegúrate de que el registro CNAME apunta a Dokploy
   - Si es un dominio propio, actualiza los registros A o CNAME

### Paso 5: Configuración de Red

1. **Puerto expuesto:** 3000
2. **Protocolo:** HTTP/HTTPS (Dokploy maneja SSL automáticamente)
3. **Health Check:** Habilitar en `/api/health` (si implementas este endpoint)

---

## 🔒 Configuración de Seguridad en Producción

### 1. HTTPS Obligatorio

El proyecto debe forzar HTTPS. Agrega esto a `next.config.js`:

```javascript
// En next.config.js
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // ...config existente
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
        ],
      },
    ]
  },
}
```

### 2. Variables de Entorno Sensibles

**NUNCA** comitear variables de entorno sensibles en el repositorio:

```bash
# ✅ CORRECTO - Archivo .env.local (en .gitignore)
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# ❌ INCORRECTO - Archivo .env o en código
# Estos archivos NUNCA deben ir al repositorio
```

### 3. Configuración de Supabase en Producción

1. **Autenticación:**
   - Habilitar confirmación de email: ✅
   - Deshabilitar registro: ❌ (si es una aplicación cerrada)
   - Configurar dominios permitidos: contaflow.bnex.cloud

2. **Row Level Security (RLS):**
   - Verificar que todas las políticas están activas
   - Probar con usuarios diferentes
   - Revisar logs de Supabase

3. **Storage (si usas):**
   - Configurar buckets públicos/privados
   - Configurar políticas de acceso
   - Limitar tamaños de subida

---

## 🧪 Primer Despliegue (Deploy)

### Proceso Automático en Dokploy

1. Dokploy clonará el repositorio
2. Construirá la imagen Docker
3. Iniciará el contenedor
4. Configurará el dominio y SSL
5. **Tiempo estimado:** 5-10 minutos

### Verificar el Despliegue

1. Abre tu consola de logs en Dokploy
2. Busca estos mensajes:
   ```
   ✓ Application started on port 3000
   ✓ Ready
   ```
3. Visita: https://contaflow.bnex.cloud

### Solución de Problemas Comunes

#### Error: "Cannot connect to database"
**Causa:** Variables de entorno incorrectas
**Solución:** Verifica que `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` son correctos

#### Error: "Port 3000 already in use"
**Causa:** Puerto ocupado
**Solución:** Dokploy maneja esto automáticamente, pero si persiste, cambia el puerto en el Dockerfile

#### Error: "Build failed"
**Causa:** Dependencias o configuración incorrecta
**Solución:** 
```bash
# Localmente, prueba construir
docker build -t contaflow .

# Si falla, revisa los logs
# Verifica package.json
# Verifica next.config.js
```

#### Error: "SSL certificate error"
**Causa:** Certificado Let's Encrypt no generado
**Solución:**
1. Espera 5-10 minutos (Let's Encrypt necesita tiempo)
2. Verifica que el DNS apunta correctamente
3. Contacta soporte de Dokploy si persiste

---

## 📊 Monitoreo y Logs

### Logs de la Aplicación

En Dokploy, monitorea:
- **Logs de contenedor:** Errores de aplicación
- **Logs de construcción:** Errores de build
- **Métricas:** CPU, memoria, disco

### Logs de Supabase

Accede a tu dashboard de Supabase:
- **Logs de autenticación:** Intentos de login fallidos
- **Logs de base de datos:** Queries lentas o errores
- **Logs de storage:** Errores de subida de archivos

---

## 🔄 Actualizaciones Futuras

### Proceso de Actualización

1. Haz cambios en tu rama de desarrollo
2. Push a GitHub
3. En Dokploy, selecciona la rama actualizada
4. Dokploy detectará los cambios y redesplegará automáticamente
5. **Tiempo estimado:** 3-5 minutos

### Estrategia de Ramas Sugerida

```
main           ← Producción (solo versiones estables)
  ↑
pruebas-oscar  ← Desarrollo (tus cambios actuales)
  ↑
feature/*     ← Features individuales
```

---

## 🧪 Checklist Pre-Producción

Antes de desplegar a producción, verifica:

### Código
- [ ] No hay `console.log` con datos sensibles
- [ ] Variables de entorno no están en el código
- [ ] Dependencias actualizadas (`npm audit`)
- [ ] Tests pasan (si existen)
- [ ] Dockerfile probado localmente

### Configuración
- [ ] Variables de entorno configuradas en Dokploy
- [ ] Dominio verificado y DNS actualizado
- [ ] SSL configurado y funcionando
- [ ] Supabase URL y Key correctas

### Seguridad
- [ ] HTTPS forzado en next.config.js
- [ ] Headers de seguridad configurados
- [ ] Autenticación de email habilitada en Supabase
- [ ] RLS policies activas en Supabase

### Funcionalidad
- [ ] Login/Registro funciona
- [ ] Crear fichas funciona
- [ ] Kanban arrastrar y soltar funciona
- [ ] Tareas se crean y completan
- [ ] Timeline muestra eventos

---

## 📞 Soporte y Recursos

### Dokploy
- **Documentación:** https://dokploy.com/docs
- **Soporte:** support@dokploy.com
- **Status:** https://status.dokploy.com

### Supabase
- **Documentación:** https://supabase.com/docs
- **Soporte:** https://supabase.com/support
- **Dashboard:** https://app.supabase.com

### Next.js
- **Documentación:** https://nextjs.org/docs
- **Deployment:** https://nextjs.org/docs/deployment

---

## 🎉 Post-Despliegue

### Verificación Inicial

1. ✅ Visita https://contaflow.bnex.cloud
2. ✅ Intenta iniciar sesión
3. ✅ Crea una ficha nueva
4. ✅ Verifica que el kanban funciona
5. ✅ Crea una tarea
6. ✅ Revisa el timeline

### Configuración Final

1. Configura analíticos (si aplica)
2. Configura monitoreo de errores (ej. Sentry)
3. Configura backup automáticos de Supabase
4. Notifica al equipo sobre el despliegue
5. Documenta cualquier ajuste manual realizado

---

## 📝 Notas Adicionales

### Rendimiento
- La aplicación usa Next.js 14 con generación estática donde es posible
- Las imágenes se optimizan automáticamente
- El Dockerfile usa imágenes alpine para minimizar tamaño

### Escalabilidad
- Dokploy soporta escalamiento horizontal y vertical
- Supabase maneja automáticamente la base de datos
- Considera usar CDN para assets estáticos

### Backup
- Supabase tiene backups automáticos (dependiendo del plan)
- Considera configurar backups manuales adicionales
- Usa los scripts en `scripts/` para backups locales

---

**Creado por:** Kilo Code  
**Fecha:** 2026-01-02  
**Versión:** 1.0  
**Para:** Despliegue en Dokploy

**Dominio de producción:** https://contaflow.bnex.cloud/
