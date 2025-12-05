-- =====================================================================
-- MIGRACIÓN: Corregir definición del ENUM 'tradeCompleted'
-- =====================================================================
-- Problema: El ENUM en la BD está rechazando el valor 'completado'
-- Solución: Recrear el ENUM con la definición correcta
-- =====================================================================

-- 1. Primero, cambiar el tipo de dato a VARCHAR temporalmente
ALTER TABLE `trade_agreements` 
MODIFY COLUMN `tradeCompleted` VARCHAR(20) NOT NULL DEFAULT 'pendiente';

-- 2. Cambiar de vuelta a ENUM con los valores correctos
ALTER TABLE `trade_agreements` 
MODIFY COLUMN `tradeCompleted` ENUM('pendiente', 'en_proceso', 'completado') NOT NULL DEFAULT 'pendiente';

-- 3. Verificar que la columna está bien definida
DESCRIBE `trade_agreements` `tradeCompleted`;
