/** necessary functions from the deprecated phpjs package */

function wordwrap(str, intWidth, strBreak, cut) {
    //  discuss at: http://locutus.io/php/wordwrap/
    // original by: Jonas Raoni Soares Silva (http://www.jsfromhell.com)
    // improved by: Nick Callen
    // improved by: Kevin van Zonneveld (http://kvz.io)
    // improved by: Sakimori
    //  revised by: Jonas Raoni Soares Silva (http://www.jsfromhell.com)
    // bugfixed by: Michael Grier
    // bugfixed by: Feras ALHAEK
    // improved by: Rafał Kukawski (http://kukawski.net)
    //   example 1: wordwrap('Kevin van Zonneveld', 6, '|', true)
    //   returns 1: 'Kevin|van|Zonnev|eld'
    //   example 2: wordwrap('The quick brown fox jumped over the lazy dog.', 20, '<br />\n')
    //   returns 2: 'The quick brown fox<br />\njumped over the lazy<br />\ndog.'
    //   example 3: wordwrap('Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.')
    //   returns 3: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod\ntempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim\nveniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea\ncommodo consequat.'

    intWidth = arguments.length >= 2 ? +intWidth : 75;
    strBreak = arguments.length >= 3 ? '' + strBreak : '\n';
    cut = arguments.length >= 4 ? !!cut : false;

    var i, j, line;

    str += '';

    if (intWidth < 1) {
        return str;
    }

    var reLineBreaks = /\r\n|\n|\r/;
    var reBeginningUntilFirstWhitespace = /^\S*/;
    var reLastCharsWithOptionalTrailingWhitespace = /\S*(\s)?$/;

    var lines = str.split(reLineBreaks);
    var l = lines.length;
    var match;

    // for each line of text
    for (i = 0; i < l; lines[i++] += line) {
        line = lines[i];
        lines[i] = '';

        while (line.length > intWidth) {
            // get slice of length one char above limit
            var slice = line.slice(0, intWidth + 1);

            // remove leading whitespace from rest of line to parse
            var ltrim = 0;
            // remove trailing whitespace from new line content
            var rtrim = 0;

            match = slice.match(reLastCharsWithOptionalTrailingWhitespace);

            // if the slice ends with whitespace
            if (match[1]) {
                // then perfect moment to cut the line
                j = intWidth;
                ltrim = 1;
            } else {
                // otherwise cut at previous whitespace
                j = slice.length - match[0].length;

                if (j) {
                    rtrim = 1;
                }

                // but if there is no previous whitespace
                // and cut is forced
                // cut just at the defined limit
                if (!j && cut && intWidth) {
                    j = intWidth;
                }

                // if cut wasn't forced
                // cut at next possible whitespace after the limit
                if (!j) {
                    var charsUntilNextWhitespace = (line.slice(intWidth).match(reBeginningUntilFirstWhitespace) || [''])[0];

                    j = slice.length + charsUntilNextWhitespace.length;
                }
            }

            lines[i] += line.slice(0, j - rtrim);
            line = line.slice(j + ltrim);
            lines[i] += line.length ? strBreak : '';
        }
    }

    return lines.join('\n');
}
//# sourceMappingURL=wordwrap.js.map

function nl2br(str, isXhtml) {
    //  discuss at: http://locutus.io/php/nl2br/
    // original by: Kevin van Zonneveld (http://kvz.io)
    // improved by: Philip Peterson
    // improved by: Onno Marsman (https://twitter.com/onnomarsman)
    // improved by: Atli Þór
    // improved by: Brett Zamir (http://brett-zamir.me)
    // improved by: Maximusya
    // bugfixed by: Onno Marsman (https://twitter.com/onnomarsman)
    // bugfixed by: Kevin van Zonneveld (http://kvz.io)
    // bugfixed by: Reynier de la Rosa (http://scriptinside.blogspot.com.es/)
    //    input by: Brett Zamir (http://brett-zamir.me)
    //   example 1: nl2br('Kevin\nvan\nZonneveld')
    //   returns 1: 'Kevin<br />\nvan<br />\nZonneveld'
    //   example 2: nl2br("\nOne\nTwo\n\nThree\n", false)
    //   returns 2: '<br>\nOne<br>\nTwo<br>\n<br>\nThree<br>\n'
    //   example 3: nl2br("\nOne\nTwo\n\nThree\n", true)
    //   returns 3: '<br />\nOne<br />\nTwo<br />\n<br />\nThree<br />\n'
    //   example 4: nl2br(null)
    //   returns 4: ''

    // Some latest browsers when str is null return and unexpected null value
    if (typeof str === 'undefined' || str === null) {
        return '';
    }

    // Adjust comment to avoid issue on locutus.io display
    var breakTag = isXhtml || typeof isXhtml === 'undefined' ? '<br ' + '/>' : '<br>';

    return (str + '').replace(/(\r\n|\n\r|\r|\n)/g, breakTag + '$1');
}
//# sourceMappingURL=nl2br.js.map

function strip_tags(input, allowed) {
    // eslint-disable-line camelcase
    //  discuss at: http://locutus.io/php/strip_tags/
    // original by: Kevin van Zonneveld (http://kvz.io)
    // improved by: Luke Godfrey
    // improved by: Kevin van Zonneveld (http://kvz.io)
    //    input by: Pul
    //    input by: Alex
    //    input by: Marc Palau
    //    input by: Brett Zamir (http://brett-zamir.me)
    //    input by: Bobby Drake
    //    input by: Evertjan Garretsen
    // bugfixed by: Kevin van Zonneveld (http://kvz.io)
    // bugfixed by: Onno Marsman (https://twitter.com/onnomarsman)
    // bugfixed by: Kevin van Zonneveld (http://kvz.io)
    // bugfixed by: Kevin van Zonneveld (http://kvz.io)
    // bugfixed by: Eric Nagel
    // bugfixed by: Kevin van Zonneveld (http://kvz.io)
    // bugfixed by: Tomasz Wesolowski
    //  revised by: Rafał Kukawski (http://blog.kukawski.pl)
    //   example 1: strip_tags('<p>Kevin</p> <br /><b>van</b> <i>Zonneveld</i>', '<i><b>')
    //   returns 1: 'Kevin <b>van</b> <i>Zonneveld</i>'
    //   example 2: strip_tags('<p>Kevin <img src="someimage.png" onmouseover="someFunction()">van <i>Zonneveld</i></p>', '<p>')
    //   returns 2: '<p>Kevin van Zonneveld</p>'
    //   example 3: strip_tags("<a href='http://kvz.io'>Kevin van Zonneveld</a>", "<a>")
    //   returns 3: "<a href='http://kvz.io'>Kevin van Zonneveld</a>"
    //   example 4: strip_tags('1 < 5 5 > 1')
    //   returns 4: '1 < 5 5 > 1'
    //   example 5: strip_tags('1 <br/> 1')
    //   returns 5: '1  1'
    //   example 6: strip_tags('1 <br/> 1', '<br>')
    //   returns 6: '1 <br/> 1'
    //   example 7: strip_tags('1 <br/> 1', '<br><br/>')
    //   returns 7: '1 <br/> 1'

    // making sure the allowed arg is a string containing only tags in lowercase (<a><b><c>)
    allowed = (((allowed || '') + '').toLowerCase().match(/<[a-z][a-z0-9]*>/g) || []).join('');

    var tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
    var commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;

    return input.replace(commentsAndPhpTags, '').replace(tags, function ($0, $1) {
        return allowed.indexOf('<' + $1.toLowerCase() + '>') > -1 ? $0 : '';
    });
}
//# sourceMappingURL=strip_tags.js.map
