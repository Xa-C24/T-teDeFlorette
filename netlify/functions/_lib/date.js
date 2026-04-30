const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateString(value) {
  if (!DATE_REGEX.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

module.exports = {
  isValidDateString,
};
