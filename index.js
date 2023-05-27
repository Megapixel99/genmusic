const musicEngine = require('./MusicEngine.js');

let length = 60; // 1 hour

// this makes 10 wav files, all of which are 1 hour long

Promise.all([
  musicEngine('output0.wav', length),
  musicEngine('output1.wav', length),
  musicEngine('output2.wav', length),
  musicEngine('output3.wav', length),
  musicEngine('output4.wav', length),
  musicEngine('output5.wav', length),
  musicEngine('output6.wav', length),
  musicEngine('output7.wav', length),
  musicEngine('output8.wav', length),
  musicEngine('output9.wav', length),
]).then(() => {
  console.log('done');
})
