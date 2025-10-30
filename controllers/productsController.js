const User = require("../models/User");
const Products = require("../models/Products");
const fs = require('fs'); //Importamos el módulo fs para manejar el sistema de archivos.
const path = require('path'); //Importamos path para manejar rutas de archivos.

const createProducts = async(req, res) =>  { //Creamos un producto nuevo.
    // Obtenemos los datos del producto desde el cuerpo de la solicitud
    const { idUser, title, description, category, condition, amount, interests, priceSwapcoins, additionalNotes, ubication, deliveryMethod } = req.body;

    // Obtén las rutas de las imágenes subidas
    const image1 = req.files?.image1 ? `/uploads/products/${req.files.image1[0].filename}` : null;
    const image2 = req.files?.image2 ? `/uploads/products/${req.files.image2[0].filename}` : null;
    const image3 = req.files?.image3 ? `/uploads/products/${req.files.image3[0].filename}` : null;

    if (!title || title.length < 15)  return res.status(400).json({ error: "El título debe tener al menos 15 caracteres." }); // Validación del título
    if (!description || description.length < 30)  return res.status(400).json({ error: "La descripción debe tener al menos 30 caracteres." }); // Validación de la descripción

    try {
        await Products.create({ // Creamos un nuevo producto en la base de datos con los datos proporcionados.
            idUser, title,
            description, category, 
            condition, amount,
            interests, priceSwapcoins,
            additionalNotes, ubication,
            deliveryMethod, image1,
            image2, image3
        });

        res.status(201).json({ // Enviamos una respuesta de éxito si la creación fue exitosa.
            message: "Publicación del producto creada exitosamente."
        })
    } catch (error) {
        res.status(400).json({error: error.message});
    }
}

const getAllProductos = async (req, res) => { //Obtenemos todos los productos disponibles.
    try {
        const productos = await Products.findAll({
            include: [{
                model: User,
                as: 'user', // Debe coincidir con el alias definido en Products.associate
                attributes: ['id', 'username', 'profileImage'] // Selecciona solo los campos que necesitas
            }]
        }); //Buscamos todos los productos con la información del usuario.
        res.status(200).json(productos); //Enviamos los productos en la respuesta.
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const getProductsByUser = async (req, res) => { //Obtenemos los productos de un usuario específico.
  const { id } = req.params;  //Obtenemos el ID del usuario desde los parámetros de la ruta.

  try {
    const productos = await Products.findAll({ //Buscamos los productos del usuario en la base de datos.
      where: { idUser: id }  // Filtramos por el ID del usuario
    });

    if (!productos) { // Si no encontramos productos, enviamos un error 404 (no encontrado).
      return res.status(404).json({ error: "Producto no encontrado." });
    }

    res.status(200).json(productos); // Enviamos los productos encontrados en la respuesta.
  } catch (error) {
    console.error("Error al obtener las tutorías:", error);
    res.status(500).json({ error: error.message });
  }
};

const deleteProduct = async(req,res) => { //Eliminamos un producto por su ID.
    const {id} = req.params; //Obtenemos el ID del producto desde los parámetros de la ruta.
    try {
        const producto = await Products.findByPk(id); //Buscamos el producto por su ID.
        if(!producto) {
            return res.status(404).json({message:"Producto no encontrado."}); //Si no encontramos el producto, enviamos un error 404 (no encontrado).
        }

        // Elimina las imágenes si existen
        [producto.image1, producto.image2, producto.image3].forEach(img => { // Recorremos cada imagen del producto
            if (img) { // Si la imagen existe
                const fileName = require('path').basename(img); //Obtenemos el nombre del archivo de la imagen
                const imgPath = require('path').join(__dirname, '..', 'uploads', 'products', fileName); //Construimos la ruta completa de la imagen
                try {
                    if (require('fs').existsSync(imgPath)) { //Verificamos si el archivo existe
                        require('fs').unlinkSync(imgPath); //Eliminamos el archivo de la imagen
                    }
                } catch (err) {
                    console.log(err)
                }
            }
        });

        await producto.destroy(); //Eliminamos el producto de la base de datos.
        res.status(200).json({message:"Producto eliminado correctamente."});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = { //Exportamos las funciones para usarlas en las rutas.
    createProducts,
    getAllProductos,
    getProductsByUser,
    deleteProduct
}