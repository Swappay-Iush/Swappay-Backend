const CartItem = require('../models/CartItem');
const Products = require('../models/Products');

const addItem = async (req, res) => {
  try {
    const { idUser, idProduct, quantity = 1 } = req.body;
    if (!idUser || !idProduct) return res.status(400).json({ error: 'Faltan campos.' });

    const product = await Products.findByPk(idProduct);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado.' });

    // Ver si el item ya existe en el carrito del usuario
    let item = await CartItem.findOne({ where: { idUser, idProduct } });
    if (item) {
      item.quantity += Number(quantity);
      await item.save();
    } else {
      item = await CartItem.create({ idUser, idProduct, quantity });
    }

    res.status(201).json({ message: 'Item añadido al carrito.', item });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getCart = async (req, res) => {
  try {
    const { idUser } = req.query;
    if (!idUser) return res.status(400).json({ error: 'idUser requerido en query.' });

    const items = await CartItem.findAll({ where: { idUser } });
    res.status(200).json({ items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateItem = async (req, res) => {
  try {
    const { id } = req.params; // cart item id
    const { quantity } = req.body;
    const item = await CartItem.findByPk(id);
    if (!item) return res.status(404).json({ error: 'Item no encontrado.' });
    if (quantity <= 0) {
      await item.destroy();
      return res.status(200).json({ message: 'Item eliminado del carrito.' });
    }
    item.quantity = quantity;
    await item.save();
    res.status(200).json({ message: 'Cantidad actualizada.', item });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

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

module.exports = { addItem, getCart, updateItem, removeItem };
