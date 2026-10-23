import mongoose from "mongoose";

const {models,model,Schema} = mongoose

const userSchema = new Schema({
  name: { type: String, required: true,unique:true },
  password: { type: String, required: true }
}, { timestamps: true });

export const User = models['User'] || model("User", userSchema,'User');