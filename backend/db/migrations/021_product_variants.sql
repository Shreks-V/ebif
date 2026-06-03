-- Migration 021: Variantes de producto (calibres de sondas, tallas, etc.)
--
-- Añade soporte para que un producto PADRE agrupe múltiples variantes.
-- Ejemplo: Sonda (padre) → Calibre 8 / Calibre 10 / Calibre 14
--
-- Diseño:
--   ID_PRODUCTO_PADRE (FK nullable) → si tiene valor, este registro es una variante
--   NOMBRE_VARIANTE   (nullable)    → etiqueta de la variante, ej. "Calibre 8"
--
-- Los productos con ID_PRODUCTO_PADRE = NULL son standalone (sin variantes)
-- o padres que agrupan variantes.
-- Las variantes heredan NOMBRE y TIPO_PRODUCTO del padre pero tienen su
-- propio stock en EXISTENCIA_PRODUCTO.

-- 1. Añadir columnas a PRODUCTO
ALTER TABLE PRODUCTO ADD (
    ID_PRODUCTO_PADRE NUMBER(10)     DEFAULT NULL,
    NOMBRE_VARIANTE   VARCHAR2(100)  DEFAULT NULL
);

-- 2. FK de variante a producto padre
ALTER TABLE PRODUCTO
    ADD CONSTRAINT FK_PRODUCTO_PADRE
    FOREIGN KEY (ID_PRODUCTO_PADRE)
    REFERENCES PRODUCTO(ID_PRODUCTO);

-- 3. Índice para listar variantes de un padre rápidamente
CREATE INDEX IDX_PRODUCTO_PADRE ON PRODUCTO(ID_PRODUCTO_PADRE);

-- 4. Check: si tiene padre, debe tener nombre de variante
ALTER TABLE PRODUCTO
    ADD CONSTRAINT CHK_VARIANTE_NOMBRE
    CHECK (
        (ID_PRODUCTO_PADRE IS NULL)
        OR (ID_PRODUCTO_PADRE IS NOT NULL AND NOMBRE_VARIANTE IS NOT NULL)
    );
