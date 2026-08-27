const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Contraseña por defecto (se puede sobreescribir con una variable de entorno en Render)
const PASSWORD_CORRECTA = process.env.UPLOAD_PASSWORD || "123456";

// Configuración de almacenamiento para los archivos subidos
const uploadPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, 'Xtranslater-latest.zip');
  }
});

const upload = multer({ storage });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ruta para subir la nueva versión de la extensión (.zip) con protección de contraseña
app.post('/api/upload', upload.single('extensionZip'), (req, res) => {
  const password = req.body.password;
  
  if (password !== PASSWORD_CORRECTA) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(401).json({ error: "Contraseña incorrecta." });
  }
  
  if (!req.file) {
    return res.status(400).json({ error: "No se adjuntó ningún archivo." });
  }

  res.json({ message: "¡Archivo Xtranslater subido con éxito!" });
});

// Ruta para la descarga pública de la extensión
app.get('/api/download', (req, res) => {
  const filePath = path.join(uploadPath, 'Xtranslater-latest.zip');
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ error: "El archivo aún no ha sido subido al servidor." });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor de Xtranslater escuchando en el puerto ${PORT}`);
});
