const bcrypt = require('bcrypt'); //Importamos bcrypt para manejar el hashing de contraseñas.
const User = require("../models/User"); //Importamos el modelo User para interactuar con la base de datos.
const jwt = require('jsonwebtoken'); //Importamos jsonwebtoken para manejar tokens JWT.
require('dotenv').config(); //Cargamos las variables de entorno desde el archivo .env

const loginUser = async (req, res) => { //Inicio de sesión del usuario.
  const { email, password } = req.body; //Obtenemos el email y la contraseña desde el cuerpo de la solicitud.
  try {
    const user = await User.findOne({ where: { email } }); //Buscamos el usuario en la base de datos por su email.
    if (!user) { //Si no encontramos el usuario, enviamos un error 401 (no autorizado).
      return res.status(401).json({ message: 'Usuario no encontrado' }); //Usuario no encontrado
    }
    const validPassword = await bcrypt.compare(password, user.password); //Comparamos la contraseña proporcionada con la almacenada en la base de datos.
    if (!validPassword) { //Si la contraseña no es válida, enviamos un error 401 (no autorizado).
      return res.status(401).json({ message: 'Credenciales incorrectas' }); //Credenciales incorrectas
    }
 
    const token = jwt.sign( // Generamos un token JWT con la información del usuario.
      { id: user.id, email: user.email, rol: user.rol }, process.env.SECRET_JWT_SWAP, { expiresIn: '1h' }); //El token expira en 1 hora.
    res
      .cookie('access_token', token, { //Almacenamos el token en una cookie HTTP-only.
        httpOnly: true, //La cookie no es accesible desde JavaScript del lado del cliente.
        secure: process.env.NODE_ENV === 'production', //La cookie solo se envía por HTTPS en producción.
        sameSite: 'strict', //La cookie solo se envía en solicitudes del mismo sitio.
        maxAge: 1000*60*60 //La cookie expira en 1 hora.
      })
      .json({ //Enviamos una respuesta con los datos del usuario (sin la contraseña).
        username: user.username, //Nombre de usuario
        rol: user.rol,
        message: 'Autenticación exitosa' //Mensaje de éxito
      });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const logoutUser = async (req,res) => { //Cierre de sesión del usuario.
    res
      .clearCookie("access_token") //Limpiamos la cookie del token.
      .json({message: "Logout Exitoso."}) //Enviamos un mensaje de éxito.
}

module.exports = { 
    loginUser,
    logoutUser
}