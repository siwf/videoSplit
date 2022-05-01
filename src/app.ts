import * as ffmpegPath from '@ffmpeg-installer/ffmpeg';
import * as  ffprobePath from '@ffprobe-installer/ffprobe';
import * as  ffmpeg from 'fluent-ffmpeg';
import * as  path from 'path';
import * as fs from 'fs';



// 每个视频项目的信息
interface VideoConfig {
  fileIndex: number; // 分割后的视频序号
  fileName: string; // 当前的文件的文件名 不包含类型后缀
  fileType: string; // 当前的文件类型
  fileSize: number; // 当前文件的大小
  fileFullPath: string; // 视频的全路径
  isFile: boolean; // 是否是文件
  fileTotalTime: number | string; // 视频总时长
  fileRemainTime: number | string; // 剩余时长
  fileStartTime: number; // 开始切割的时间参数
}

// 全局基础配置
interface GlobalConfig {
  readonly fileTypeList: Array<string>; // 支持的文件类型
  readonly fileInputPath: string; // 文件的输入路径
  readonly fileOutputPath: string; // 文件的输出路径
  readonly intervalTime: number; // 每个视频的切割时间
  fileList: Array<VideoConfig> // 视频列表信息
}
// 全局配置
const globalConfig: GlobalConfig = {
  fileTypeList: ['mp4', 'avi', 'flv'],
  fileInputPath: path.join('/Users/swf/Downloads/before'),
  fileOutputPath: path.join('/Users/swf/Downloads/after'),
  intervalTime: 10 * 60, // 十分钟
  fileList: []
}
// 视频分割
type VideoSplit = (videoConfig: VideoConfig) => any;


const videoSplit: VideoSplit = function (videoConfig: VideoConfig): any {
  videoConfig.fileStartTime = 0 // 默认从头开始切割
  videoConfig.fileIndex = 0
  // 剩余时长小于最小时间间隔
  let isEnd: Boolean = false
  while (!isEnd) {
    if (videoConfig.fileRemainTime < globalConfig.intervalTime) {
      isEnd = true
    }
    videoConfig.fileRemainTime = <number>videoConfig.fileRemainTime - globalConfig.intervalTime;
    setTimeout(() => {
      ffmpeg(videoConfig.fileFullPath, (err, video) => {
        if (err) {
          console.log(err)
        } else {
          console.log(video)
        }
      })
        .inputOptions([
          '-ss',
          videoConfig.fileStartTime
        ])
        .outputOptions([
          '-c',
          'copy',
          '-t',
          `${globalConfig.intervalTime}`,
        ])
        .output(`${globalConfig.fileOutputPath}/${videoConfig.fileName}_${videoConfig.fileIndex}.${videoConfig.fileType}`)
        .on('start', (command) => {
          console.log('处理中...', command) })
        .on('progress', (progress) => { console.log('进行中，完成' + progress.percent + '%') })
        .on('error', (err) => {
          console.log(err.message)
        })
        .on('end', (str) => {
          console.log('进行中，完成100%')
          console.log('success!')
        })
        .run()
        videoConfig.fileIndex++;
        videoConfig.fileStartTime += globalConfig.intervalTime
    }, 0)
  }
}


const fileDisplay: (globalConfig: GlobalConfig) => Array<Promise<VideoConfig>> = function (globalConfig: GlobalConfig): Array<Promise<VideoConfig>> {
  //根据文件路径读取文件，返回文件列表  
  return fs.readdirSync(globalConfig.fileInputPath).map(filename => {

    const videoConfig: VideoConfig = {} as VideoConfig;

    return new Promise((resolve, reject) => {
      //获取当前文件的绝对路径  
      videoConfig.fileFullPath = path.join(globalConfig.fileInputPath, filename);

      fs.stat(videoConfig.fileFullPath, async (eror, stats) => {

        videoConfig.fileType = filename.substring(filename.lastIndexOf('.') + 1)
        videoConfig.fileName = filename.substring(0, filename.lastIndexOf('.'))
        videoConfig.fileSize = stats.size;
        videoConfig.isFile = stats.isFile()

        if (eror) {
          console.warn('获取文件stats失败');
          reject(eror)
        } else {
          if (videoConfig.isFile && globalConfig.fileTypeList.includes(videoConfig.fileType)) {
            globalConfig.fileList.push(videoConfig)

            // 开始转换
            try {
              videoInfo(videoConfig).then(e => {
                videoConfig.fileTotalTime = e;
                videoConfig.fileRemainTime = e;
                resolve(videoConfig)
                videoSplit(videoConfig)
              })
            } catch (error) {
              console.log(eror)
            }
          }
        }
      })
    })
  })
}

const videoInfo: (videoConfig: VideoConfig) => Promise<number | string> = function (videoConfig: VideoConfig): Promise<number | string> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoConfig.fileFullPath, (err, data) => {
      if (err) {
        reject()
      } else {
        resolve(data.format.duration)
      }
    })
  })
}

ffmpeg.setFfprobePath(ffprobePath.path)
ffmpeg.setFfmpegPath(ffmpegPath.path)
fileDisplay(globalConfig)
// Promise.all(fileDisplay(globalConfig)).then(e => {
//   console.log(globalConfig)
// }).catch(err => {
//   console.log(err)
// })
