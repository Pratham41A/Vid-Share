import { Queue } from "bullmq";
import IORedis from "ioredis";

export const connection= new IORedis(
  process.env.REDIS_DB_URI,
  {
    maxRetriesPerRequest: null, 
  }
);

const liveEventTimeoutQueue = new Queue("liveEventTimeout", { connection });

export async function addLiveEventTimeout(ownerId, eventId) {
try{
  const existingJob = await liveEventTimeoutQueue.getJob(ownerId+eventId);

  if (existingJob) {
    await existingJob.remove();
  } 

  await liveEventTimeoutQueue.add(
    "pauseEvent",//Job Name
    { ownerId, eventId },
    {
      jobId: ownerId+eventId,
      delay: 50000,
      removeOnComplete: true,
      removeOnFail: true,
    }
  );
}
catch(error){
  console.log('addLiveEventTimeout: ',error)
}
}

export async function removeLiveEventTimeout(ownerId, eventId) {
  try{
  const existingJob = await liveEventTimeoutQueue.getJob(ownerId+eventId);
  if (existingJob) {
    await existingJob.remove();
  }
}
catch(error){
  console.log("removeLiveEventTimeout: ",error)
}
}