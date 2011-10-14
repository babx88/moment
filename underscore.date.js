// Underscore.date
//
// (c) 2011 Tim Wood
// Underscore.date is freely distributable under the terms of the MIT license.
//
// Version 0.6.1

(function (Date, undefined) {

    var _date,
        round = Math.round,
        languages = {},
        isNode = (typeof window === 'undefined' && typeof module !== 'undefined'),
        paramsToParse = 'months|monthsShort|weekdays|weekdaysShort|relativeTime|ordinal'.split('|'),
        i,
        shortcuts = 'Month|Date|Hours|Minutes|Seconds'.split('|');

    // left zero fill a number
    // see http://jsperf.com/left-zero-filling for performance comparison
    function leftZeroFill(number, targetLength) {
        var output = number + '';
        while (output.length < targetLength) {
            output = '0' + output;
        }
        return output;
    }

    // helper function for _.addTime and _.subtractTime
    function dateAddRemove(date, _input, adding, val) {
        var isString = (typeof _input === 'string'),
            input = isString ? {} : _input,
            ms, M, currentDate;
        if (isString && val) {
            input[_input] = val;
        }
        ms = (input.ms || input.milliseconds || 0) +
            (input.s || input.seconds || 0) * 1e3 + // 1000
            (input.m || input.minutes || 0) * 6e4 + // 1000 * 60
            (input.h || input.hours || 0) * 36e5 + // 1000 * 60 * 60
            (input.d || input.days || 0) * 864e5 + // 1000 * 60 * 60 * 24
            (input.w || input.weeks || 0) * 6048e5; // 1000 * 60 * 60 * 24 * 7
        M = (input.M || input.months || 0) +
            (input.y || input.years || 0) * 12;
        if (ms) {
            date.setMilliseconds(date.getMilliseconds() + ms * adding);
        }
        if (M) {
            currentDate = date.getDate();
            date.setDate(1);
            date.setMonth(date.getMonth() + M * adding);
            date.setDate(Math.min(new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(), currentDate));
        }
        return date;
    }

    // check if is an array
    function isArray(input) {
        return Object.prototype.toString.call(input) === '[object Array]';
    }

    // convert an array to a date.
    // the array should mirror the parameters below
    // note: all values past the year are optional and will default to the lowest possible value.
    // [year, month, day , hour, minute, second, millisecond]
    function dateFromArray(input) {
        return new Date(input[0], input[1] || 0, input[2] || 1, input[3] || 0, input[4] || 0, input[5] || 0, input[6] || 0);
    }

    // format date using native date object
    function formatDate(date, inputString) {
        var currentMonth = date.getMonth(),
            currentDate = date.getDate(),
            currentYear = date.getFullYear(),
            currentDay = date.getDay(),
            currentHours = date.getHours(),
            currentMinutes = date.getMinutes(),
            currentSeconds = date.getSeconds(),
            charactersToReplace = /(\\)?(Mo|MM?M?M?|Do|DDDo|DD?D?D?|dddd?|do?|w[o|w]?|YYYY|YY|a|A|hh?|HH?|mm?|ss?|zz?)/g,
            nonuppercaseLetters = /[^A-Z]/g,
            timezoneRegex = /\([A-Za-z ]+\)|:[0-9]{2} [A-Z]{3} /g;
        // check if the character is a format
        // return formatted string or non string.
        //
        // uses switch/case instead of an object of named functions (like http://phpjs.org/functions/date:380)
        // for minification and performance
        // see http://jsperf.com/object-of-functions-vs-switch for performance comparison
        function replaceFunction(input) {
            // create a couple variables to be used later inside one of the cases.
            var a, b;
            switch (input) {
                // MONTH
            case 'M' :
                return currentMonth + 1;
            case 'Mo' :
                return (currentMonth + 1) + _date.ordinal(currentMonth + 1);
            case 'MM' :
                return leftZeroFill(currentMonth + 1, 2);
            case 'MMM' :
                return _date.monthsShort[currentMonth];
            case 'MMMM' :
                return _date.months[currentMonth];
            // DAY OF MONTH
            case 'D' :
                return currentDate;
            case 'Do' :
                return currentDate + _date.ordinal(currentDate);
            case 'DD' :
                return leftZeroFill(currentDate, 2);
            // DAY OF YEAR
            case 'DDD' :
                a = new Date(currentYear, currentMonth, currentDate);
                b = new Date(currentYear, 0, 1);
                return ~~ (((a - b) / 864e5) + 1.5);
            case 'DDDo' :
                a = replaceFunction('DDD');
                return a + _date.ordinal(a);
            case 'DDDD' :
                return leftZeroFill(replaceFunction('DDD'), 3);
            // WEEKDAY
            case 'd' :
                return currentDay;
            case 'do' :
                return currentDay + _date.ordinal(currentDay);
            case 'ddd' :
                return _date.weekdaysShort[currentDay];
            case 'dddd' :
                return _date.weekdays[currentDay];
            // WEEK OF YEAR
            case 'w' :
                a = new Date(currentYear, currentMonth, currentDate - currentDay + 5);
                b = new Date(a.getFullYear(), 0, 4);
                return ~~ ((a - b) / 864e5 / 7 + 1.5);
            case 'wo' :
                a = replaceFunction('w');
                return a + _date.ordinal(a);
            case 'ww' :
                return leftZeroFill(replaceFunction('w'), 2);
            // YEAR
            case 'YY' :
                return (currentYear + '').slice(-2);
            case 'YYYY' :
                return currentYear;
            // AM / PM
            case 'a' :
                return currentHours > 11 ? 'pm' : 'am';
            case 'A' :
                return currentHours > 11 ? 'PM' : 'AM';
            // 24 HOUR
            case 'H' :
                return currentHours;
            case 'HH' :
                return leftZeroFill(currentHours, 2);
            // 12 HOUR
            case 'h' :
                return currentHours % 12 || 12;
            case 'hh' :
                return leftZeroFill(currentHours % 12 || 12, 2);
            // MINUTE
            case 'm' :
                return currentMinutes;
            case 'mm' :
                return leftZeroFill(currentMinutes, 2);
            // SECOND
            case 's' :
                return currentSeconds;
            case 'ss' :
                return leftZeroFill(currentSeconds, 2);
            // TIMEZONE
            case 'zz' :
                // depreciating 'zz' fall through to 'z'
            case 'z' :
                return (date.toString().match(timezoneRegex) || [''])[0].replace(nonuppercaseLetters, '');
            // DEFAULT
            default :
                return input.replace("\\", "");
            }
        }
        return inputString.replace(charactersToReplace, replaceFunction);
    }

    // date from string and format string
    function makeDateFromStringAndFormat(string, format) {
        var inArray = [0],
            charactersToPutInArray = /[0-9a-zA-Z]+/g,
            inputParts = string.match(charactersToPutInArray),
            formatParts = format.match(charactersToPutInArray),
            i,
            isPm;

        // function to convert string input to date
        function addTime(format, input) {
            switch (format) {
            // MONTH
            case 'M' :
                // fall through to MM
            case 'MM' :
                inArray[1] = ~~input - 1;
                break;
            // DAY OF MONTH
            case 'D' :
                // fall through to DDDD
            case 'DD' :
                // fall through to DDDD
            case 'DDD' :
                // fall through to DDDD
            case 'DDDD' :
                inArray[2] = ~~input;
                break;
            // YEAR
            case 'YY' :
                input = ~~input;
                inArray[0] = input + (input > 70 ? 1900 : 2000);
                break;
            case 'YYYY' :
                inArray[0] = ~~input;
                break;
            // AM / PM
            case 'a' :
                // fall through to A
            case 'A' :
                isPm = (input.toLowerCase() === 'pm');
                break;
            // 24 HOUR
            case 'H' :
                // fall through to hh
            case 'HH' :
                // fall through to hh
            case 'h' :
                // fall through to hh
            case 'hh' :
                inArray[3] = ~~input;
                break;
            // MINUTE
            case 'm' :
                // fall through to mm
            case 'mm' :
                inArray[4] = ~~input;
                break;
            // SECOND
            case 's' :
                // fall through to ss
            case 'ss' :
                inArray[5] = ~~input;
                break;
            }
        }
        for (i = 0; i < formatParts.length; i++) {
            addTime(formatParts[i], inputParts[i]);
        }
        // handle am pm
        if (isPm && inArray[3] < 12) {
            inArray[3] += 12;
        }
        return dateFromArray(inArray);
    }

    // compare two arrays, return the number of differences
    function compareArrays(array1, array2) {
        var len = Math.min(array1.length, array2.length),
            lengthDiff = Math.abs(array1.length - array2.length),
            diffs = 0,
            i;
        for (i = 0; i < len; i++) {
            if (~~array1[i] !== ~~array2[i]) {
                diffs++;
            }
        }
        return diffs + lengthDiff;
    }

    // date from string and array of format strings
    function makeDateFromStringAndArray(string, formats) {
        var output,
            charactersToPutInArray = /[0-9a-zA-Z]+/g,
            inputParts = string.match(charactersToPutInArray),
            scores = [],
            scoreToBeat = 99,
            i,
            curDate,
            curScore;
        for (i = 0; i < formats.length; i++) {
            curDate = makeDateFromStringAndFormat(string, formats[i]);
            curScore = compareArrays(inputParts, formatDate(curDate, formats[i]).match(charactersToPutInArray));
            if (curScore < scoreToBeat) {
                scoreToBeat = curScore;
                output = curDate;
            }
        }
        return output;
    }

    // UnderscoreDate prototype object
    function UnderscoreDate(input, format) {
        // parse UnderscoreDate object
        if (input && input._d instanceof Date) {
            this._d = input._d;
        // parse string and format
        } else if (format) {
            if (isArray(format)) {
                this._d = makeDateFromStringAndArray(input, format);
            } else {
                this._d = makeDateFromStringAndFormat(input, format);
            }
        // parse everything else
        } else {
            this._d = input === undefined ? new Date() :
                input instanceof Date ? input :
                isArray(input) ? dateFromArray(input) :
                new Date(input);
        }
    }

    _date = function (input, format) {
        return new UnderscoreDate(input, format);
    };

    // language switching and caching
    _date.lang = function (key, values) {
        var i, param, req;
        if (values) {
            languages[key] = values;
        }
        if (languages[key]) {
            for (i = 0; i < paramsToParse.length; i++) {
                param = paramsToParse[i];
                _date[param] = languages[key][param] || _date[param];
            }
        } else {
            if (isNode) {
                req = require('./lang/' + key);
                _date.lang(key, req);
            }
        }
    };

    // set default language
    _date.lang('en', {
        months : "January_February_March_April_May_June_July_August_September_October_November_December".split("_"),
        monthsShort : "Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec".split("_"),
        weekdays : "Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),
        weekdaysShort : "Sun_Mon_Tue_Wed_Thu_Fri_Sat".split("_"),
        relativeTime : {
            future : "in %s",
            past : "%s ago",
            s : "seconds",
            m : "a minute",
            mm : "%d minutes",
            h : "an hour",
            hh : "%d hours",
            d : "a day",
            dd : "%d days",
            M : "a month",
            MM : "%d months",
            y : "a year",
            yy : "%d years"
        },
        ordinal : function (number) {
            var b = number % 10;
            return (~~ (number % 100 / 10) === 1) ? 'th' :
                (b === 1) ? 'st' :
                (b === 2) ? 'nd' :
                (b === 3) ? 'rd' : 'th';
        }
    });

    // helper function for _date.from() and _date.fromNow()
    function substituteTimeAgo(string, number) {
        return _date.relativeTime[string].replace(/%d/i, number || 1);
    }

    function relativeTime(milliseconds) {
        var seconds = Math.abs(milliseconds) / 1000,
            minutes = seconds / 60,
            hours = minutes / 60,
            days = hours / 24,
            years = days / 365;
        return seconds < 45 && substituteTimeAgo('s', round(seconds)) ||
            round(minutes) === 1 && substituteTimeAgo('m') ||
            minutes < 45 && substituteTimeAgo('mm', round(minutes)) ||
            round(hours) === 1 && substituteTimeAgo('h') ||
            hours < 22 && substituteTimeAgo('hh', round(hours)) ||
            round(days) === 1 && substituteTimeAgo('d') ||
            days < 25 && substituteTimeAgo('dd', round(days)) ||
            days < 45 && substituteTimeAgo('M') ||
            days < 345 && substituteTimeAgo('MM', round(days / 30)) ||
            round(years) === 1 && substituteTimeAgo('y') ||
            substituteTimeAgo('yy', round(years));
    }

    // shortcut for prototype
    _date.fn = UnderscoreDate.prototype = {

        valueOf : function () {
            return +this._d;
        },

        format : function (inputString) {
            return formatDate(this._d, inputString);
        },

        add : function (input, val) {
            this._d = dateAddRemove(this._d, input, 1, val);
            return this;
        },

        subtract : function (input, val) {
            this._d = dateAddRemove(this._d, input, -1, val);
            return this;
        },

        diff : function (input, format) {
            return this._d - _date(input, format)._d;
        },

        from : function (time, withoutSuffix) {
            var difference = this.diff(time),
                string = difference < 0 ? _date.relativeTime.past : _date.relativeTime.future,
                output = relativeTime(difference);
            return withoutSuffix ? output : string.replace(/%s/i, output);
        },

        fromNow : function (withoutSuffix) {
            return this.from(new UnderscoreDate(), withoutSuffix);
        },

        isLeapYear : function () {
            var year = this._d.getFullYear();
            return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
        }
    };

    // helper for adding shortcuts
    function makeShortcut(name, key) {
        _date.fn[name] = function (input) {
            if (input) {
                this._d['set' + key](input);
                return this;
            } else {
                return this._d['get' + key]();
            }
        };
    }

    // loop through and add shortcuts
    for (i = 0; i < shortcuts.length; i ++) {
        makeShortcut(shortcuts[i].toLowerCase(), shortcuts[i]);
    }

    // add shortcut for year (uses different syntax than the getter/setter 'year' == 'FullYear')
    makeShortcut('year', 'FullYear');

    // add shortcut for day (no setter)
    _date.fn.day = function () {
        return this._d.getDay();
    };

    // CommonJS module is defined
    if (isNode) {
        module.exports = _date;
    } else {
        // Integrate with Underscore.js if it exists
        if (this._ !== undefined && this._.mixin !== undefined) {
            this._.mixin({date : _date});
        }
        this._date = _date;
    }

})(Date);