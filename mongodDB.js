import mongoose from "mongoose";
import {Event} from './models/event.js'

const {connection} = mongoose

export async function connectMongoDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
dbName:process.env.MONGODB_NAME,
appName:process.env.MONGODB_APP_NAME
    });

  } catch (error) {
    console.log("connectMongoDB: ", error);
  }
}

connection.on("error", function (error) {
  console.log("MongoDB error: ",error);
});

export async function startEvent(eventId,ownerId) {
  try{
await Event.updateOne(
  {
    _id: eventId,
    owner: ownerId, 
  },
  {
    $set: { status: "started" },
  }
);
}
catch(error){
  console.log('startEvent: ',error)
}
}
export async function pauseEvent(eventId,ownerId) {
  try{
await Event.updateOne(
  {
    _id: eventId,
    owner: ownerId, 
  },
  {
    $set: { status: "paused" },
  }
);
}
catch(error){
  console.log('pauseEvent: ',error)
}
}
export async function resumeEvent(eventId,ownerId) {
  try{
await Event.updateOne(
  {
    _id: eventId,
    owner: ownerId, 
  },
  {
    $set: { status: "started" },
  }
);
  }
catch(error){
  console.log('resumeEvent: ',error)
}
}
export async function endEvent(eventId,ownerId) {
  try{
await Event.updateOne(
  {
    _id: eventId,
    owner: ownerId, 
  },
  {
    $set: { status: "ended" },
  }
);
}
catch(error){
  console.log('endEvent: ',error)
}
}