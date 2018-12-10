const defaultSleepTime = Math.floor(Math.random() * 1000) + 1000; // between 1 and 2 seconds

function sleep (ms = defaultSleepTime) {
  return new Promise(resolve => {
    setTimeout(resolve,ms)
  });
}

module.exports = { sleep };