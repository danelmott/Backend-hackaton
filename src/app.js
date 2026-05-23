import express from 'express';
import passport from 'passport';
import { passsportInit } from './auth/strategys.js';
import routerAuth from './auth/route.js';
import cookieParser from 'cookie-parser';

export const app = express();
app.use(express.json());
app.use(cookieParser());

app.use('/auth', routerAuth);


