import * as ffmpegPath from '@ffmpeg-installer/ffmpeg';
import * as  ffprobePath from '@ffprobe-installer/ffprobe';
import * as  ffmpeg from 'fluent-ffmpeg';
import * as  path from 'path';
import * as fs from 'fs';

// 分片后的视频信息

interface SplitVideo {
  fileIndex: number; // 分割后的视频序号
  fileName: string; // 当前的文件的文件名 不包含类型后缀
  fileType: string; // 当前的文件类型
  fileFullPath: string; // 视频的全路径
  // isFile: boolean; // 是否是文件
  fileTotalTime: number | string; // 视频总时长
  fileRemainTime: number | string; // 剩余时长
  fileStartTime: number; // 开始切割的时间参数
}

// 每个视频项目的信息
interface VideoConfig  extends SplitVideo{
  fileSplitList: Array<SplitVideo> // 包含了哪些分片视频
}

// 全局基础配置
interface GlobalConfig {
  readonly fileTypeList: Array<string>; // 支持的文件类型
  readonly fileInputPath: string; // 文件的输入路径
  readonly fileOutputPath: string; // 文件的输出路径
  readonly intervalTime: number; // 每个视频的切割时间
  readonly fileBgMusic: string; // 背景音乐全路径
  fileList: Array<VideoConfig>
}
// 全局配置
const globalConfig: GlobalConfig = {
  fileTypeList: ['mp4', 'avi', 'flv', 'mkv'],
  fileInputPath: path.join('/Users/swf/Downloads/'),
  fileOutputPath: path.join('/Users/swf/Downloads/after'),
  intervalTime: 10 * 60, // 十分钟
  fileBgMusic: path.join(__dirname, '/assets/bgmusic/bg.mp3'),
  fileList: []
}
// 视频分割
type VideoSplit = (videoConfig: VideoConfig) => Array<Promise<SplitVideo>>;


const videoSplit: VideoSplit = function (videoConfig: VideoConfig): Array<Promise<SplitVideo>> {
  // 剩余时长小于最小时间间隔
  let isEnd: Boolean = false;
  let splitPromise: Array<Promise<SplitVideo>> = []
  while (!isEnd) {
    // 上一个视频的分片索引
    const lastSplitIndex = videoConfig.fileSplitList.length - 1;
    const splitVideo: SplitVideo = <SplitVideo> {
      ...videoConfig.fileSplitList[lastSplitIndex]
    }
    let fileStartTime = splitVideo.fileStartTime
    // 当前视频分片的索引
    splitVideo.fileIndex = lastSplitIndex;

    if (splitVideo.fileRemainTime < globalConfig.intervalTime) {
      isEnd = true
    }
    
    const intervalTime:number = <number>splitVideo.fileRemainTime - globalConfig.intervalTime;
    splitVideo.fileRemainTime = intervalTime;
    splitVideo.fileStartTime += globalConfig.intervalTime
    splitVideo.fileName = `${videoConfig.fileName}_${splitVideo.fileIndex}.mp4`
    splitVideo.fileFullPath = `${globalConfig.fileOutputPath}/${splitVideo.fileName}`
    splitVideo.fileTotalTime = intervalTime > 0 ? globalConfig.intervalTime : (-intervalTime)
    videoConfig.fileSplitList.push(splitVideo)

    splitPromise.push(new Promise((resolve, reject) => {
      ffmpeg(videoConfig.fileFullPath, (err, video) => {
        if (err) {
          console.log(err)
        } else {
          console.log(video)
        }
      })
        .inputOptions([
          '-ss',
          fileStartTime
        ])
        .outputOptions([
          '-c',
          'copy',
          '-t',
          `${globalConfig.intervalTime}`,
        ])
        .output(splitVideo.fileFullPath)
        .on('start', (command) => {
          console.log('处理中...', command)
        })
        .on('progress', (progress) => {
          // console.log(`进行中，第${fileIndex}个， 已完成${progress.percent}%`)
        })
        .on('error', (err) => {
          console.log(err.message)
          reject(err.message)
        })
        .on('end', () => {
          console.log(`第${splitVideo.fileIndex + 1}个，已完成100%,success!`)
          resolve(splitVideo)
        })
        .run()
    }))
  }
  return splitPromise
}


const fileDisplay:  (globalConfig: GlobalConfig) => Array<Promise<VideoConfig>> =  function (globalConfig: GlobalConfig): Array<Promise<VideoConfig>> {
  //根据文件路径读取文件，返回文件列表  
  return fs.readdirSync(globalConfig.fileInputPath).map(filename => {
    const videoConfig: VideoConfig = <VideoConfig>{}

    return new Promise((resolve, reject) => {
      //获取当前文件的绝对路径  
      videoConfig.fileFullPath = path.join(globalConfig.fileInputPath, filename);
      fs.stat(videoConfig.fileFullPath, async (eror, stats) => {
        const isFile = stats.isFile()
        videoConfig.fileType = filename.substring(filename.lastIndexOf('.') + 1)
        videoConfig.fileName = filename.substring(0, filename.lastIndexOf('.'))
        
        if (eror) {
          console.warn('获取文件stats失败');
          reject(eror)
        } else {
          if (isFile && globalConfig.fileTypeList.includes(videoConfig.fileType)) {
            // globalConfig.fileList.push(videoConfig)
            // 开始转换
            try {
              videoInfo(videoConfig).then(e => {
                videoConfig.fileTotalTime = e;
                videoConfig.fileRemainTime = e;
                videoConfig.fileStartTime = 0; // 默认从头开始切割
                videoConfig.fileIndex = 0;
                // 默认第一个是父节点的信息
                videoConfig.fileSplitList = [].concat({
                  fileIndex: videoConfig.fileIndex,
                  fileName: videoConfig.fileName,
                  fileType: videoConfig.fileType,
                  fileFullPath: videoConfig.fileFullPath,
                  fileTotalTime: videoConfig.fileTotalTime,
                  fileRemainTime: videoConfig.fileRemainTime,
                  fileStartTime: videoConfig.fileStartTime
                })
                
                Promise.all(videoSplit(videoConfig)).then(e => {
                  // const lastIndex = e.length - 1;
                  console.log(e)
                  resolve(videoConfig)
                })
                // resolve(videoConfig)
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

const videoInfo: (videoConfig: VideoConfig) => Promise<any> = function (videoConfig: VideoConfig): Promise<any> {
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

const main: () => void = function():void {
  // fix bug 路径不存在
  ffmpeg.setFfprobePath(ffprobePath.path)
  ffmpeg.setFfmpegPath(ffmpegPath.path)
  // 创建输入输出目录
  const inputDirIsExists = fs.existsSync(globalConfig.fileInputPath);
  const outputDiIsExists = fs.existsSync(globalConfig.fileOutputPath)
  if (!inputDirIsExists) {
    fs.mkdirSync(globalConfig.fileInputPath)
  }
  if (!outputDiIsExists) {
    fs.mkdirSync(globalConfig.fileOutputPath)
  }
  fileDisplay(globalConfig)
}


// 入口
main()
console.log('任务结束')