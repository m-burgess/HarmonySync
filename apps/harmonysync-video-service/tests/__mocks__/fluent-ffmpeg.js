// Manual mock for fluent-ffmpeg used in tests
module.exports = function (input) {
  const handlers = {};
  const command = {
    videoCodec: () => command,
    audioCodec: () => command,
    audioBitrate: () => command,
    videoFilters: () => command,
    outputOptions: () => command,
    on: (ev, cb) => {
      handlers[ev] = cb;
      return command;
    },
    save: (output) => {
      process.nextTick(() => {
        if (handlers['progress']) handlers['progress']({ timemark: '00:00:02' });
        if (handlers['end']) handlers['end']();
      });
      return command;
    },
    screenshots: (opts) => {
      process.nextTick(() => {
        if (handlers['end']) handlers['end']();
      });
      return command;
    },
    kill: () => {}
  };

  return command;
};

module.exports.ffprobe = function (input, cb) {
  const metadata = {
    format: { duration: 10, format_name: 'mp4', bit_rate: '4000', size: '2048' },
    streams: [
      { codec_type: 'video', width: 1280, height: 720, codec_name: 'h264', r_frame_rate: '30/1' },
      { codec_type: 'audio', codec_name: 'aac' }
    ]
  };
  process.nextTick(() => cb(null, metadata));
};
