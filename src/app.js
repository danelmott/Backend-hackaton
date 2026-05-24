import 'dotenv/config';
import express from 'express';
import passport from 'passport';
import { passsportInit } from './auth/strategys.js';
import routerAuth from './auth/route.js';
import cookieParser from 'cookie-parser';
import routerChats from './chats/route.js';
import routerMessages from './messages/route.js';
import cors from 'cors'


const app = express();
app.use(cors({
    origin: [
        process.env.CLIENT_URL,
        "http://localhost:3000"
    ],
    credentials: true
}))

app.use(express.json());
app.use(cookieParser());

passsportInit();
app.use(passport.initialize());

app.use('/auth', routerAuth);
app.use('/chats', routerChats);
app.use('/messages', routerMessages);

export default app;