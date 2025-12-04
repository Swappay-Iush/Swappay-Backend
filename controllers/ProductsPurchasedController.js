const ProductsPurchased = require('../models/ProductsPurchased');
const Products = require('../models/Products');
const ProductOffer = require('../models/ProductOffer');
const User = require('../models/User');

// Controlador para registrar una compra
const createPurchase = async (req, res) => {
	try {
		const { idsProducts, idsProductsChange, totalProducts, FullPayment, FullSwapcoins, idClient } = req.body; // Ahora también recibimos idsProductsChange

		// Validación básica
		if (
			(!idsProducts || !Array.isArray(idsProducts) || idsProducts.length === 0)
			&& (!idsProductsChange || !Array.isArray(idsProductsChange) || idsProductsChange.length === 0)
		) {
			return res.status(400).json({ error: 'Se necesitan los productos u objetos de intercambio.' });
		}
		if (
			totalProducts === undefined || totalProducts === null ||
			FullPayment === undefined || FullPayment === null ||
			FullSwapcoins === undefined || FullSwapcoins === null ||
			!idClient
		) {
			return res.status(400).json({ error: 'Todos los campos son requeridos.' });
		}

		const generateShortUUID = () => { //Id generado para la identificación de la compra.
			return Math.random().toString(36).substring(2, 10) + Date.now().toString(36).slice(-4);
		};
		const idBuys = generateShortUUID();

		// Descontar los swapcoins al usuario
		const user = await User.findByPk(idClient);
		if (!user) {
			return res.status(404).json({ error: 'Usuario no encontrado.' });
		}
		if (user.swappcoins < FullSwapcoins) {
			return res.status(400).json({ error: 'Saldo insuficiente de swappcoins.' });
		}
		user.swappcoins -= FullSwapcoins;
		await user.save();

		 // Descontar el stock de productos según el carrito del usuario
		const CartItem = require('../models/CartItem');
		// Obtener los items del carrito del usuario
		const cartItems = await CartItem.findAll({ where: { idUser: idClient } });

		// Preparar los arrays con id y quantity
		const productsWithQuantity = [];
		const productsChangeWithQuantity = [];

		for (const item of cartItems) {
			if (item.itemType === 'offer' && item.idProductOffer) {
				// Agregar al array de productos de oferta con su cantidad
				productsWithQuantity.push({
					id: item.idProductOffer,
					quantity: item.quantity
				});
				
				// Descontar en ProductOffer
				const productOffer = await ProductOffer.findByPk(item.idProductOffer);
				if (productOffer) {
					productOffer.amount = Math.max(0, productOffer.amount - item.quantity);
					if (productOffer.amount === 0) {
						productOffer.availability = false;
					}
					await productOffer.save();
				}
			} else if (item.itemType === 'exchange' && item.idProduct) {
				// Agregar al array de productos de intercambio con su cantidad
				productsChangeWithQuantity.push({
					id: item.idProduct,
					quantity: item.quantity
				});
				
				// Descontar en Products
				const product = await Products.findByPk(item.idProduct);
				if (product) {
					product.amount = Math.max(0, product.amount - item.quantity);
					if (product.amount === 0) {
						product.availability = false;
					}
					await product.save();
				}
			}
		}

		const purchase = await ProductsPurchased.create({ //Actualizamos la tabla con los valores.
			idBuys,
			idsProducts: productsWithQuantity,
			idsProductsChange: productsChangeWithQuantity,
			totalProducts,
			FullPayment,
			FullSwapcoins,
			idClient
		});

		return res.status(201).json({ message: 'Compra registrada exitosamente.', purchase, swappcoinsRestantes: user.swappcoins });
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
			   if (Array.isArray(purchase.idsProducts) && purchase.idsProducts.length > 0) {
				   // Extraer solo los IDs del formato { id, quantity }
				   const productIds = purchase.idsProducts.map(item => item.id || item);
				   const productData = await ProductOffer.findAll({
					   where: { id: productIds }
				   });
				   
				   // Agregar la cantidad a cada producto
				   products = productData.map(product => {
					   const purchaseItem = purchase.idsProducts.find(item => 
						   (item.id || item) === product.id
					   );
					   return {
						   ...product.toJSON(),
						   purchasedQuantity: purchaseItem?.quantity || 1
					   };
				   });
			   }

			   // Obtener toda la información de los productos de intercambio desde Products
			   let productsChange = [];
			   if (Array.isArray(purchase.idsProductsChange) && purchase.idsProductsChange.length > 0) {
				   // Extraer solo los IDs del formato { id, quantity }
				   const productChangeIds = purchase.idsProductsChange.map(item => item.id || item);
				   const productChangeData = await Products.findAll({
					   where: { id: productChangeIds }
				   });
				   
				   // Agregar la cantidad a cada producto
				   productsChange = productChangeData.map(product => {
					   const purchaseItem = purchase.idsProductsChange.find(item => 
						   (item.id || item) === product.id
					   );
					   return {
						   ...product.toJSON(),
						   purchasedQuantity: purchaseItem?.quantity || 1
					   };
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