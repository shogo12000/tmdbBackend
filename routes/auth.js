const express = require('express');
const User = require('../models/Users');
const bcrypt = require('bcryptjs');
const router = express.Router();

router.use((req, res, next) => {
    //fazer a validacao do token aqui 
    console.log("PASSOU ROUTER USER")
    next()
})

router.get('/', (req, res) => {
    res.send('Backend funcionandoX!');
});


router.post('/register', async (req, res) => {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) return res.status(400).json({ message: 'Usuário já existe' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ email, password: hashedPassword });

    await newUser.save();

    res.status(201).json({ message: 'usuario criado com sucesso' });
})
module.exports = router;