Fun-ASR实时语音识别WebSocket API
更新时间：2025-11-21 14:09:41
产品详情
我的收藏
本文介绍如何通过WebSocket协议直接接入Fun-ASR实时语音识别服务。该方式适用于所有支持WebSocket的编程语言。为简化Java和Python开发者的接入流程，我们另提供了封装度更高的SDK（Python SDK/Java SDK），但您仍可选择使用本文描述的通用协议进行开发，以获得最大的灵活性。

重要
本文档仅适用于“中国大陆（北京）”地域，且必须使用该地域的API Key。

用户指南：关于模型介绍和选型建议请参见实时语音识别-Fun-ASR/Gummy/Paraformer。

快速开始
准备工作
获取API Key，为安全起见，推荐将API Key配置到环境变量。

下载示例音频文件：asr_example.wav。

示例代码
npm install ws
npm install uuid


示例代码如下：

const fs = require('fs');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid'); // 用于生成UUID

// 若没有将API Key配置到环境变量，可将下行替换为：apiKey = 'your_api_key'。不建议在生产环境中直接将API Key硬编码到代码中，以减少API Key泄露风险。
const apiKey = process.env.DASHSCOPE_API_KEY;
const url = 'wss://dashscope.aliyuncs.com/api-ws/v1/inference/'; // WebSocket服务器地址
const audioFile = 'asr_example.wav'; // 替换为您的音频文件路径

// 生成32位随机ID
const TASK_ID = uuidv4().replace(/-/g, '').slice(0, 32);

// 创建WebSocket客户端
const ws = new WebSocket(url, {
  headers: {
    Authorization: `bearer ${apiKey}`
  }
});

let taskStarted = false; // 标记任务是否已启动

// 连接打开时发送run-task指令
ws.on('open', () => {
  console.log('连接到服务器');
  sendRunTask();
});

// 接收消息处理
ws.on('message', (data) => {
  const message = JSON.parse(data);
  switch (message.header.event) {
    case 'task-started':
      console.log('任务开始');
      taskStarted = true;
      sendAudioStream();
      break;
    case 'result-generated':
      console.log('识别结果：', message.payload.output.sentence.text);
      if (message.payload.usage) {
        console.log('任务计费时长（秒）：', message.payload.usage.duration);
      }
      break;
    case 'task-finished':
      console.log('任务完成');
      ws.close();
      break;
    case 'task-failed':
      console.error('任务失败：', message.header.error_message);
      ws.close();
      break;
    default:
      console.log('未知事件：', message.header.event);
  }
});

// 如果没有收到task-started事件，关闭连接
ws.on('close', () => {
  if (!taskStarted) {
    console.error('任务未启动，关闭连接');
  }
});

// 发送run-task指令
function sendRunTask() {
  const runTaskMessage = {
    header: {
      action: 'run-task',
      task_id: TASK_ID,
      streaming: 'duplex'
    },
    payload: {
      task_group: 'audio',
      task: 'asr',
      function: 'recognition',
      model: 'fun-asr-realtime',
      parameters: {
        sample_rate: 16000,
        format: 'wav'
      },
      input: {}
    }
  };
  ws.send(JSON.stringify(runTaskMessage));
}

// 发送音频流
function sendAudioStream() {
  const audioStream = fs.createReadStream(audioFile);
  let chunkCount = 0;

  function sendNextChunk() {
    const chunk = audioStream.read();
    if (chunk) {
      ws.send(chunk);
      chunkCount++;
      setTimeout(sendNextChunk, 100); // 每100ms发送一次
    }
  }

  audioStream.on('readable', () => {
    sendNextChunk();
  });

  audioStream.on('end', () => {
    console.log('音频流结束');
    sendFinishTask();
  });

  audioStream.on('error', (err) => {
    console.error('读取音频文件错误：', err);
    ws.close();
  });
}

// 发送finish-task指令
function sendFinishTask() {
  const finishTaskMessage = {
    header: {
      action: 'finish-task',
      task_id: TASK_ID,
      streaming: 'duplex'
    },
    payload: {
      input: {}
    }
  };
  ws.send(JSON.stringify(finishTaskMessage));
}

// 错误处理
ws.on('error', (error) => {
  console.error('WebSocket错误：', error);
});


核心概念
交互时序
客户端与服务端的交互遵循严格顺序，以保证任务正确执行。

image
建立连接：客户端向服务端发起WebSocket连接请求，并在请求头中携带鉴权信息。

开启任务：连接成功后，客户端发送一条run-task指令，声明要使用的模型和音频参数。

确认任务：服务端返回task-started事件，表示已准备好接收音频。

传输数据：

客户端开始连续发送二进制音频数据。

服务端在识别过程中，会实时、多次地返回result-generated事件，其中包含中间和最终识别结果。

结束任务：音频发送完毕后，客户端发送finish-task指令。

确认结束：服务端处理完所有剩余音频后，返回task-finished事件，标志任务正常结束。

关闭连接：客户端或服务端关闭WebSocket连接。

音频流规范
声道：发送至服务端的二进制音频须为单声道。

格式与编码：支持pcm、wav、mp3、opus、speex、aac、amr格式。

wav格式文件必须为PCM编码。

opus或speex格式文件必须使用Ogg容器封装。

amr格式仅支持AMR-NB类型。

采样率：必须与run-task指令中指定的sample_rate参数以及所选模型的要求一致。

模型列表








模型名称

版本

支持的语言

支持的采样率

适用场景

支持的音频格式

单价

免费额度（注）

fun-asr-realtime

当前等同fun-asr-realtime-2025-11-07
稳定版

中文（普通话、粤语、吴语、闽南语、客家话、赣语、湘语、晋语；并支持中原、西南、冀鲁、江淮、兰银、胶辽、东北、北京、港台等，包括河南、陕西、湖北、四川、重庆、云南、贵州、广东、广西、河北、天津、山东、安徽、南京、江苏、杭州、甘肃、宁夏等地区官话口音）、英文、日语

16kHz

视频直播、会议、电话客服等

pcm、wav、mp3、opus、speex、aac、amr

0.00033元/秒

36,000秒（10小时）

有效期：阿里云百炼开通后90天

fun-asr-realtime-2025-11-07

相较fun-asr-realtime-2025-09-15做了远场VAD优化，识别更准
快照版

fun-asr-realtime-2025-09-15

中文（普通话）、英文

API参考
连接端点 (URL)
 
wss://dashscope.aliyuncs.com/api-ws/v1/inference
请求头 (Headers)




参数

类型

是否必选

说明

Authorization

string

是

鉴权令牌，格式为Bearer <your_api_key>，使用时，将“<your_api_key>”替换为实际的API Key。

user-agent

string

否

客户端标识，便于服务端追踪来源。

X-DashScope-WorkSpace

string

否

阿里云百炼业务空间ID。

X-DashScope-DataInspection

string

否

是否启用数据合规检测功能。默认不传或设为enable。如非必要，请勿启用该参数。

指令（客户端→服务端）
指令是客户端发送的JSON格式文本消息，用于控制识别任务的生命周期。

1. run-task指令：开启任务
目的：连接建立后，发送此指令以启动语音识别任务并配置相关参数。

示例：

 
{
    "header": {
        "action": "run-task",
        "task_id": "2bf83b9a-baeb-4fda-8d9a-xxxxxxxxxxxx",
        "streaming": "duplex"
    },
    "payload": {
        "task_group": "audio",
        "task": "asr",
        "function": "recognition",
        "model": "fun-asr-realtime",
        "parameters": {
            "format": "pcm",
            "sample_rate": 16000,
            "vocabulary_id": "vocab-xxx-24ee19fa8cfb4d52902170a0xxxxxxxx"
        },
        "input": {}
    }
}
header参数说明：





参数

类型

是否必选

说明

header.action

string

是

指令类型，固定为run-task。

header.task_id

string

是

任务的唯一标识。后续的finish-task指令需使用相同的task_id。

header.streaming

string

是

通信模式，固定为duplex。

payload参数说明：





参数

类型

是否必选

说明

payload.task_group

string

是

任务组，固定为audio。

payload.task

string

是

任务类型，固定为asr。

payload.function

string

是

功能类型，固定为recognition。

payload.model

string

是

指定要使用的模型。详情参见模型列表。

payload.input

object

是

输入配置，固定为空对象{}。

payload.parameters

format

string

是

音频格式。支持：pcm, wav, mp3, opus, speex, aac, amr。详细约束见音频流规范。

sample_rate

integer

是

音频采样率（Hz）。

fun-asr-realtime支持16000Hz采样。

vocabulary_id

string

否

热词ID。使用方法参见定制热词。

默认不设置。

semantic_punctuation_enabled

boolean

否

是否开启语义断句。

默认值：false。

true：使用语义断句。关闭 VAD（Voice Activity Detection，语音活动检测）断句。适合会议转写，准确度高。

false：使用 VAD 断句。关闭语义断句。适合交互场景，延迟低。

语义断句能更精准地识别句子边界。VAD 断句响应更快。通过调整 semantic_punctuation_enabled 参数，可在不同场景间灵活切换断句方式。

max_sentence_silence

integer

否

VAD静音时长阈值。在 VAD（Voice Activity Detection，语音活动检测）断句中，静音时长超过该阈值即判定句子结束。
单位：毫秒（ms）。

默认值：1300。

取值范围：[200, 6000]。

生效条件：仅在 semantic_punctuation_enabled 参数为 false（使用 VAD 断句）时有效。

multi_threshold_mode_enabled

boolean

否

是否开启防止 VAD 断句过长的功能。

默认值：false。

true：开启，限制 VAD（Voice Activity Detection，语音活动检测）断句长度，避免过长切割。

false：关闭。

生效条件：仅在 semantic_punctuation_enabled 为 false（使用 VAD 断句）时有效。

heartbeat

boolean

否

是否开启长连接保持开关。

默认值：false。

true：开启。在持续发送静音音频时，连接与服务端保持不中断。

false：关闭。即使持续发送静音音频，60 秒后连接因超时断开。

说明：

静音音频：音频文件或数据流中无声音信号的内容。

生成方式：可用音频编辑软件（如 Audacity、Adobe Audition），或命令行工具（如 FFmpeg）创建。

2. finish-task指令：结束任务
目的：客户端音频数据发送完毕后，发送此指令通知服务端。

示例：

 
{
    "header": {
        "action": "finish-task",
        "task_id": "2bf83b9a-baeb-4fda-8d9a-xxxxxxxxxxxx",
        "streaming": "duplex"
    },
    "payload": {
        "input": {}
    }
}
header参数说明：





参数

类型

是否必选

说明

header.action

string

是

指令类型，固定为finish-task。

header.task_id

string

是

任务ID，须与run-task指令中的task_id一致。

header.streaming

string

是

通信模式，固定为duplex。

payload参数说明：





参数

类型

是否必选

说明

payload.input

object

是

输入配置，固定为空对象{}。

事件（服务端→客户端）
事件是服务端发送的JSON格式文本消息，用于同步任务状态和识别结果。

1. task-started
触发时机：服务端成功处理run-task指令后。
作用：通知客户端任务已开启，可开始发送音频数据。

示例：

 
{
    "header": {
        "task_id": "2bf83b9a-baeb-4fda-8d9a-xxxxxxxxxxxx",
        "event": "task-started",
        "attributes": {}
    },
    "payload": {}
}
header参数说明：




参数

类型

说明

header.event

string

事件类型，固定为task-started。

header.task_id

string

任务ID。

2. result-generated
触发时机：识别过程中，服务端生成了新的识别结果时。
作用：返回实时识别结果，包括中间结果和最终句结果。

示例：

 
{
  "header": {
    "task_id": "2bf83b9a-baeb-4fda-8d9a-xxxxxxxxxxxx",
    "event": "result-generated",
    "attributes": {}
  },
  "payload": {
    "output": {
      "sentence": {
        "begin_time": 170,
        "end_time": 920,
        "text": "好，我知道了",
        "heartbeat": false,
        "sentence_end": true,
        "words": [
          {
            "begin_time": 170,
            "end_time": 295,
            "text": "好",
            "punctuation": "，"
          },
          {
            "begin_time": 295,
            "end_time": 503,
            "text": "我",
            "punctuation": ""
          },
          {
            "begin_time": 503,
            "end_time": 711,
            "text": "知道",
            "punctuation": ""
          },
          {
            "begin_time": 711,
            "end_time": 920,
            "text": "了",
            "punctuation": ""
          }
        ]
      }
    },
    "usage": {
      "duration": 3
    }
  }
}
header参数说明：




参数

类型

说明

header.event

string

事件类型，固定为result-generated。

header.task_id

string

任务ID。

payload参数说明：




参数

类型

说明

output

object

output.sentence为识别结果，详细内容见下文。

usage

object

当payload.output.sentence.sentence_end为false（当前句子未结束，参见payload.output.sentence参数说明）时，usage为null。

当payload.output.sentence.sentence_end为true（当前句子已结束，参见payload.output.sentence参数说明）时，usage.duration为当前任务计费时长（秒）。

payload.usage格式如下：




参数

类型

说明

duration

integer

任务计费时长（单位为秒）。

payload.output.sentence格式如下：




参数

类型

说明

begin_time

integer

句子开始时间，单位为ms。

end_time

integer | null

句子结束时间，单位为ms。如果为中间识别结果则为null。

text

string

识别出的文本内容。

words

array

字时间戳信息。

heartbeat

boolean | null

若该值为true，可跳过识别结果的处理。该值和run-task指令中的heartbeat保持一致。

sentence_end

boolean

判断给定句子是否已结束。

payload.output.sentence.words为字时间戳列表，其中每一个word格式如下：




参数

类型

说明

begin_time

integer

字开始时间，单位为ms。

end_time

integer

字结束时间，单位为ms。

text

string

识别出的字。

punctuation

string

标点。

3. task-finished
触发时机：服务端收到finish-task指令并处理完所有缓存的音频后。
作用：标志识别任务成功结束。

示例：

 
{
    "header": {
        "task_id": "2bf83b9a-baeb-4fda-8d9a-xxxxxxxxxxxx",
        "event": "task-finished",
        "attributes": {}
    },
    "payload": {
        "output": {}
    }
}
header参数说明：




参数

类型

说明

header.event

string

事件类型，固定为task-finished。

header.task_id

string

任务ID。

4. task-failed
触发时机：任务处理过程中发生任何错误时。
作用：通知客户端任务失败并提供错误原因。收到此事件后，需要关闭WebSocket连接并处理错误。

示例：

 
{
    "header": {
        "task_id": "2bf83b9a-baeb-4fda-8d9a-xxxxxxxxxxxx",
        "event": "task-failed",
        "error_code": "CLIENT_ERROR",
        "error_message": "request timeout after 23 seconds.",
        "attributes": {}
    },
    "payload": {}
}
header参数说明：




参数

类型

说明

header.event

string

事件类型，固定为task-failed。

header.task_id

string

任务ID。

header.error_code

string

报错类型描述。

header.error_message

string

具体报错原因。

关于建连开销和连接复用
WebSocket服务支持连接复用以提升资源的利用效率，避免建立连接开销。

服务端收到客户端发送的run-task指令后，将启动一个新的任务，客户端发送finish-task指令后，服务端在任务完成时返回task-finished事件以结束该任务。结束任务后WebSocket连接可以被复用，客户端重新发送run-task指令即可开启下一个任务。

重要
在复用连接中的不同任务需要使用不同 task_id。

如果在任务执行过程中发生失败，服务将返回task-failed事件，并关闭该连接。此时这个连接无法继续复用。

如果在任务结束后60秒没有新的任务，连接会超时自动断开。

错误码
如遇报错问题，请参见错误信息进行排查。

常见问题
功能特性
Q：在长时间静默的情况下，如何保持与服务端长连接？
将请求参数heartbeat设置为true，并持续向服务端发送静音音频。

说明：

静音音频：音频文件或数据流中无声音信号的内容。

生成方式：可用音频编辑软件（如 Audacity、Adobe Audition），或命令行工具（如 FFmpeg）创建。

Q：如何将音频格式转换为满足要求的格式？
可使用FFmpeg工具，更多用法请参见FFmpeg官网。

 
# 基础转换命令（万能模板）
# -i，作用：输入文件路径，常用值示例：audio.wav
# -c:a，作用：音频编码器，常用值示例：aac, libmp3lame, pcm_s16le
# -b:a，作用：比特率（音质控制），常用值示例：192k, 320k
# -ar，作用：采样率
# -ac，作用：声道数，常用值示例：1(单声道), 2(立体声)
# -y，作用：覆盖已存在文件(无需值)
ffmpeg -i input_audio.ext -c:a 编码器名 -b:a 比特率 -ar 采样率 -ac 声道数 output.ext

# 例如：WAV → MP3（保持原始质量）
ffmpeg -i input.wav -c:a libmp3lame -q:a 0 output.mp3
# 例如：MP3 → WAV（16bit PCM标准格式）
ffmpeg -i input.mp3 -c:a pcm_s16le -ar 16000 -ac 2 output.wav
# 例如：M4A → AAC（提取/转换苹果音频）
ffmpeg -i input.m4a -c:a copy output.aac  # 直接提取不重编码
ffmpeg -i input.m4a -c:a aac -b:a 256k output.aac  # 重编码提高质量
# 例如：FLAC无损 → Opus（高压缩）
ffmpeg -i input.flac -c:a libopus -b:a 128k -vbr on output.opus
Q：为什么使用WebSocket协议而非HTTP/HTTPS协议？为什么不提供RESTful API？
语音服务选择 WebSocket 而非 HTTP/HTTPS/RESTful，根本在于其依赖全双工通信能力——WebSocket 允许服务端与客户端主动双向传输数据（如实时推送语音合成/识别进度），而基于 HTTP 的 RESTful 仅支持客户端发起的单向请求-响应模式，无法满足实时交互需求。

故障排查
如遇代码报错问题，请根据错误码中的信息进行排查。

Q：无法识别语音（无识别结果）是什么原因？
请检查请求参数中的音频格式（format）和采样率（sample_rate）设置是否正确且符合参数约束。以下为常见错误示例：

音频文件扩展名为 .wav，但实际为 MP3 格式，而请求参数 format 设置为 mp3（参数设置错误）。

音频采样率为 3600Hz，但请求参数 sample_rate 设置为 48000（参数设置错误）。

可以使用ffprobe工具获取音频的容器、编码、采样率、声道等信息：

 
ffprobe -v error -show_entries format=format_name -show_entries stream=codec_name,sample_rate,channels -of default=noprint_wrappers=1 input.xxx
若以上检查无问题，可通过定制热词提升对特定词语的识别效果。