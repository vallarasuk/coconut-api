class PhoneNumber {
  static Get(data, defaultValue = null) {
    return data !== '' ? data?.replace(/[^0-9]/g, '') : defaultValue;
  }
}

module.exports = PhoneNumber;
