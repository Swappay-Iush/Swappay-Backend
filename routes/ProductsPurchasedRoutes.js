const express = require('express');
const router = express.Router();
const ProductsPurchasedController = require("../controllers/ProductsPurchasedController");

router.post('/', ProductsPurchasedController.createPurchase); //Ruta para crear la compra

router.get('/', ProductsPurchasedController.getAllPurchases); //Ruta para traer todas las compras.

router.delete('/:id', ProductsPurchasedController.deletePurchase); //Ruta para eliminar alguna compra.

module.exports = router;