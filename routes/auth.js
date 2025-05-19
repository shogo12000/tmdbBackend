const express = require('express');
const User = require('../models/Users');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '475376767328-soku8p9dl739un1ggshsnfijo5bjcc3m.apps.googleusercontent.com';
const client = new OAuth2Client(CLIENT_ID);

router.use((req, res, next) => {
    //fazer a validacao do token aqui 
    console.log("PASSOU ROUTER USER")
    next()
})


 

router.get('/', (req, res) => {
    res.send('Backend funcionandoX!');
});


router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) return res.status(400).json({ message: 'Usuário já existe' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ email, password: hashedPassword });

    await newUser.save();

    res.status(201).json({ message: 'usuario criado com sucesso' });
})


router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Usuário não encontrado' });

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return res.status(400).json({ message: 'Senha incorreta' });

        const token = jwt.sign({ email: email }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.cookie('session_token', token, {
            httpOnly: true,
            secure: true, 
            sameSite: 'None',
            maxAge: 60 * 60 * 1000
        });

        res.json({ message: 'Login bem-sucedido' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erro no servidor' });
    }
});


router.post('/logout', (req, res) => {
    res.clearCookie('session_token', {
        httpOnly: true,
        secure: true,
        sameSite: 'None'
    });

    res.status(200).json({ message: 'Logout realizado com sucesso' });
});

router.post('/google', async (req, res) => {
    console.log("CHEGOU GOOGLE")

    const { credential } = req.body; // o token JWT do Google (ID Token)

    try {
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: CLIENT_ID,
        });

        const payload = ticket.getPayload(); // Dados do usuário

        const { email, name, picture } = payload;

        const token = jwt.sign(
            { email: email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Aqui você pode salvar no banco de dados, criar token JWT, etc
        // Exemplo: salvar em cookie
        res.cookie('session_token', token, {
            httpOnly: true,
            secure: true, // true em produção com HTTPS
            sameSite: 'None',
        });

        res.json({ message: 'Usuário autenticado', user: { email, name, picture } });

    } catch (error) {
        console.error(error);
        res.status(401).json({ error: 'Token inválido' });
    }
});

router.get('/me', (req, res) => {
    const token = req.cookies.session_token;

    if (!token) return res.status(401).json({ message: 'Não autenticado' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({ user: decoded }); // { email, name }
    } catch (err) {
        res.status(401).json({ message: 'Token inválido' });
    }

})


 async function isAuthenticated(req, res, next) {
    console.log("MIDDLWARE FUNCIONANDO")

  const token = req.cookies.session_token;
    console.log(token);

    if (!token) return res.status(401).json({ message: "Não autenticado" });
  try {
    // 1. Tenta verificar como token do Google
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const googlePayload = ticket.getPayload();
    req.user = { provider: "google", ...googlePayload };
    return next();
  } catch (googleError) {
    // 2. Se falhar, tenta como JWT local
    try {
      const localPayload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { provider: "local", ...localPayload };
      return next();
    } catch (jwtError) {
      console.error("Token inválido:", jwtError.message);
      return res.status(403).json({ error: "Token inválido" });
    }
  }  
}


router.get('/movies',  isAuthenticated,  async (req,   res) => {
    const url = 'https://api.themoviedb.org/3/trending/movie/day?language=en-US';
    const options = {
        method: 'GET',
        headers: {
            accept: 'application/json',
            Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI4NDk3N2M0NDhiNzZjYjMyODY5NmNhZWMyMGQyNDAxNSIsIm5iZiI6MTcwNTA5NzY1MC4xNjUsInN1YiI6IjY1YTFiOWIyOWFlNjEzMDEyZWI3NzQ5OSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.tKnWyb2UanxxqUvmFJHLIbMt_qzEaTxNR0jvvWcTFCw'
        }
    };

    try {
        const resp = await fetch(url, options)
        const data = await resp.json();
 
        res.json(data);
    } catch (error) {
        console.log("Error Fetching Movies: ", error);
    }
});



module.exports = router;