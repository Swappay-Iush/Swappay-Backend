#!/usr/bin/env node
/**
 * Script de migración: Corregir ENUM 'tradeCompleted'
 * Uso: node scripts/fix-enum-migration.js
 * 
 * Este script ejecuta la migración SQL contra la BD para corregir
 * la definición del ENUM que está causando "Data truncated" errors
 */

const sequelize = require('../database');

async function runMigration() {
  try {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  INICIANDO MIGRACIÓN: Corregir ENUM tradeCompleted             ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // Paso 1: Cambiar a VARCHAR temporalmente
    console.log('[PASO 1] Cambiando tradeCompleted a VARCHAR temporalmente...');
    await sequelize.query(`
      ALTER TABLE \`trade_agreements\` 
      MODIFY COLUMN \`tradeCompleted\` VARCHAR(20) NOT NULL DEFAULT 'pendiente'
    `);
    console.log('✅ Columna cambiada a VARCHAR\n');

    // Paso 2: Cambiar de vuelta a ENUM con los valores correctos
    console.log('[PASO 2] Definiendo ENUM con valores correctos...');
    await sequelize.query(`
      ALTER TABLE \`trade_agreements\` 
      MODIFY COLUMN \`tradeCompleted\` ENUM('pendiente', 'en_proceso', 'completado') NOT NULL DEFAULT 'pendiente'
    `);
    console.log('✅ ENUM definido correctamente\n');

    // Paso 3: Verificar la definición
    console.log('[PASO 3] Verificando la definición de la columna...');
    const [results] = await sequelize.query(`DESCRIBE \`trade_agreements\` \`tradeCompleted\``);
    console.log('Definición actual:');
    console.table(results[0]);

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ MIGRACIÓN COMPLETADA EXITOSAMENTE                         ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n╔════════════════════════════════════════════════════════════════╗');
    console.error('║  ❌ ERROR DURANTE LA MIGRACIÓN                               ║');
    console.error('╚════════════════════════════════════════════════════════════════╝\n');
    console.error('Error:', error.message);
    console.error('\nStack trace:', error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

runMigration();
