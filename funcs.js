const findNearestCities = require("find-nearest-cities");
const adhan = require("adhan");
const _ = require("lodash");
const data = require("./data.json");
const fs = require("fs");

let callback = null;
let timeouts = {};

exports.getTimeouts = () => timeouts;

exports.setTimeoutCallback = (callback) => {
  if (callback instanceof Function) callback = callback;
  else throw new Error("Callback must be a function");
};

exports.channelExists = (channelId) => {
  const index = data.locations.findIndex((loc) => loc.channels.includes(channelId));
  if (index !== -1) return data.locations[index];
};

exports.removeChannel = (channelId) => {
  const index = data.locations.findIndex((loc) => loc.channels.includes(channelId));
  const location = data.locations[index];
  if (index != -1) {
    _.pull(location.channels, channelId);
    if (location.channels.length === 0) {
      clearTimeout(timeouts[data.locations[index].id]);
      removeDestroyedTimeouts()
      console.log(timeouts);
      _.pullAt(data.locations, index);
    }
    fs.writeFileSync("./data.json", JSON.stringify(data));
    return true;
  }
  return false;
};
exports.addChannel = (channelId, channelLat, channelLong) => {
  const { lat, lon, id, name, country } = findNearestCities(channelLat, channelLong, 5 * 10 ** 4, 10)
    .sort((a, b) => a.population - b.population)
    .pop();
  const long = lon;
  let index = _.findIndex(
    data.locations.map((loc) => loc.coord),
    (coord) => coord.lat === lat && coord.long === long
  );
  if (index === -1) {
    data.locations.push({ coord: { lat, long }, id: id, name: `${name}, ${country}`, channels: [channelId] });
    index = data.locations.length - 1;
    setNextPrayerTimeout(data.locations[index].id);
  } else {
    data.locations[index].channels.push(channelId);
  }
  fs.writeFileSync("./data.json", JSON.stringify(data));
  return data.locations[index];
};

function removeDestroyedTimeouts() {
  Object.keys(timeouts).forEach((key) => {
    if (timeouts[key]._destroyed) delete timeouts[key];
  });
}
function setNextPrayerTimeout(locId) {
  const loc = data.locations.find((loc) => loc.id === locId);
  const nextPrayer = getNextPrayerTimeDiff(loc.coord.lat, loc.coord.long, new Date());
  timeouts[locId] = setTimeout(() => {
    callback(loc.id);
  }, nextPrayer.diff);
  loc.nextPrayerName = nextPrayer.prayer;
}

exports.setNextPrayerTimeouts = () => {
  data.locations.forEach((loc) => {
    console.log(`Setting Timeout for Location ${loc.name}`)
    setNextPrayerTimeout(loc.id);
  });
};

exports.sendNotification = (locId, api) => {
  const loc = data.locations.find((loc) => loc.id === locId);
  if (loc !== undefined) {
    loc.channels.forEach((channelId) => {
      api.sendText(channelId, `${loc.nextPrayerName} time`);
    });
  }
};

function getPrayerTimeDiffs(lat, long, date) {
  const prayerTimes = new adhan.PrayerTimes(new adhan.Coordinates(lat, long), date, adhan.CalculationMethod.Egyptian());
  const { fajr, dhuhr, asr, maghrib, isha } = prayerTimes;
  console.log({ fajr, dhuhr, asr, maghrib, isha });
  const currentTime = new Date();
  return _.mapValues({ fajr, dhuhr, asr, maghrib, isha }, (time) => time - currentTime);
}

function getNextPrayerTimeDiff(lat, long) {
  let timeDiffs = getPrayerTimeDiffs(lat, long, new Date());

  let afterIsha = true;
  Object.keys(timeDiffs).forEach((key) => {
    if (timeDiffs[key] > 0) afterIsha = false;
  });

  if (afterIsha === true) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    timeDiffs = getPrayerTimeDiffs(lat, long, tomorrow);
  }

  // get the time of the Prayer with smallest difference
  const sortedDiffs = Object.entries(timeDiffs).sort((a, b) => a[1] - b[1]);

  const nextPrayerTimeDiff = sortedDiffs.filter((diff) => diff[1] > 0)[0];
  return {
    prayer: nextPrayerTimeDiff[0],
    diff: nextPrayerTimeDiff[1],
  };
}
