const express = require('express');
const User = require('../models/Users');
const UserMovie = require('../models/UserMovie')
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '475376767328-soku8p9dl739un1ggshsnfijo5bjcc3m.apps.googleusercontent.com';
const client = new OAuth2Client(CLIENT_ID);

const TMDB_TOKEN = process.env.TMDB_API_TOKEN;

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
        console.log(req.user);
        return next();
    } catch (googleError) {
        // 2. Se falhar, tenta como JWT local
        try {
            const localPayload = jwt.verify(token, process.env.JWT_SECRET);
            req.user = { provider: "local", ...localPayload };
            console.log(req.user);
            return next();
        } catch (jwtError) {
            console.error("Token inválido:", jwtError.message);
            return res.status(403).json({ error: "Token inválido" });
        }
    }
}


router.get('/movies', isAuthenticated, async (req, res) => {
    const url = 'https://api.themoviedb.org/3/trending/movie/day?language=en-US';

    const options = {
        method: 'GET',
        headers: {
            accept: 'application/json',
            Authorization: `Bearer ${TMDB_TOKEN}`
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

router.get('/movie/:id', async (req, res) => {
    const movieId = req.params.id;

    const url = `https://api.themoviedb.org/3/movie/${movieId}`;

    const options = {
        method: 'GET',
        headers: {
            accept: 'application/json',
            Authorization: `Bearer ${TMDB_TOKEN}`
        }
    }

    try {
        const resp = await fetch(url, options)
        const data = await resp.json();

        res.json(data);
    } catch (error) {
        console.log("Error Fetching Movies: ", error);
    }
    return res;
})

router.post('/user-movies', isAuthenticated, async (req, res) => {
    const { id, title, poster, statuses } = req.body;
    const userEmail = req.user.email;

    try {
        const userMovies = await UserMovie.findOne({ userEmail });

        if (!userMovies) {
            // usuário ainda não tem nenhum filme salvo
            const newEntry = new UserMovie({
                userEmail,
                movies: [{
                    tmdbId: id,
                    title,
                    poster,
                    statuses,
                    updatedAt: new Date()
                }]
            });

            await newEntry.save();
            return res.status(201).json({ message: "Primeiro filme salvo com sucesso" });
        }

        // Verifica se o filme já existe
        const existingMovieIndex = userMovies.movies.findIndex(m => m.tmdbId === id);

        if (existingMovieIndex >= 0) {
            // Atualiza filme existente
            userMovies.movies[existingMovieIndex] = {
                ...userMovies.movies[existingMovieIndex]._doc,
                title,
                poster,
                statuses,
                updatedAt: new Date()
            };
        } else {
            // Adiciona novo filme
            userMovies.movies.push({
                tmdbId: id,
                title,
                poster,
                statuses,
                updatedAt: new Date()
            });
        }

        await userMovies.save();
        res.status(200).json({ message: "Filme salvo/atualizado com sucesso" });

    } catch (error) {
        console.error("Erro ao salvar:", error);
        res.status(500).json({ message: "Erro interno do servidor" });
    }
    // const { id, title, poster, statuses } = req.body;
    // const userEmail = req.user.email;
    // console.log(req.body);
    // console.log(title);
    // console.log(statuses);

    // console.log("Funciona ")

    // try {
    //     const savedMovie = await UserMovie.findOneAndUpdate(
    //         { tmdbId: id, userEmail },
    //         {
    //             title,
    //             poster,
    //             statuses,
    //             updatedAt: new Date(),
    //             userEmail,
    //         },
    //         { upsert: true, new: true }
    //     );

    //     res.status(200).json({ message: "Salvo com sucesso", data: savedMovie });
    // } catch (error) {
    //     console.error("Erro ao salvar:", error);
    //     res.status(500).json({ message: "Erro interno do servidor" });
    // }
})

module.exports = router;