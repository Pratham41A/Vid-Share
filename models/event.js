import mongoose from "mongoose";

const { models, model, Schema, Types: {ObjectId} } = mongoose;

const eventSchema = new Schema({
  name: { type: String, required: true },
  url: { type: String },
  thumbnail: { type: String, required: true },
  thumbnailData: { type: String, required: true },
  status: {
    type: String,
    enum: ["created", "started", "paused", "ended"],
    default: "created",
    required:true
  },
  visibility:{
    type: String,
    required:true,
    enum: ["public", "private"],
    default: "public"
  },
  owner:{
    type:ObjectId,
    ref:'User',
    required:true
  },
  password:{
    type:String,
  }
}, { timestamps: true });

export const Event = models['Event'] || model("Event", eventSchema,'Event');