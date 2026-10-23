import "dotenv/config";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import cookieParser from 'cookie-parser'
import http from 'http';

import { connectMongoDB } from "./mongodDB.js";
import {initIO} from './socket.js'  
import { connectRedisDB } from "./redisDB.js";
import { initLiveEventTimeoutWorker } from "./services.js";
import {router} from './routes.js'

const app = express();
app.use(cookieParser()); 
app.use(cors({origin:process.env.FRONTEND_SERVER_URL,credentials:true}));
app.use(express.json());

app.use('/',router)

const server = http.createServer(app);

export const io = new Server(server, { cors: { 
  origin: process.env.FRONTEND_SERVER_URL,
  methods:['GET','POST'],  
  credentials:true 
  }, 
  maxHttpBufferSize: 1e9,
});

server.listen(process.env.PORT,async function () {
  await connectMongoDB();
  await connectRedisDB();
  await initLiveEventTimeoutWorker()
  initIO();
  console.log(`Server Started Listening`)
});