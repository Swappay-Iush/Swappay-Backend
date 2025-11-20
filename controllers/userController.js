const bcrypt = require('bcrypt'); //Importamos la librería bcrypt para encriptar contraseñas.
const {User, Products, ProductOffer} = require("../models") //Importamos los modelos necesarios.
const fs = require('fs'); //Importamos el módulo fs para manejar el sistema de archivos.
const path = require('path'); //Importamos path para manejar rutas de archivos.

const countries = async (req, res) => { //Obtenemos la lista de países desde una API externa.
  try {
    const response = await fetch('https://www.apicountries.com/countries'); //Hacemos una petición a la API externa.
    if (!response.ok) { //Si la respuesta no es OK, lanzamos un error.
      throw new Error(`Error: ${response.status}`); // Lanzar un error si la respuesta no es OK
    }
    const data = await response.json(); //Parseamos la respuesta como JSON.
    res.json(data); //Enviamos la lista de países como respuesta.
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los países', error: error.message });
  }
};

// POST
const createUser = async(req, res) => { //Crear un nuevo usuario.
    const { username, country, email, password, rol } = req.body; //Obtenemos los campos necesarios desde el cuerpo de la solicitud.
    const exist = await User.findOne({ where: { email } }); //Buscamos si el email ya está registrado en la base de datos.
    if (exist) { //Si el email ya está registrado, enviamos un error 400 (solicitud incorrecta).
      return res.status(400).json({ message: 'El email ya está registrado' });
    }
    const hashedPassword = await bcrypt.hash(password, 10); //Si el email no esta registrado, encriptamos la contraseña con bcrypt.

    try { 
        const newUser = await User.create({ //Creamos el nuevo usuario en la base de datos.
            username,
            country,
            email,
            password: hashedPassword, //Guardamos la contraseña encriptada
            rol,
            swappcoins: 100 //Bono de bienvenida por registrarse (+100 swappcoins)
        });

        res.status(201).json({ //Enviamos una respuesta de éxito con los datos del nuevo usuario (sin la contraseña).
            username: newUser.username,
            country: newUser.country,
            email: newUser.email,
            rol: newUser.rol,
            message: 'Usuario creado correctamente'
        });
    } catch (error) {
        res.status(400).json({error: error.message});
    }
}

//PUT
const updateUser = async (req, res) => { //Actualizar la información del usuario.
  const { id } = req.params; //Obtenemos el ID del usuario desde los parámetros de la ruta.
  const { username, country, email, city, phone, address, gender, dateBirth, rol } = req.body; //Obtenemos los campos a actualizar desde el cuerpo de la solicitud.

  try {
    // Buscar el usuario por ID
    const user = await User.findByPk(id); //Buscamos el usuario por su ID
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar si el email cambia y que no exista en otro usuario
    if (email && email !== user.email) { 
      const exist = await User.findOne({ where: { email } }); //Buscamos si el nuevo email ya está registrado en otro usuario
      if (exist) {
        return res.status(400).json({ message: 'El email ya está registrado en otro usuario' });
      }
    }

    // Verificar si el teléfono cambia y que no exista en otro usuario
    if (phone && phone !== user.phone) { 
      const exist = await User.findOne({ where: { phone } }); //Buscamos si el nuevo teléfono ya está registrado en otro usuario
      if (exist) {
        return res.status(400).json({ message: 'El teléfono ya está registrado en otro usuario' });
      }
    }

    // Actualizar solo los campos que vengan en el body
    const updatedData = {}; //Objeto para almacenar los datos a actualizar
    if (username !== undefined) updatedData.username = username;
    if (country !== undefined) updatedData.country = country;
    if (email !== undefined) updatedData.email = email;
    if (city !== undefined) updatedData.city = city;
    if (phone !== undefined) updatedData.phone = phone;
    if (address !== undefined) updatedData.address = address;
    if (gender !== undefined) updatedData.gender = gender;
    if (dateBirth !== undefined) updatedData.dateBirth = dateBirth;
    if (rol !== undefined) updatedData.rol = rol;

    // Guardar los cambios
    await user.update(updatedData); //Actualizamos el usuario con los datos proporcionados

    // Verificar si el perfil está completo y dar recompensa si es la primera vez
    const isProfileComplete = user.city && user.phone && user.address && 
                              user.gender && user.dateBirth;
    
    // Si el perfil está completo y no ha recibido el bono antes
    if (isProfileComplete && !user.profileCompletedReward) {
      user.swappcoins += 200; //Bono por completar perfil (+200 swappcoins)
      user.profileCompletedReward = true; //Marcar que ya recibió el bono
      await user.save(); //Guardar los cambios
    }

    res.status(200).json({ message: 'Información Actualizada.', user });

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


const updatePassword = async(req,res) => { //Actualizar la contraseña del usuario.
  const {id} = req.params; //Obtenemos el ID del usuario desde los parámetros de la ruta.
  const {currentPassword, newPassword} = req.body; //Obtenemos la contraseña actual y la nueva desde el cuerpo de la solicitud.

  try {
      const user = await User.findByPk(id); //Buscamos el usuario por su ID
      if (!user)  return res.status(404).json({ message: 'Usuario no encontrado' }); //Si no encontramos el usuario, enviamos un error 404 (no encontrado)

      const isMatch = await bcrypt.compare(currentPassword, user.password); //Comparamos la contraseña actual proporcionada con la almacenada en la base de datos
      if (!isMatch) return res.status(400).json({ message: 'Contraseña actual incorrecta' }); //Si no coinciden, enviamos un error 400 (solicitud incorrecta)

      if (newPassword.length < 6) { //Validamos que la nueva contraseña tenga al menos 6 caracteres
        return res.status(400).json({ error: "La nueva contraseña debe tener al menos 6 caracteres." }); //Si no cumple, enviamos un error 400 (solicitud incorrecta)
      }

      const encryptPassword = await bcrypt.hash(newPassword, 10); //Encriptamos la nueva contraseña
      user.password = encryptPassword; //Actualizamos la contraseña del usuario

      await user.update({ password: encryptPassword }); //Guardamos los cambios en la base de datos

      return res.status(200).json({ message: 'Contraseña actualizada correctamente' }); //Enviamos una respuesta de éxito
    
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// DELETE
const deleteUser = async (req, res) => { //Eliminar la cuenta del usuario.
  const { id } = req.params; //Obtenemos el ID del usuario desde los parámetros de la ruta.
  try {
    const user = await User.findByPk(id); //Buscamos el usuario por su ID.
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' }); //Si no encontramos el usuario, enviamos un error 404 (no encontrado).

    // Eliminar productos del usuario y sus imágenes
    const productos = await Products.findAll({ where: { idUser: id } }); //Buscamos todos los productos del usuario
    productos.forEach(producto => { //Recorremos cada producto
      [producto.image1, producto.image2, producto.image3].forEach(img => { //Recorremos cada imagen del producto
        if (img) {
          const fileName = path.basename(img);
          const imgPath = path.join(__dirname, '..', 'uploads', 'products', fileName);
          try {
            if (fs.existsSync(imgPath)) {
              fs.unlinkSync(imgPath);
            }
          } catch (err) {
            res.status(400).json({ err });
          }
        }
      });
    });

    await Products.destroy({ where: { idUser: id } }); //Eliminamos todos los productos del usuario de la base de datos.

    // Eliminar ofertas de productos del usuario y sus imágenes
    const ofertas = await ProductOffer.findAll({ where: { idUser: id } });
    ofertas.forEach(oferta => {
      [oferta.img1, oferta.img2, oferta.img3].forEach(img => {
        if (img) {
          const fileName = path.basename(img);
          const imgPath = path.join(__dirname, '..', 'uploads', 'productOffer', fileName);
          try {
            if (fs.existsSync(imgPath)) {
              fs.unlinkSync(imgPath);
            }
          } catch (err) {
            res.status(400).json({ err });
          }
        }
      });
    });
    await ProductOffer.destroy({ where: { idUser: id } });

    // Eliminar imagen de perfil si existe
    if (user.profileImage) { //Si el usuario tiene una imagen de perfil
      const imagePath = path.join(__dirname, '..', 'uploads', user.profileImage); //Construimos la ruta completa del archivo de imagen
      if (fs.existsSync(imagePath)) { //Si el archivo existe, lo eliminamos
        fs.unlinkSync(imagePath); // Eliminar el archivo de imagen
      }
    }

    await user.destroy(); //Eliminamos el usuario de la base de datos.

    res
      .clearCookie("access_token") //Limpiamos la cookie de autenticación
      .json({ message: 'Cuenta eliminada correctamente.' }); //Enviamos una respuesta de éxito
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Subir imagen de perfil
const uploadProfileImage = async (req, res) => { //Actualizar la imagen de perfil del usuario.
  try {
    const { id } = req.params; //Obtenemos el ID del usuario desde los parámetros de la ruta.
    const image = req.file?.filename; //Obtenemos el nombre del archivo subido por el middleware Multer.

    if (!image) {
      return res.status(400).json({ error: 'No se recibió ninguna imagen' }); //Si no se recibió ninguna imagen, enviamos un error 400 (solicitud incorrecta).
    }

    const user = await User.findByPk(id); //Buscamos el usuario por su ID.
    if (!user) { //Si no encontramos el usuario, enviamos un error 404 (no encontrado).
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    user.profileImage = image; //Actualizamos el campo profileImage del usuario con el nombre del archivo subido.
    await user.save(); //Guardamos los cambios en la base de datos.

    res.status(200).json({ message: 'Imagen actualizada con éxito', profileImage: image }); //Enviamos una respuesta de éxito con el nombre de la imagen.
  } catch (error) {
    console.error('Error al subir imagen:', error);
    res.status(500).json({ error: 'Error interno al subir imagen' });
  }
};

// Obtener balance de Swappcoins
const getSwappcoinsBalance = async (req, res) => { //Consultar el balance de Swappcoins de un usuario.
  const { id } = req.params; //Obtenemos el ID del usuario desde los parámetros de la ruta.
  
  try {
    const user = await User.findByPk(id, { //Buscamos el usuario por su ID.
      attributes: ['id', 'username', 'swappcoins', 'completedTrades', 'profileCompletedReward'] //Seleccionamos solo los campos necesarios
    });
    
    if (!user) { //Si no encontramos el usuario, enviamos un error 404 (no encontrado).
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    res.status(200).json({ //Enviamos el balance de Swappcoins en la respuesta.
      userId: user.id,
      username: user.username,
      swappcoins: user.swappcoins,
      completedTrades: user.completedTrades,
      profileCompletedReward: user.profileCompletedReward
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteProfileImage = async (req, res) => { //Eliminar la imagen de perfil del usuario.
  try {
    const { id } = req.params; //Obtenemos el ID del usuario desde los parámetros de la ruta.
    const user = await User.findByPk(id); //Buscamos el usuario por su ID.

    if (!user) { //Si no encontramos el usuario, enviamos un error 404 (no encontrado).
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Si hay imagen, eliminar el archivo físico
    if (user.profileImage) { //Si el usuario tiene una imagen de perfil
      const imagePath = path.join(__dirname, '..', 'uploads', user.profileImage); //Construimos la ruta completa del archivo de imagen
      if (fs.existsSync(imagePath)) { //Si el archivo existe, lo eliminamos
        fs.unlinkSync(imagePath); // Eliminar el archivo de imagen
      }
      user.profileImage = null; //Establecemos el campo profileImage del usuario a null
      await user.save(); //Guardamos los cambios en la base de datos. 
      return res.status(200).json({ message: 'Imagen de perfil eliminada correctamente.' }); //Enviamos una respuesta de éxito
    } else {
      return res.status(400).json({ error: 'El usuario no tiene imagen de perfil.' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar la imagen de perfil.' });
  }
};

const getAllUsers = async(req, res) => {
    try {
        const usuarios = await User.findAll(); //Buscamos todos los usuarios en la base de datos.
        res.status(200).json(usuarios); //Enviamos los usuarios en la respuesta.
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}


// Eliminar usuario por administrador
const deleteUserByAdmin = async (req, res) => {
  const { id } = req.params;
  // Validar que el usuario autenticado sea admin
  if (!req.user || req.user.rol !== 'admin') {
    return res.status(403).json({ message: 'Acceso denegado: solo administradores pueden eliminar usuarios.' });
  }
  try {
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    // Eliminar productos del usuario y sus imágenes
    const productos = await Products.findAll({ where: { idUser: id } });
    productos.forEach(producto => {
      [producto.image1, producto.image2, producto.image3].forEach(img => {
        if (img) {
          const fileName = path.basename(img);
          const imgPath = path.join(__dirname, '..', 'uploads', 'products', fileName);
          try {
            if (fs.existsSync(imgPath)) {
              fs.unlinkSync(imgPath);
            }
          } catch (err) {
            res.status(400).json({ err });
          }
        }
      });
    });
    await Products.destroy({ where: { idUser: id } });

    // Eliminar ofertas de productos del usuario y sus imágenes
    const ofertas = await ProductOffer.findAll({ where: { idUser: id } });
    ofertas.forEach(oferta => {
      [oferta.img1, oferta.img2, oferta.img3].forEach(img => {
        if (img) {
          const fileName = path.basename(img);
          const imgPath = path.join(__dirname, '..', 'uploads', 'productOffer', fileName);
          try {
            if (fs.existsSync(imgPath)) {
              fs.unlinkSync(imgPath);
            }
          } catch (err) {
            res.status(400).json({ err });
          }
        }
      });
    });
    await ProductOffer.destroy({ where: { idUser: id } });

    // Eliminar imagen de perfil si existe
    if (user.profileImage) {
      const imagePath = path.join(__dirname, '..', 'uploads', user.profileImage);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await user.destroy();

    res.json({ message: 'Usuario eliminado correctamente por administrador.' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}


// Resetear contraseña por administrador
const resetPassword = async (req, res) => {
  const { id } = req.params;
  // Validar que el usuario autenticado sea admin
  if (!req.user || req.user.rol !== 'admin') {
    return res.status(403).json({ message: 'Acceso denegado: solo administradores pueden resetear contraseñas.' });
  }
  try {
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    const newPassword = "000000";
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();
    return res.status(200).json({ message: 'Contraseña reseteada correctamente', userId: id });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}



// Migración: Otorgar recompensa de perfil completo a usuarios existentes
const migrateProfileRewards = async (req, res) => {
  try {
    console.log('🔍 Iniciando migración de recompensas de perfil completo...');

    // Buscar usuarios con perfil completo que no han recibido la recompensa
    const users = await User.findAll({
      where: {
        profileCompletedReward: false // Solo usuarios que no han recibido el bono
      }
    });

    console.log(`📊 Total de usuarios encontrados: ${users.length}`);

    let updatedCount = 0;
    let alreadyCompleteCount = 0;
    const updatedUsers = [];

    // Procesar cada usuario
    for (const user of users) {
      // Verificar si el perfil está completo
      const isProfileComplete = user.city && 
                                user.phone && 
                                user.address && 
                                user.gender && 
                                user.dateBirth;

      if (isProfileComplete) {
        const oldBalance = user.swappcoins;
        // Otorgar recompensa
        user.swappcoins += 200;
        user.profileCompletedReward = true;
        await user.save();

        updatedCount++;
        updatedUsers.push({
          id: user.id,
          username: user.username,
          oldBalance,
          newBalance: user.swappcoins
        });
        console.log(`✅ Usuario ID ${user.id} (${user.username}): +200 SwappCoins otorgados. Nuevo saldo: ${user.swappcoins}`);
      } else {
        alreadyCompleteCount++;
      }
    }

    console.log('✅ Migración completada exitosamente.');

    res.status(200).json({
      success: true,
      message: 'Migración completada exitosamente',
      summary: {
        totalProcessed: users.length,
        usersUpdated: updatedCount,
        usersIncomplete: alreadyCompleteCount
      },
      updatedUsers
    });

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error durante la migración',
      details: error.message 
    });
  }
};


module.exports = { //Exportamos las funciones para usarlas en las rutas
  createUser,
  countries,
  updateUser,
  updatePassword,
  deleteUser,
  uploadProfileImage,
  deleteProfileImage,
  getAllUsers,
  resetPassword,
  deleteUserByAdmin,
  getSwappcoinsBalance,
  migrateProfileRewards
}