import 'dotenv/config';
import express from 'express';
import passport from 'passport';
import { passsportInit } from './auth/strategys.js';
import routerAuth from './auth/route.js';
import cookieParser from 'cookie-parser';
import routerChats from './chats/route.js';
import routerMessages from './messages/route.js';
import routerAdmin from './admin/route.js';
import cors from 'cors'
import { getClientUrl } from './lib/clientUrl.js';

function getAllowedOrigins() {
    return [
        getClientUrl(),
        ...(process.env.NODE_ENV !== 'production'
            ? ['http://localhost:3000', 'http://127.0.0.1:3000']
            : []),
    ].filter((origin, index, origins) => origin && origins.indexOf(origin) === index);
}

const app = express();

if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
    app.set('trust proxy', 1);
}

app.use(cors({
    origin(origin, callback) {
        const allowed = getAllowedOrigins();
        if (!origin || allowed.includes(origin)) {
            callback(null, origin ?? true);
            return;
        }
        console.warn('[CORS] Origen rechazado:', origin, '| permitidos:', allowed);
        callback(new Error('No permitido por CORS'));
    },
    credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

passsportInit();
app.use(passport.initialize());

app.get('/health', (_req, res) => {
    res.status(200).json({ ok: true, service: 'serfi-api' });
});

app.use('/auth', routerAuth);
app.use('/chats', routerChats);
app.use('/messages', routerMessages);
app.use('/admin', routerAdmin);

export default app;