class Currency {

  static Get(data, defaultValue=null) {
    if ((data !== null && !isNaN(data))) { 

      return parseFloat(data).toFixed(2);
    } else {
      return defaultValue;
    }
  }
  static GetDifferenceInPercentage = (data1, data2) => {
    if (data1 && data2) {
      const diff = (data1 - data2) / data2 * 100;
      return Math.round(diff)
    } else {
      return "0";
    }
  };

  static CalculateProfitPercentage = (data1, data2) => {
    if (data1 && data2) {

      const profitPercentage = (data1 / data2) * 100;
      return Math.round(profitPercentage);
    } else {
      return "0";
    }
  }
  static IndianFormat = (value) => {
    if ((typeof value === 'number' && !isNaN(value)) || (typeof value === 'string' && !isNaN(Number(value)) && value.trim() !== '')) {
      let amount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);
      return amount.split(',').join('');
    } else {
      return '0.00';
    }
  };

  static GetFormatted(value, locale) {
    const formattedValue = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value, locale);
    if (!formattedValue) {
      return "";
    }
    return `${formattedValue}`;
  }
  
  static GetFormattedCurrency(value, locale) {
    const formattedValue = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(value, locale);
    if (!formattedValue) {
      return "";
    }
    return `${formattedValue}`;
  }
  static calculateDailySalary(monthlySalary, daysInMonth) {
    if(monthlySalary && daysInMonth){
        let value = monthlySalary / daysInMonth
      return value.toFixed(2);
    }
}

}
module.exports = Currency;
