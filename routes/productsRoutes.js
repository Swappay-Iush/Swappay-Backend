const express = require('express'); //Importamos el framework Express para crear rutas HTTP.
const router = express.Router(); //Se crea una instancia de router de Express para definir rutas específicas de autenticación.
const productsController = require("../controllers/productsController") //Importamos el controlador de productos, donde están las funciones para manejar las peticiones.
const { uploadProduct } = require('../middlewares/uploadMiddlewares'); // Importa el middleware correcto

router.post('/', uploadProduct.fields([ // Usamos .fields para múltiples campos de archivo
    { name: 'image1', maxCount: 1 }, // Máximo 1 archivo para cada campo
    { name: 'image2', maxCount: 1 }, // Máximo 1 archivo para cada campo
    { name: 'image3', maxCount: 1 } // Máximo 1 archivo para cada campo
  ]),
  productsController.createProducts // Llama al controlador después de la subida de archivos
);

router.get('/:id', productsController.getProductsByUser) //Obtener productos por ID de usuario

router.put('/:id', uploadProduct.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 }
  ]),
  productsController.updateProduct
);

router.delete('/:id', productsController.deleteProduct) //Eliminar un producto por su ID.

module.exports = router; //Exportamos el router para usarlo en la aplicación principal.