import 'dotenv/config';
import express from 'express';
import passport from 'passport';
import { passsportInit } from './auth/strategys.js';
import routerAuth from './auth/route.js';
import cookieParser from 'cookie-parser';
import routerChats from './chats/route.js';
import routerMessages from './messages/route.js';
import routerAdmin from './admin/route.js';
import routerProfile from './profile/route.js';
import cors from 'cors'
import { getClientUrl } from './lib/clientUrl.js';

const allowedOrigins = [getClientUrl()].filter(Boolean);

const app = express();

app.set('trust proxy', 1);

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
}))

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
app.use('/profile', routerProfile);

export default app;