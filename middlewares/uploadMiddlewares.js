const multer = require('multer'); //Importamos Multer para manejar la subida de archivos.
const path = require('path'); //Importamos path para manejar rutas de archivos.

// Función para crear storage dinámico según la carpeta
function getStorage(folder, prefix = 'file') { // Carpeta y prefijo dinámicos
  return multer.diskStorage({ // Configuramos el almacenamiento de Multer
    destination: (req, file, cb) => { 
      cb(null, folder); // Carpeta dinámica
    },
    filename: (req, file, cb) => { // Nombre de archivo dinámico
      const ext = path.extname(file.originalname); //Obtenemos la extensión del archivo original
      const fileName = `${prefix}-${Date.now()}${ext}`; // Construimos el nombre del archivo con prefijo y timestamp
      cb(null, fileName); // Devolvemos el nombre del archivo
    }
  });
}

// Filtro para aceptar solo imágenes
const fileFilter = (req, file, cb) => { // Filtramos los tipos de archivo permitidos
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg']; // Tipos MIME permitidos
  if (allowedTypes.includes(file.mimetype)) { // Si el tipo de archivo es permitido
    cb(null, true); // Aceptamos el archivo
  } else {
    cb(new Error('Solo se permiten archivos .jpg, .jpeg o .png'), false); // Rechazamos el archivo con un error
  }
};

// Middleware para imágenes de perfil
const uploadProfile = multer({ // Configuramos Multer para imágenes de perfil
  storage: getStorage('uploads/', 'user'), // Carpeta 'uploads/' y prefijo 'user'
  fileFilter  // Usamos el filtro definido arriba
});


// Middleware para imágenes de productos
const uploadProduct = multer({ // Configuramos Multer para imágenes de productos
  storage: getStorage('uploads/products/', 'product'), // Carpeta 'uploads/products/' y prefijo 'product'
  fileFilter // Usamos el filtro definido arriba
});

// Middleware para imágenes de ofertas de productos
const uploadProductOffer = multer({ // Configuramos Multer para imágenes de ofertas de productos
  storage: getStorage('uploads/productOffer/', 'productOffer'), // Carpeta 'uploads/productOffer/' y prefijo 'productOffer'
  fileFilter // Usamos el filtro definido arriba
});

module.exports = {
  uploadProfile,
  uploadProduct,
  uploadProductOffer
};