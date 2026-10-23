import { createClient } from 'redis';

export const redisDB = createClient({
  url: process.env.REDIS_DB_URI
});

redisDB.on("error",function (error) {
  console.log("REDIS error: ",error);
});

export async function connectRedisDB() {
  try{
  const {isOpen} = redisDB
if (!isOpen) {
  await redisDB.connect();
}
  }
  catch(error){
    console.log('connectRedisDB: ',error)
  }
} 