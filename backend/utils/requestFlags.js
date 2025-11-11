const TRUE_VALUES = new Set([
  'true',
  '1',
  'yes',
  'y',
  'on',
  'enabled',
  'enable',
  'dry-run',
  'dryrun',
  'preview',
  'validate'
]);

const FALSE_VALUES = new Set(['false', '0', 'no', 'n', 'off', 'disabled', 'disable']);

const parseBooleanFlag = (value) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  if (value === null || value === undefined) {
    return false;
  }

  const normalised = value.toString().trim().toLowerCase();
  if (normalised.length === 0) {
    return false;
  }

  if (TRUE_VALUES.has(normalised)) {
    return true;
  }

  if (FALSE_VALUES.has(normalised)) {
    return false;
  }

  return false;
};

module.exports = {
  parseBooleanFlag
};
