import cookieParser from "cookie";
import jwt from "jsonwebtoken";
import fs from 'fs'

import { createFFmpeg, stopFFmpeg } from "./ffmpeg.js";
import { io } from "./server.js";
import {
  startEvent,
  pauseEvent,
  resumeEvent,
  endEvent
} from "./mongodDB.js";
import { redisDB } from "./redisDB.js";
import {Event} from './models/event.js'
import { addLiveEventTimeout, removeLiveEventTimeout } from "./queue.js";

export const liveEvents = {};
 
export function initIO() {

io.use(function (socket, next) {
  try {
    const { handshake: {headers: {cookie} } } = socket
    const {authenticationToken} = cookieParser.parse(cookie);

    if (!authenticationToken) {
      return next(new Error("No Authentication"));
    }

    const {userId} = jwt.verify(authenticationToken, process.env.JWT_SECRET);

    socket.ownerId = userId

    next();
  } catch (_) {
   return next(new Error("No Authentication"));
  }
});

  io.on("connection", function (socket) {
    
    const { id:socketId, ownerId } =socket  

    console.log('Socket Connection')

    socket.on("start", async function  ({ eventId, inputFormat }) {
      try {
        if (!eventId) {
          return io.to(socketId).emit("error", "Event Id Required");
        }

        if (!["mp4", "webm"].includes(inputFormat)) {
            return io.to(socketId).emit("error", "Invalid Input Format");
        }

        const isEventOwner = await Event.findOne({ _id:eventId, owner:ownerId });

        if (!isEventOwner) {
           return io.to(socketId).emit("error", "No Authorization");
        }

        fs.mkdirSync(`playlist`, { recursive: true });
        fs.mkdirSync(`segment/${eventId}`, { recursive: true });
        const ffmpegProcess = createFFmpeg({ eventId, inputFormat });
        liveEvents[ownerId+eventId] = {ffmpegProcess};
        await redisDB.sAdd("liveEvents", ownerId+eventId);        
        await startEvent(eventId,ownerId);
        
        io.to(socketId).emit("info", "Start Success");
      } catch (_) {
        return io.to(socketId).emit("error", "Start Failed");
      }
    });

    socket.on("data", async function ({ eventId, data }) {

      try {
        if (!eventId || !data)  {
           return io.to(socketId).emit("error", "Invalid Payload");
        }

        const isEventOwner = await Event.findOne({_id:eventId,owner:ownerId});

        if (!isEventOwner) {
           return io.to(socketId).emit("error", "No Authorization");
        }

      if(await redisDB.sIsMember('liveEvents',ownerId+eventId)){

      let currentLiveEvent = liveEvents[ownerId+eventId];
    
      if (!currentLiveEvent) 
        {
          return io.to(socketId).emit("BACKEND_SERVER_ERROR"); 
        }
  
        currentLiveEvent = liveEvents[ownerId+eventId];
        const {ffmpegProcess: {stdin:{writable}}} = currentLiveEvent;
        const {ffmpegProcess: {stdin}} = currentLiveEvent;

        if (writable) {
          stdin.write(Buffer.from(data));
        }
        }
        else{
          return io.to(socketId).emit("error", "No Live Event");
        }
        
        await addLiveEventTimeout(ownerId,eventId)

        io.to(socketId).emit("info", "Data Success");
      } catch (_) {
          return io.to(socketId).emit("error", "Data Failed");
      }
    });

    socket.on("pause", async function ({ eventId }) {

      try {
        if (!eventId) { 
          return io.to(socketId).emit("error", "Event Id Required");
        }
        const isEventOwner = await Event.findOne({_id:eventId,owner: ownerId});
        
        if (!isEventOwner) {
          return  io.to(socketId).emit("error", "No Authorization");
        }

        if (!await redisDB.sIsMember("liveEvents",ownerId+eventId)) 
        {
              return io.to(socketId).emit("error", "No Live Event");
        }

       const currentLiveEvent = liveEvents[ownerId+eventId];

       if (currentLiveEvent) 
        {
        const {ffmpegProcess} = currentLiveEvent
        await stopFFmpeg(ffmpegProcess);
        delete liveEvents[ownerId+eventId];
        }        

        fs.rmdirSync(`segment/${eventId}`, { recursive: true });
        fs.unlinkSync(`playlist/${eventId}.m3u8`);
        await removeLiveEventTimeout(ownerId,eventId)
        await redisDB.sRem("liveEvents", ownerId+eventId);
        await pauseEvent(eventId,ownerId);

        io.to(socketId).emit("info", "Pause Success");

      } catch (_) {
       return io.to(socketId).emit("error", "Pause Failed");
      }
    });

    socket.on("resume", async function ({ eventId, inputFormat }) {
      try {
        if (!eventId) {
          return io.to(socketId).emit("error", "Event Id Required");
        }

        if (!["mp4", "webm"].includes(inputFormat)) {
            return io.to(socketId).emit("error", "Invalid Input Format");
        }

        const isEventOwner = await Event.findOne({_id:eventId,owner: ownerId});
  
        if (!isEventOwner) {
           return io.to(socketId).emit("error", "No Authorization");
        }

        fs.mkdirSync(`playlist`, { recursive: true });
        fs.mkdirSync(`segment/${eventId}`, { recursive: true });
        const ffmpegProcess = createFFmpeg({ eventId, inputFormat });
        liveEvents[ownerId+eventId] = {ffmpegProcess};
        await redisDB.sAdd("liveEvents", ownerId+eventId);
        await resumeEvent(eventId,ownerId);

        io.to(socketId).emit("info", "Resume Success");

      } catch (_) {
      return io.to(socketId).emit("error", "Resume Failed");
      }
    });

    socket.on("end", async function ({ eventId }) {
      try {
        if (!eventId)  {
           return io.to(socketId).emit("error", "Event Id Required");
        }
        const isEventOwner = await Event.findOne({_id:eventId,owner: ownerId});

        if (!isEventOwner) {
         return   io.to(socketId).emit("error", "No Authorization");
        }
        
        if (!await redisDB.sIsMember("liveEvents",ownerId+eventId)) 
        {
                return io.to(socketId).emit("error", "No Live Event");
        }

        const currentLiveEvent = liveEvents[ownerId+eventId];
       
        if (currentLiveEvent) 
        {
        const {ffmpegProcess} = currentLiveEvent
        await stopFFmpeg(ffmpegProcess);
        delete liveEvents[ownerId+eventId];
        }        

        fs.rmdirSync(`segment/${eventId}`, { recursive: true });
        fs.unlinkSync(`playlist/${eventId}.m3u8`);
        await removeLiveEventTimeout(ownerId,eventId)
        await redisDB.sRem("liveEvents", ownerId+eventId);
        await endEvent(eventId,ownerId);

        io.to(socketId).emit("info", "End Success");

      } catch (_) {
       return io.to(socketId).emit("error", "End Failed");
      }
    });

    socket.on("disconnect",function () {
    console.log("Socket Disconnect");
    });

  });
}