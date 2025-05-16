//https://dashboard.render.com/web/srv-d0i5otmmcj7s739nsj10/events
const express = require('express'); 
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth'); 
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cookieParser());
 
app.use(cors({
  origin: 'http://localhost:5173', // coloque a origem do seu frontend aqui
  credentials: true // se  for usar cookies ou auth com headers
}));
 
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 4000;
  
mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log('✅ MongoDB conectado');
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('❌ Erro ao conectar no MongoDB:', err);
});