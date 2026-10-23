import { getDownloadAuthorization, uploadFile } from "./backBlazeB2.js";
import { Event } from "./models/event.js";
import {User} from './models/user.js'

import path from 'path'
import jwt from "jsonwebtoken";
import bcrypt from 'bcryptjs';

export async function createEvent(req, res) {
    try {
    const { body: {name, visibility, password}, file } = req;
    const {userId}=req

    let body = null
    let thumbnail = null
    let thumbnailData = null;

    if (file) {
      const {originalname, buffer, mimetype} = file;
      thumbnailData = `data:${mimetype};base64,${buffer.toString("base64")}`
      
      const fileName = `event/thumbnail/${name}_${Date.now()}${path.extname(originalname)}`;
      thumbnail = await uploadFile(fileName, buffer)
      const downloadAuthorization = await getDownloadAuthorization()
      thumbnail = `${thumbnail}?Authorization=${downloadAuthorization}`;
    }
    
    if (visibility === "private") {
    body={
      name,
      visibility,
      password,
      thumbnail,
      thumbnailData,
      owner: userId
    }
    }
    else if (visibility === "public") {
    body={
      name,
      visibility,
      thumbnail,
      thumbnailData,
      owner: userId
    }
    }

    const event = await Event.create(body);

    const {_id: eventId} = event
    event.url = `${process.env.BACKEND_SERVER_URL}/playlist/${eventId}.m3u8`;
    await event.save();

    return res.sendStatus(200)
  } catch (error) {
    const  {message} = error
    return res.status(500).json({ error: message });
  }
}
export async function fetchEvents(req, res) {
  try {
  const events = await Event.find({})
  .select('name thumbnail thumbnailData status visibility owner')
  .populate('owner', 'name')
  .lean();

    const downloadAuthorization = await getDownloadAuthorization();
    
    events.map(function (event) {
      const {thumbnail} = event
      event = {
        ...event,
        thumbnail:`${thumbnail.split('?Authorization=')[0]}?Authorization=${downloadAuthorization}`
      }
      return event
    });

  return  res.status(200).json({ data : events });
  } catch (error) {
    const  {message} = error
    return res.status(500).json({ error: message });
  }
}
export async function fetchEvent(req, res) {
  try {
    const {params: {id: eventId}}=req
    const {userId} = req

    let event = await Event.findById(eventId)
      .populate('owner', 'name')
      .lean();

    if (!event) {
      return res.status(404).json({ error: "No Event" });
    }

    const {
      owner: { _id: ownerId, name: ownerName },
      password,
      name: eventName,
      url,
      thumbnail, 
      thumbnailData,
      status,
      visibility,
    } = event;

    const isOwner = ownerId.toString() === userId;

    if (isOwner) {
      event = {
        password,
        name: eventName,
        url,
        thumbnail,
        thumbnailData,
        status,
        visibility,
        owner: ownerName,
      };
    } else {
      event = {
        name: eventName,
        url,
        thumbnail,
        thumbnailData,
        status,
        visibility,
        owner: ownerName,
      };
    }

    const downloadAuthorization = await getDownloadAuthorization();
    
    event ={
      ...event,
       thumbnail:`${thumbnail.split('?Authorization=')[0]}?Authorization=${downloadAuthorization}`
    }

  return  res.status(200).json({ data : event });

  } catch (error) {
    const  {message} = error
    return res.status(500).json({ error: message });
  }
}

export async function auth(req, res) {
  try {
    let {cookies: {authenticationToken} } = req
    const {headers: {authorization}} = req
    
    if (!authenticationToken) {
      if (!authorization) {
        return res.status(401).json({ error: "No Authentication" });
      }
    }
    
    if(!authenticationToken){
      authenticationToken = authorization.replace("Bearer ", "");
    }

    const { userId } = jwt.verify(authenticationToken, process.env.JWT_SECRET);

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({ error: "No User" });
    }

    return res.status(200).json({ data: user });
  } catch (error) {
    const  {message} = error
    return res.status(500).json({ error: message });
  }
}

export async function login(req, res) {
  try {
    const { body: {name, password} } = req;

    if (!name || !password) {
      return res.status(400).json({
        error: "User Name and Password Required",
      });
    }

    let user = await User.findOne({ name });
    //Existing User
    if (user) {
      const {password: hashedPassword} = user
      const isPasswordCorrect = await bcrypt.compare(
        password,
        hashedPassword
      );

      if (!isPasswordCorrect) {
        return res.status(422).json({
          error: "Invalid Password",
        });
      }
    }
    // New User
    else {
      const hashedPassword = await bcrypt.hash(password, 10);

      user = await User.create({
        name,
        password: hashedPassword,
      });
    }
    
    const { _id: userId } = user

    const authenticationToken = jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      {
        expiresIn: JSON.parse(process.env.JWT_EXPIRY),
      }
    );

    res.cookie("authenticationToken", authenticationToken, {
      httpOnly: true,
      secure: JSON.parse(process.env.COOKIE_SECURE),
      sameSite: process.env.COOKIE_SAME_SITE,
      maxAge: JSON.parse(process.env.COOKIE_EXPIRY),
    });

    res.set("Authorization", `Bearer ${authenticationToken}`);

    user = await User.findById(userId).select("-password");

    return res.status(200).json({
      data: user,
    });
  } catch (error) {
    const  {message} = error
    return res.status(500).json({ error: message });
  }
}

export async function eventViewAccess(req, res) {
try{
    const {body: {password}, params: {id: eventId}}=req
    let {cookies:{privateEventsToken}} = req
    
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        error: "No Event"
      });
    }
    else{
      const {visibility, password: eventPassword} =event
          if (visibility === "public") {
      return res.sendStatus(200)
    }

    if (visibility === "private") {

      let privateEvents
      
      try{
     ({privateEvents} = jwt.verify(privateEventsToken, process.env.JWT_SECRET))
      }
      catch(_){
        privateEvents = []  
      }

    if (!password) {
      return res.status(404).json({
        error: "Event Password Required"
      });
    }

    if (eventPassword !== password) {
      return res.status(422).json({
        error: "Invalid Password"
      });
    }

    privateEvents.push(eventId)

    privateEventsToken = jwt.sign(
        { privateEvents },
        process.env.JWT_SECRET,
        {
            expiresIn: JSON.parse(process.env.JWT_EXPIRY),
        }
    );

    res.cookie("privateEventsToken", privateEventsToken, {
      httpOnly: true,
      secure: JSON.parse(process.env.COOKIE_SECURE),
      sameSite: process.env.COOKIE_SAME_SITE,
      maxAge: JSON.parse(process.env.COOKIE_EXPIRY),
    });

      return res.sendStatus(200)
    }
  }
}
catch(error){
    const  {message} = error
    return res.status(500).json({ error: message });
}
}

export async function eventEditAccess(req, res) {
try{
    const {params: {id: eventId}}=req
    const {userId}=req

    const event = await Event.findOne({
      _id:eventId,
      owner: userId
    })
    if(event){
      return res.sendStatus(200)
    }
    else{
      return res.status(403).json({error:"No Authorization"}); 
    }
}
catch(error){
    const  {message} = error
    return res.status(500).json({ error: message });
}
}