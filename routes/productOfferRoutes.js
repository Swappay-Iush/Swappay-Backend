const express = require('express');
const router = express.Router();
const { uploadProductOffer } = require('../middlewares/uploadMiddlewares');
const productOfferController = require('../controllers/productOfferController');

// Crear una oferta de producto (con imágenes)

router.post('/', uploadProductOffer.fields([
  { name: 'img1', maxCount: 1 },
  { name: 'img2', maxCount: 1 },
  { name: 'img3', maxCount: 1 }
]), productOfferController.createProductOffer);

// Obtener todas las ofertas
router.get('/', productOfferController.getAllProductOffers);

// Obtener ofertas por usuario
router.get('/user/:id', productOfferController.getProductOffersByUser);

// Eliminar una oferta
router.delete('/:id', productOfferController.deleteProductOffer);

// Editar una oferta de producto
router.put('/:id', uploadProductOffer.fields([
  { name: 'img1', maxCount: 1 },
  { name: 'img2', maxCount: 1 },
  { name: 'img3', maxCount: 1 }
]), productOfferController.editProductOffer);


module.exports = router;
