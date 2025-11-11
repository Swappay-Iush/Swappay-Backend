const {Sequelize} = require('sequelize'); //Creamos el objeto sequelize 

const sequelize = new Sequelize( //Se crea una instancia de Sequelize con los datos de conexión a la base de datos.
    'BackendSwappay', //Nombre de la DB a la que se conecta
    'root', //Usuario
    'arredondo11', //Contraseña
    {
        host: 'localhost', //Dirección del servidor donde está la base de datos 
        dialect: 'mysql' //Dialecto con el que habla la DB.
    }
)

//Llamamos el objeto para que intente autenticarse con la información antes suministrada.
sequelize.authenticate() //Si se logra autenticar, se imprime el then, si no, el catch.
    .then(()=> {
        console.log("Conexión establecida.")
    })
    .catch(err => {
        console.error("No se completo la conexión", err)
    })

    module.exports = sequelize; //Exportamos la instancia.