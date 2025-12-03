const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');

// Añadir item al carrito
router.post('/', cartController.addItem);

// Obtener carrito por idUser (query param `idUser`)
router.get('/', cartController.getCart);

router.get('/:idUser', cartController.getProductsByUser);

// Actualizar cantidad de un item (id = cartItem id)
router.put('/:id', cartController.updateItem);

// Eliminar item del carrito
router.delete('/:id', cartController.removeItem);

module.exports = router;

// Obtener productos por idUser (param)
