const ProductOffer = require("../models/ProductOffer");
const fs = require('fs');
const path = require('path');
const User = require('../models/User');

const createProductOffer = async (req, res) => {
  const {
    idUser, title, description, specs, category, amount,
    priceOriginal, discount, availability
  } = req.body;
  const img1 = req.files?.img1 ? `/uploads/productOffer/${req.files.img1[0].filename}` : null;
  const img2 = req.files?.img2 ? `/uploads/productOffer/${req.files.img2[0].filename}` : null;
  const img3 = req.files?.img3 ? `/uploads/productOffer/${req.files.img3[0].filename}` : null;

  if (!img1) return res.status(400).json({ error: "La imagen principal (img1) es obligatoria." });
  if (!title || title.length < 5) return res.status(400).json({ error: "El título debe tener al menos 5 caracteres." });
  if (!description || description.length < 10) return res.status(400).json({ error: "La descripción debe tener al menos 10 caracteres." });
  if (isNaN(amount) || Number(amount) < 0) return res.status(400).json({ error: "La cantidad debe ser un número igual o mayor a 0." });

  try {
    // Calcular el precio con descuento
    const priceDiscount = priceOriginal - (priceOriginal * (discount / 100));
    // Calcular priceSwapcoins según priceOriginal
    let priceSwapcoins = 0;
    if (priceDiscount > 5000) {
      priceSwapcoins = 800;
    } 
      else if (priceDiscount  > 1000) {
      priceSwapcoins = 1200;
    } else if (priceDiscount > 500 && priceDiscount < 1000) {
      priceSwapcoins = 900;
    } else if (priceDiscount > 300 && priceDiscount < 500) {
      priceSwapcoins = 600;
    } else if (priceDiscount > 0 && priceDiscount < 300) {
      priceSwapcoins = 300;
    }

    const availabilityBool = Number(amount) > 0;
    await ProductOffer.create({
      idUser, title, description, specs, category,
      amount: Number(amount),
      priceOriginal, discount, priceDiscount, priceSwapcoins,
      availability: availabilityBool,
      img1, img2, img3
    });
    res.status(201).json({ message: "Oferta de producto creada exitosamente." });

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


const getAllProductOffers = async (req, res) => {
  try {
    // Buscar todas las ofertas incluyendo el usuario con el alias correcto
    const offers = await ProductOffer.findAll({
      include: [{
        model: User,
        attributes: ['id', 'username'],
        as: 'offerOwner', 
        required: false
      }]
    });
    // Solo mostrar los campos seleccionados
    const result = offers.map(offer => ({
      id: offer.id,
      title: offer.title,
      description: offer.description,
      specs: offer.specs,
      category: offer.category,
      amount: offer.amount,
      priceOriginal: offer.priceOriginal,
      discount: offer.discount,
      priceDiscount: offer.priceDiscount,
      priceSwapcoins: offer.priceSwapcoins,
      availability: offer.availability,
      img1: offer.img1,
      img2: offer.img2,
      img3: offer.img3,
      user: offer.offerOwner ? { id: offer.offerOwner.id, name: offer.offerOwner.username } : null
    }));
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getProductOffersByUser = async (req, res) => {
  const { id } = req.params;
  try {
    const offers = await ProductOffer.findAll({ where: { idUser: id } });
    if (!offers) return res.status(404).json({ error: "No se encontraron ofertas." });
    // Solo mostrar los campos seleccionados
    const result = offers.map(offer => ({
      id: offer.id,
      title: offer.title,
      description: offer.description,
      specs: offer.specs,
      category: offer.category,
      amount: offer.amount,
      priceOriginal: offer.priceOriginal,
      discount: offer.discount,
      priceDiscount: offer.priceDiscount,
      priceSwapcoins: offer.priceSwapcoins,
      availability: offer.availability,
      img1: offer.img1,
      img2: offer.img2,
      img3: offer.img3
    }));
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteProductOffer = async (req, res) => {
  const { id } = req.params;
  try {
    const offer = await ProductOffer.findByPk(id);
    if (!offer) return res.status(404).json({ message: "Oferta no encontrada." });
    // Elimina las imágenes si existen
      [offer.img1, offer.img2, offer.img3].forEach(img => {
        if (img) {
          const fileName = path.basename(img);
          const imgPath = path.join(__dirname, '..', 'uploads', 'productOffer', fileName);
          try {
            if (fs.existsSync(imgPath)) {
              fs.unlinkSync(imgPath);
            }
          } catch (err) {
            console.log(err);
          }
        }
      });
    await offer.destroy();
    res.status(200).json({ message: "Oferta eliminada correctamente." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Editar oferta de producto
async function editProductOffer(req, res) {
  const { id } = req.params;
  const {
    title, description, specs, category, amount,
    priceOriginal, discount, availability
  } = req.body;

  try {
    const offer = await ProductOffer.findByPk(id);
    if (!offer) return res.status(404).json({ error: "Oferta no encontrada." });

    // Imágenes
    let img1 = offer.img1;
    let img2 = offer.img2;
    let img3 = offer.img3;

    // Si se envían nuevas imágenes, eliminar las viejas y actualizar
    if (req.files?.img1) {
      if (img1) {
        const fileName = path.basename(img1);
        const imgPath = path.join(__dirname, '..', 'uploads', 'productOffer', fileName);
        if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
      }
      img1 = `/uploads/productOffer/${req.files.img1[0].filename}`;
    }
    if (req.files?.img2) {
      if (img2) {
        const fileName = path.basename(img2);
        const imgPath = path.join(__dirname, '..', 'uploads', 'productOffer', fileName);
        if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
      }
      img2 = `/uploads/productOffer/${req.files.img2[0].filename}`;
    }
    if (req.files?.img3) {
      if (img3) {
        const fileName = path.basename(img3);
        const imgPath = path.join(__dirname, '..', 'uploads', 'productOffer', fileName);
        if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
      }
      img3 = `/uploads/productOffer/${req.files.img3[0].filename}`;
    }

    // Calcular el precio con descuento
    const priceDiscount = priceOriginal - (priceOriginal * (discount / 100));
    // Calcular priceSwapcoins según priceOriginal
    let priceSwapcoins = 0;
    if (priceDiscount > 5000) {
      priceSwapcoins = 800;
    } else if (priceDiscount > 1000) {
      priceSwapcoins = 1200;
    } else if (priceDiscount > 500 && priceDiscount < 1000) {
      priceSwapcoins = 900;
    } else if (priceDiscount > 300 && priceDiscount < 500) {
      priceSwapcoins = 600;
    } else if (priceDiscount > 0 && priceDiscount < 300) {
      priceSwapcoins = 300;
    }

    const availabilityBool = Number(amount) > 0;

    await offer.update({
      title: title ?? offer.title,
      description: description ?? offer.description,
      specs: specs ?? offer.specs,
      category: category ?? offer.category,
      amount: amount !== undefined ? Number(amount) : offer.amount,
      priceOriginal: priceOriginal ?? offer.priceOriginal,
      discount: discount ?? offer.discount,
      priceDiscount,
      priceSwapcoins,
      availability: availabilityBool,
      img1,
      img2,
      img3
    });

    res.status(200).json({ message: "Oferta editada exitosamente.", offer });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

module.exports = {
  createProductOffer,
  getAllProductOffers,
  getProductOffersByUser,
  deleteProductOffer,
  editProductOffer
};

