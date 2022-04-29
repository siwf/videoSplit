
import ffmpegPath = require('@ffmpeg-installer/ffmpeg')
// import ffmpeg = require("fluent-ffmpeg");
// import path = require("path");

// interface VideoConfig {
//   filePath: String; // 视频输入路径
//   startTime: String; // 视频切割开始时间 00:00:00
//   endTime: String; // 视频切割结束时间 00:00:00
//   intervalTime: Number; // 时间间隔 单位秒 60
//   outputPath: String; // 视频输出路径
// }

// const videoCofing: VideoConfig = {
//   filePath: path.join(__dirname, "../", "public/test.mp4"),
//   startTime: "00: 00: 00",
//   endTime: "",
//   intervalTime: 10 * 60,
//   outputPath: path.join(__dirname, "../", "output"),
// };
// fix bug Cannot find ffmpeg
console.log(ffmpegPath)
// ffmpeg.setFfmpegPath(ffmpegPath.path);
// ffmpeg(videoCofing.filePath)
console.log('end')