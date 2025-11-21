/**
 * Script de migración: Otorgar recompensa de perfil completo a usuarios existentes
 * 
 * Este script busca todos los usuarios que ya tienen su perfil completo
 * pero que aún no han recibido la recompensa de +200 SwappCoins.
 * 
 * Ejecutar con: node scripts/migrateProfileRewards.js
 */

const sequelize = require('../database');
const { User } = require('../models');

const migrateProfileRewards = async () => {
  try {
    console.log('🔍 Iniciando migración de recompensas de perfil completo...\n');

    // Conectar a la base de datos
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida.\n');

    // Buscar usuarios con perfil completo que no han recibido la recompensa
    const users = await User.findAll({
      where: {
        profileCompletedReward: false // Solo usuarios que no han recibido el bono
      }
    });

    console.log(`📊 Total de usuarios encontrados: ${users.length}\n`);

    let updatedCount = 0;
    let alreadyCompleteCount = 0;

    // Procesar cada usuario
    for (const user of users) {
      // Verificar si el perfil está completo
      const isProfileComplete = user.city && 
                                user.phone && 
                                user.address && 
                                user.gender && 
                                user.dateBirth;

      if (isProfileComplete) {
        // Otorgar recompensa
        user.swappcoins += 200;
        user.profileCompletedReward = true;
        await user.save();

        updatedCount++;
        console.log(`✅ Usuario ID ${user.id} (${user.username}): +200 SwappCoins otorgados. Nuevo saldo: ${user.swappcoins}`);
      } else {
        alreadyCompleteCount++;
      }
    }

    console.log('\n📈 Resumen de la migración:');
    console.log(`   - Usuarios con perfil completo actualizados: ${updatedCount}`);
    console.log(`   - Usuarios con perfil incompleto (sin cambios): ${alreadyCompleteCount}`);
    console.log(`   - Total procesado: ${users.length}\n`);

    console.log('✅ Migración completada exitosamente.\n');

    // Cerrar conexión
    await sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  }
};

// Ejecutar el script
migrateProfileRewards();
