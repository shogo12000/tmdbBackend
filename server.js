const express = require('express'); 
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());
app.use('/api/auth', authRoutes);
 
app.use(cors({
  origin: '*', // coloque a origem do seu frontend aqui
  credentials: true // se você for usar cookies ou auth com headers
}));

const PORT = process.env.PORT || 3000;
 

mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log('✅ MongoDB conectado');
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('❌ Erro ao conectar no MongoDB:', err);
});