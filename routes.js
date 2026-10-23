import express from "express";
import { upload } from "./multer.js";
import { createEvent,auth as authController, fetchEvent, fetchEvents, login, eventEditAccess, eventViewAccess as eventViewAccessController } from './controller.js'
import path from "path";
import { auth as authMiddleware, eventViewAccess as eventViewAccessMiddleware } from "./middleware.js";

 export const router = express.Router();

 router.get("/", function (req, res) {
    return res.send("Om Ganeshaay Namah" );
});
router.post('/auth',authController)
router.post('/login',login)
router.get('/event',authMiddleware,fetchEvents)
router.get('/event/:id',authMiddleware,fetchEvent)
router.post("/event",authMiddleware,upload.single('thumbnail'),createEvent)    
router.post('/event/edit/:id',authMiddleware,eventEditAccess)
router.post('/event/view/:id',authMiddleware,eventViewAccessController)

router.use(
  "/playlist/:id",
  authMiddleware,
  eventViewAccessMiddleware,
  function (req, res) {
    let {params: {id: eventId}} = req
    
    eventId=eventId.replace(/\.m3u8$/, "");

    res.sendFile(path.resolve("playlist", `${eventId}.m3u8`));
  }
);

router.use(
  "/segment/:id/:segmentId",
  authMiddleware,
  eventViewAccessMiddleware,
  function (req, res) {
    let {params:{segmentId}} = req
    const {params:{id:eventId}} = req

    segmentId = segmentId.replace(/\.ts$/, "");

    res.sendFile(
      path.resolve("segment", eventId, `${segmentId}.ts`)
    );
  }
);