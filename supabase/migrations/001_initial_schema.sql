-- Tabla: fichas (Ficha Maestra)
CREATE TABLE fichas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tipo VARCHAR(20) NOT NULL DEFAULT 'prospecto' CHECK (tipo IN ('prospecto', 'cliente')),
  nombre VARCHAR(200) NOT NULL,
  ruc VARCHAR(13),
  telefono VARCHAR(20),
  email VARCHAR(255),
  relacion VARCHAR(20) DEFAULT 'lead' CHECK (relacion IN ('lead', 'cliente', 'socio', 'colega')),
  campos_personalizados JSONB DEFAULT '{}',
  etapa_ventas VARCHAR(50),
  etapa_postventa VARCHAR(50),
  creado_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  actualizado_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: columnas_kanban (Configuración columnas por usuario)
CREATE TABLE columnas_kanban (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ventas', 'postventa')),
  nombre VARCHAR(100) NOT NULL,
  posicion INTEGER NOT NULL,
  color VARCHAR(7) DEFAULT '#6366f1'
);

-- Tabla: timeline (Historial unificado)
CREATE TABLE timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_id UUID NOT NULL,
  user_id UUID NOT NULL,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('nota', 'llamada', 'email', 'reunion', 'tarea', 'sistema')),
  titulo VARCHAR(200),
  contenido TEXT,
  fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: etiquetas_ficha
CREATE TABLE etiquetas_ficha (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nombre VARCHAR(50) NOT NULL,
  color VARCHAR(7) NOT NULL
);

-- Tabla: ficha_etiquetas (Muchos a muchos)
CREATE TABLE ficha_etiquetas (
  ficha_id UUID NOT NULL,
  etiqueta_id UUID NOT NULL,
  PRIMARY KEY (ficha_id, etiqueta_id)
);

-- Índices
CREATE INDEX idx_fichas_user ON fichas(user_id);
CREATE INDEX idx_fichas_tipo ON fichas(tipo);
CREATE INDEX idx_timeline_ficha ON timeline(ficha_id);
CREATE INDEX idx_timeline_fecha ON timeline(fecha DESC);
CREATE INDEX idx_columnas_kanban_user ON columnas_kanban(user_id);
CREATE INDEX idx_columnas_kanban_tipo ON columnas_kanban(tipo);
CREATE INDEX idx_etiquetas_ficha_user ON etiquetas_ficha(user_id);

-- Actualizar actualizado_at automáticamente
CREATE OR REPLACE FUNCTION update_actualizado_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_fichas_actualizado_at
  BEFORE UPDATE ON fichas
  FOR EACH ROW
  EXECUTE FUNCTION update_actualizado_at();
