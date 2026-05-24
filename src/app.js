import express from 'express';
import passport from 'passport';
import { passsportInit } from './auth/strategys.js';
import routerAuth from './auth/route.js';
import cookieParser from 'cookie-parser';
import routerChats from './chats/route.js';
import routerMessages from './messages/route.js';

const app = express();
app.use(express.json());
app.use(cookieParser());

// Inicializar estrategias de passport antes de las rutas
passsportInit();
app.use(passport.initialize());

app.use('/auth', routerAuth);
app.use('/chats', routerChats);
app.use('/messages', routerMessages);

export default app;