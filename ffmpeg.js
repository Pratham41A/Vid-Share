import { spawn } from "child_process";

export function createFFmpeg({ eventId,inputFormat }) {

const ffmpegArgs = [
  "-f", inputFormat,        
  "-i", "pipe:0",

  "-c:a", "aac",//Audio codecs
  "-c:v", "libx264",//Video codecs
  "-preset", "ultrafast",//Less Processing
  "-tune", "zerolatency",//Disable Extra Processing
  "-r", "30",//Output FPS
  "-vf", "scale=1920:1080",//Video Filter

  "-threads", "1",//1 Thread Use
  /*
  I Frame is Independent Frame

  Group Of Picture is Group of P and B Frame between 2 I Frame

  P Frame is Predicted Frame
  Stores Changes needed from Previous Frame (for Self)

  B Frame is Bi-Directional Predicted Frame
  Stores Changes needed from Previous (for Self) and for Next Frame 
  */

  "-f", "hls",
  "-hls_time", "5",
  "-hls_list_size", "5",

  "-hls_flags", "delete_segments+append_list",
  "-hls_segment_type", "mpegts",
  //Segment File Path
  "-hls_segment_filename", `segment/${eventId}/%d.ts`, 
  //Segment Server Path Prefix in m3u8 File
  "-hls_base_url", `/segment/${eventId}/`,
  //Playlist File Path 
  `playlist/${eventId}.m3u8`
];

  const ffmpeg = spawn("ffmpeg", ffmpegArgs);

  const {stdin, stderr, stdout} = ffmpeg

  ffmpeg.on("error", function (error)  {
    console.log('FFMPEG error: ',error)
  });
  stdin.on("error", function (error) {
    console.log('FFMPEG STDIN error: ',error)
  });
  stdout.on("error", function (error) {
    console.log('FFMPEG STDOUT error: ',error)
  });
  stderr.on("error", function (error) {
    console.log('FFMPEG STDERR error: ',error)
  });
  stderr.on('data',function(data){
    console.log("FFMPEG STDERR data: ",data.toString())
  })
  
  return ffmpeg;
}



export function stopFFmpeg(ffmpegProcess) {
  return new Promise(function (resolve){
    const {stdin} = ffmpegProcess
    stdin.end();
    ffmpegProcess.kill('SIGINT');
    ffmpegProcess.once('close', (code, signal) => {
      resolve();
    });
  })
}