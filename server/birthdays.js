const config = require("../config");
const { trigger_sync } = require("../hooks");

function birthdaySortvalue(birthdayA, birthdayB) {
  if (birthdayA.month < birthdayB.month) return -1;
  if (birthdayA.month === birthdayB.month) {
    if (birthdayA.day < birthdayB.day) return -1;
    if (birthdayA.day === birthdayB.day) return 0;
  }
  return 1;
}

function mergeBirthdays() {
  config.BIRTHDAYS = config.BIRTHDAYS.reduce((acc, birthdayB) => {
    if (acc.length === 0) {
      acc.push(birthdayB);
      return acc;
    }
    const birthdayA = acc[acc.length - 1];
    if (birthdaySortvalue(birthdayA, birthdayB) !== 0) {
      acc.push(birthdayB);
    } else {
      const alreadyMerged = birthdayA.display.includes(" and ");
      birthdayA.display = birthdayA.display.replace(/(,? and )/, ", ");
      birthdayA.display += `${alreadyMerged ? "," : ""} and ${
        birthdayB.display
      }`;
    }
    return acc;
  }, []);
}

function checkForBirthday() {
  if (config.BIRTHDAYS.length === 0) {
    config.BIRTHDAY = false;
    return;
  }
  const previousBirthday = config.BIRTHDAY;
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  let shiftCounter = 0;
  while (birthdaySortvalue({ month, day }, config.BIRTHDAYS[0]) > 0) {
    if (
      config.BIRTHDAYS.length === 1 ||
      config.BIRTHDAYS.length === shiftCounter
    )
      break;
    const birthdayA = config.BIRTHDAYS.shift();
    config.BIRTHDAYS.push(birthdayA);
    shiftCounter++;
  }
  if (birthdaySortvalue({ month, day }, config.BIRTHDAYS[0]) === 0) {
    config.BIRTHDAY = config.BIRTHDAYS[0].display;
  } else {
    config.BIRTHDAY = false;
  }
  scheduleNextBirthdayCheck(now);
  if (previousBirthday !== config.BIRTHDAY) {
    //trigger config reload
    trigger_sync("changeBD", config.BIRTHDAY);
    trigger_sync("reloadHot");
  }
}

function scheduleNextBirthdayCheck(now) {
  //Check at midnight
  let next = new Date(now);
  next.setHours(0);
  next.setMinutes(0);
  next.setTime(next.getTime() + 24 * 60 * 60 * 1000);
  let difference = next - now;
  setTimeout(checkForBirthday, difference);
}

function startUp() {
  if (!config.BIRTHDAYS || !Array.isArray(config.BIRTHDAYS))
    config.BIRTHDAYS = [];
  config.BIRTHDAYS.sort(birthdaySortvalue);
  mergeBirthdays();
  checkForBirthday();
}

startUp();
