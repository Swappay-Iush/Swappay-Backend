const ProductsPurchased = require('../models/ProductsPurchased');
const Products = require('../models/Products');
const ProductOffer = require('../models/ProductOffer');
const User = require('../models/User');

// Controlador para registrar una compra
const createPurchase = async (req, res) => {
	try {
		const { idsProducts, totalProducts, FullPayment, FullSwapcoins, idClient } = req.body; //Recuperamos los valores del cuerpo de la solicitud.

		// Validación básica
		if (!idsProducts || !Array.isArray(idsProducts) || idsProducts.length === 0) {
			return res.status(400).json({ error: 'Se necesitan los productos.' });
		}
		if (!totalProducts || !FullPayment || !FullSwapcoins || !idClient) {
			return res.status(400).json({ error: 'Todos los campos son requeridos.' });
		}

		const generateShortUUID = () => { //Id generado para la identificación de la compra.
			return Math.random().toString(36).substring(2, 10) + Date.now().toString(36).slice(-4);
		};
		const idBuys = generateShortUUID();

		const purchase = await ProductsPurchased.create({ //Actualizamos la tabla con los valores.
			idBuys,
			idsProducts,
			totalProducts,
			FullPayment,
			FullSwapcoins,
			idClient
		});

		return res.status(201).json({ message: 'Compra registrada exitosamente.', purchase });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: 'Error al registrar la compra.' });
	}
};

// Controlador para obtener todas las compras
const getAllPurchases = async (req, res) => {
	   try {
		   const purchases = await ProductsPurchased.findAll();

		   // Para cada compra, obtener los datos del cliente y los productos comprados/intercambiados
		   const result = await Promise.all(purchases.map(async (purchase) => {
			   // Obtener datos del cliente
			   const client = await User.findByPk(purchase.idClient, {
				   attributes: ['id', 'username', 'email', 'address']
			   });

			   // Obtener toda la información de los productos comprados desde ProductOffer
			   let products = [];
			   if (Array.isArray(purchase.idsProducts)) {
				   products = await ProductOffer.findAll({
					   where: { id: purchase.idsProducts }
				   });
			   }

			   // Obtener toda la información de los productos de intercambio desde Products
			   let productsChange = [];
			   if (Array.isArray(purchase.idsProductsChange)) {
				   productsChange = await Products.findAll({
					   where: { id: purchase.idsProductsChange }
				   });
			   }

			   return {
				   idBuys: purchase.idBuys,
				   products,
				   productsChange,
				   totalProducts: purchase.totalProducts || purchase.totalProducts,
				   FullPayment: purchase.FullPayment,
				   FullSwapcoins: purchase.FullSwapcoins,
				   client
			   };
		   }));

		   res.status(200).json(result);
	   } catch (error) {
		   console.error(error);
		   res.status(500).json({ error: 'Error al obtener las compras.' });
	   }
};

// Controlador para eliminar una compra por id
const deletePurchase = async (req, res) => {
	try {
		const { id } = req.params;
		const deleted = await ProductsPurchased.destroy({ where: { idBuys: id } });
		if (deleted) {
			return res.status(200).json({ message: 'Compra eliminada correctamente.' });
		} else {
			return res.status(404).json({ error: 'Compra no encontrada.' });
		}
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: 'Error al eliminar la compra.' });
	}
};

module.exports = {
	createPurchase,
	getAllPurchases,
	deletePurchase
}