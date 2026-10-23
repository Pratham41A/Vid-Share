import { Event } from "./models/event.js"
import { User } from "./models/user.js"
import jwt from "jsonwebtoken"

export async function eventViewAccess(req, res, next) {
  try {
    let {params:{id:eventId}} = req;
    const {cookies: {privateEventsToken}} = req

    eventId = eventId.replace(/\.m3u8$/, "")
    
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        error: "No Event",
      });
    }
    
    const {visibility} = event
    
    if (visibility === "public") {
      return next();
    }

    else {
    if (!privateEventsToken) {
      return res.status(403).json({
        error: "No Authorization",
      });
    }

    const {privateEvents} = jwt.verify(privateEventsToken, process.env.JWT_SECRET);

    if (!privateEvents.includes(eventId)) {
      return res.status(403).json({
        error: "No Authorization",
      });
    }
      return next();
    }
  } catch (error) {
    const  {message} = error
    return res.status(500).json({ error: message });
  }
}

export  async function auth  (req, res, next)  {
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

    const {userId} = jwt.verify(authenticationToken, process.env.JWT_SECRET);

    const user = await User.findById(userId)

    if (!user) {
      return res.status(404).json({
        error: "No User",
      });
    }

    req.userId = userId;

    next();
  } catch (error) {
    const  {message} = error
    return res.status(500).json({ error: message });
  }
};