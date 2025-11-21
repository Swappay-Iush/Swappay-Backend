const { Sequelize } = require('sequelize');

let sequelize;

if (process.env.DATABASE_URL) {
  // En producción (Railway) tomará la URL desde Variables
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'mysql',
    logging: false,
  });
} else {
  // Modo local con tu config anterior
  sequelize = new Sequelize(
    'BackendSwappay',  // DB local
    'root',            // usuario local
    'arredondo13',     // contraseña local
    {
      host: 'localhost',
      dialect: 'mysql',
      logging: false,
    }
  );
}

sequelize.authenticate()
  .then(() => console.log('Conexión establecida.'))
  .catch((err) => console.error('No se completó la conexión', err));

module.exports = sequelize;

