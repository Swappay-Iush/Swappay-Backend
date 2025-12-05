
const CartItem = require('../models/CartItem');
const Products = require('../models/Products');
const ProductOffer = require('../models/ProductOffer');
const User = require('../models/User');

const addItem = async (req, res) => {
  try {
    const { idUser, itemType, idProductOffer, idProduct } = req.body;

    //Validaciones básicas
    if (!idUser || !itemType || (itemType === 'offer' && !idProductOffer) || (itemType === 'exchange' && !idProduct)) {
      return res.status(400).json({ error: 'Faltan campos requeridos.' });
    }

    //Validar existencia del producto u oferta según el tipo
    if (itemType === 'offer') {
      const offer = await ProductOffer.findByPk(idProductOffer);
      if (!offer) return res.status(404).json({ error: 'Oferta no encontrada.' });
    } else if (itemType === 'exchange') {
      const product = await Products.findByPk(idProduct);
      if (!product) return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    //Buscar si el item ya existe en el carrito del usuario
    let whereClause = { idUser, itemType };
    if (itemType === 'offer') {
      whereClause.idProductOffer = idProductOffer;
    } else if (itemType === 'exchange') {
      whereClause.idProduct = idProduct;
    }

    //Combrobar si el item existe en el carrito, sino existe lo crea
    let item = await CartItem.findOne({ where: whereClause });
    if (!item) {
      item = await CartItem.create({
        idUser,
        itemType,
        idProductOffer: itemType === 'offer' ? idProductOffer : null,
        idProduct: itemType === 'exchange' ? idProduct : null,
        quantity: 1
      });
    }

    let productOffer = null;
    let product = null;

    if (item.itemType === 'offer' && item.idProductOffer) {
      productOffer = await ProductOffer.findByPk(item.idProductOffer);
    } else if (item.itemType === 'exchange' && item.idProduct) {
      product = await Products.findByPk(item.idProduct);
    }

    const responseItem = { ...item.toJSON(), productOffer, product };
    res.status(201).json({ message: 'Item añadido al carrito.', item: responseItem });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//Obtener todos los items del carrito de un usuario
const getCart = async (req, res) => {
  try {
    const { idUser } = req.query;
    if (!idUser) return res.status(400).json({ error: 'idUser requerido en query.' });

    const items = await CartItem.findAll({ where: { idUser } }); //Consultar los que pertenecen al usuario
    //Mostrar información correspondiente
    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        let productOffer = null;
        let product = null;

        if (item.itemType === 'offer' && item.idProductOffer) {
          productOffer = await ProductOffer.findByPk(item.idProductOffer, {
            include: [{
              model: User,
              as: 'offerOwner',
              attributes: { exclude: ['password'] }
            }]
          });
        } else if (item.itemType === 'exchange' && item.idProduct) {
          product = await Products.findByPk(item.idProduct, {
            include: [{
              model: User,
              as: 'user',
              attributes: { exclude: ['password'] }
            }]
          });
        }
        return { ...item.toJSON(), productOffer, product };
      })
    );
    res.status(200).json({ items: enrichedItems });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//Actualizar cantidad de los items
const updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    const item = await CartItem.findByPk(id);
    if (!item) return res.status(404).json({ error: 'Item no encontrado.' });
    if (quantity <= 0) { //Si es <=0 se elimina el registro
      await item.destroy();
      return res.status(200).json({ message: 'Item eliminado del carrito.' });
    }
    item.quantity = quantity; //Se actualiza y se guarda
    await item.save();

    let productOffer = null;
    let product = null;

    if (item.itemType === 'offer' && item.idProductOffer) {
      productOffer = await ProductOffer.findByPk(item.idProductOffer);
    } else if (item.itemType === 'exchange' && item.idProduct) {
      product = await Products.findByPk(item.idProduct);
    }

    const responseItem = { ...item.toJSON(), productOffer, product };
    res.status(200).json({ message: 'Cantidad actualizada.', item:responseItem });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtener productos según el ID del usuario
const getProductsByUser = async (req, res) => {
  try {
    const { idUser } = req.params;
    if (!idUser) return res.status(400).json({ error: 'idUser requerido en parámetros.' });

    // Buscar productos donde el idUser coincida, incluyendo información del usuario
    const products = await Products.findAll({ 
      where: { idUser },
      include: [{
        model: User,
        as: 'user',
        attributes: { exclude: ['password'] } // Excluir la contraseña por seguridad
      }]
    });

    // Buscar items del carrito del usuario
    const cartItems = await CartItem.findAll({ where: { idUser } });

    // Validar y eliminar items del carrito según condición de la oferta
    for (const item of cartItems) {
      if (item.itemType === 'offer' && item.idProductOffer) {
        const offer = await ProductOffer.findByPk(item.idProductOffer);
        if (offer && (offer.amount === 0 || offer.availability === false)) {
          await item.destroy();
        }
      }
    }

    res.status(200).json({ products });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//Eliminar item especifico por id
const removeItem = async (req, res) => {
  try {
    const { id } = req.params; // cart item id
    const item = await CartItem.findByPk(id);
    if (!item) return res.status(404).json({ error: 'Item no encontrado.' });
    await item.destroy();
    res.status(200).json({ message: 'Item eliminado.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { addItem, getCart, updateItem, removeItem, getProductsByUser };
