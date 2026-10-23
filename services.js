import fs from "fs";
import { redisDB } from "./redisDB.js";
import {liveEvents as liveEventsVariable} from './socket.js'
import { stopFFmpeg } from "./ffmpeg.js";
import { pauseEvent } from "./mongodDB.js";
import { Worker } from "bullmq";
import { connection } from "./queue.js";

export async function initLiveEventTimeoutWorker() {
  try{
  const worker = new Worker(
    "liveEventTimeout",//Queue Name
    async function (job) {
      const { data: {ownerId, eventId} } = job;

      const currentLiveEvent = liveEventsVariable[ownerId+eventId];
      
      if (currentLiveEvent) {
        const { ffmpegProcess } = currentLiveEvent;
          await stopFFmpeg(ffmpegProcess);
          delete liveEventsVariable[ownerId+eventId];
        }

      if(fs.existsSync(`segment/${eventId}`)){
          fs.rmdirSync(`segment/${eventId}`, { recursive: true });
      }
      if(fs.existsSync(`playlist/${eventId}.m3u8`)){
          fs.unlinkSync(`playlist/${eventId}.m3u8`);
      }

      await redisDB.sRem(
        "liveEvents",
        ownerId+eventId
      );

      await pauseEvent(eventId, ownerId);
      
      console.log(`Auto Paused Event ${eventId} with Owner ${ownerId}`);
    },
    { connection }
  );

  worker.on("failed", function () {
    console.log(`Auto Pause fail`);
  });

  worker.on("error", function (error) {
    console.log(`Auto Pause error: `,error);
  });

    } catch (error) {
    console.log(`initLiveEventTimeoutWorker: `, error);
  }
}