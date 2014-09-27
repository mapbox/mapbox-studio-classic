// Codemirror add-on that displays CSS color palette, by putting
// bookmarks next to color values with a background matching the
// value.

// function initializePicker(el, currentColor) {
//   $(el).spectrum({
//       color: currentColor,
//       preferredFormat: "hex",
//       showPallete: true,
//       showInitial: true,
//       change: function(color) {
//         $(el).parent().next().text(color);
//       }
//     });
// };

// $('.cm-palette-hint').each(function(i,el) {
//   var currentColor = $(el).css('background-color');
//   initializePicker(el,currentColor);
// });

(function () {

    var PALETTE_TOKEN = 'palette';
    var COLOR_PATTERN = /#[a-f0-9]{6}\b|#[a-f0-9]{3}\b|\brgb\(\s*(?:[0-9]{1,2}|1[0-9]{2}|2[0-4][0-9]|25[0-5])\b\s*,\s*(?:[0-9]{1,2}|1[0-9]{2}|2[0-4][0-9]|25[0-5])\b\s*,\s*(?:[0-9]{1,2}|1[0-9]{2}|2[0-4][0-9]|25[0-5])\b\s*\)|\brgb\(\s*(?:[0-9]{1,2}%|100%)\s*,\s*(?:[0-9]{1,2}%|100%)\s*,\s*(?:[0-9]{1,2}%|100%)\s*\)|\brgba\(\s*(?:[0-9]{1,2}|1[0-9]{2}|2[0-4][0-9]|25[0-5])\b\s*,\s*(?:[0-9]{1,2}|1[0-9]{2}|2[0-4][0-9]|25[0-5])\b\s*,\s*(?:[0-9]{1,2}|1[0-9]{2}|2[0-4][0-9]|25[0-5])\b\s*,\s*(?:1|1\.0|0|0?\.[0-9]{1,3})\s*\)|\brgba\(\s*(?:[0-9]{1,2}%|100%)\s*,\s*(?:[0-9]{1,2}%|100%)\s*,\s*(?:[0-9]{1,2}%|100%)\s*,\s*(?:1|1\.0|0|0?\.[0-9]{1,3})\s*\)|\bhsl\(\s*(?:[0-9]{1,3})\b\s*,\s*(?:[0-9]{1,2}|100)\b%\s*,\s*(?:[0-9]{1,2}|100)\b%\s*\)|\bhsla\(\s*(?:[0-9]{1,3})\b\s*,\s*(?:[0-9]{1,2}|100)\b%\s*,\s*(?:[0-9]{1,2}|100)\b%\s*,\s*(?:1|1\.0|0|0?\.[0-9]{1,3})\s*\)|\baliceblue\b|\bantiquewhite\b|\baqua\b|\baquamarine\b|\bazure\b|\bbeige\b|\bbisque\b|\bblack\b|\bblanchedalmond\b|\bblue\b|\bblueviolet\b|\bbrown\b|\bburlywood\b|\bcadetblue\b|\bchartreuse\b|\bchocolate\b|\bcoral\b|\bcornflowerblue\b|\bcornsilk\b|\bcrimson\b|\bcyan\b|\bdarkblue\b|\bdarkcyan\b|\bdarkgoldenrod\b|\bdarkgray\b|\bdarkgreen\b|\bdarkgrey\b|\bdarkkhaki\b|\bdarkmagenta\b|\bdarkolivegreen\b|\bdarkorange\b|\bdarkorchid\b|\bdarkred\b|\bdarksalmon\b|\bdarkseagreen\b|\bdarkslateblue\b|\bdarkslategray\b|\bdarkslategrey\b|\bdarkturquoise\b|\bdarkviolet\b|\bdeeppink\b|\bdeepskyblue\b|\bdimgray\b|\bdimgrey\b|\bdodgerblue\b|\bfirebrick\b|\bfloralwhite\b|\bforestgreen\b|\bfuchsia\b|\bgainsboro\b|\bghostwhite\b|\bgold\b|\bgoldenrod\b|\bgray\b|\bgreen\b|\bgreenyellow\b|\bgrey\b|\bhoneydew\b|\bhotpink\b|\bindianred\b|\bindigo\b|\bivory\b|\bkhaki\b|\blavender\b|\blavenderblush\b|\blawngreen\b|\blemonchiffon\b|\blightblue\b|\blightcoral\b|\blightcyan\b|\blightgoldenrodyellow\b|\blightgray\b|\blightgreen\b|\blightgrey\b|\blightpink\b|\blightsalmon\b|\blightseagreen\b|\blightskyblue\b|\blightslategray\b|\blightslategrey\b|\blightsteelblue\b|\blightyellow\b|\blime\b|\blimegreen\b|\blinen\b|\bmagenta\b|\bmaroon\b|\bmediumaquamarine\b|\bmediumblue\b|\bmediumorchid\b|\bmediumpurple\b|\bmediumseagreen\b|\bmediumslateblue\b|\bmediumspringgreen\b|\bmediumturquoise\b|\bmediumvioletred\b|\bmidnightblue\b|\bmintcream\b|\bmistyrose\b|\bmoccasin\b|\bnavajowhite\b|\bnavy\b|\boldlace\b|\bolive\b|\bolivedrab\b|\borange\b|\borangered\b|\borchid\b|\bpalegoldenrod\b|\bpalegreen\b|\bpaleturquoise\b|\bpalevioletred\b|\bpapayawhip\b|\bpeachpuff\b|\bperu\b|\bpink\b|\bplum\b|\bpowderblue\b|\bpurple\b|\bred\b|\brosybrown\b|\broyalblue\b|\bsaddlebrown\b|\bsalmon\b|\bsandybrown\b|\bseagreen\b|\bseashell\b|\bsienna\b|\bsilver\b|\bskyblue\b|\bslateblue\b|\bslategray\b|\bslategrey\b|\bsnow\b|\bspringgreen\b|\bsteelblue\b|\btan\b|\bteal\b|\bthistle\b|\btomato\b|\bturquoise\b|\bviolet\b|\bwheat\b|\bwhite\b|\bwhitesmoke\b|\byellow\b|\byellowgreen\b|\btransparent\b/i;

    function makeWidget(line, editor, color) {
        var hint = document.createElement('span');
        hint.className = 'cm-palette-hint';
        hint.style.background = color;
        var oldcolor = color;
        var oldformat = function(color) {
            if (color.indexOf('rgba') > -1) {
                return 'rgba';
            } if (color.indexOf('rgb') > -1) {
                return 'rgb';
            } if (color.indexOf('#') > -1) {
                if (color.length > 4) return 'hex3';
                return 'hex';
            } if (color.indexOf('hsl') > -1) {
                return 'hsl';
            } if (color.indexOf('hsla') > -1) {
                return 'hsla';
            } else {
                return 'hex';
            }
        }
        // TODO identify preferred format and send it along
        $(hint).spectrum({
            color: color,
            preferredFormat: oldformat(oldcolor),
            showPallete: true,
            showInitial: true,
            change: function(color) {
                var linenum = editor.getDoc().getLineNumber(line);
                var start = line.text.indexOf(oldcolor);
                var end = start + oldcolor.length;
                editor.replaceRange( color.toString(), {
                        line:linenum,
                        ch:start
                    }, {
                        line:linenum,
                        ch:end
                    }
                )
            }
        });
        return hint;
    }

    function isPaletteMark(mark) {
        return mark.isPaletteMark;
    }

    function clear(mark) {
        return mark.clear();
    }

    function updatePaletteWidgets(editor, range) {
        var doc = editor.getDoc();
        doc.findMarks({
            line:range.from.line,
            ch:0
        }, {
            line:range.to.line + 1,
            ch:0
        }).filter(isPaletteMark).forEach(clear);

        editor.eachLine(range.from.line, range.to.line + 1, function (line) {

            var text = line.text;
            var match = null;
            var offset = 0;

            while ((match = text.match(COLOR_PATTERN))) {
                var color = match[0];
                var start = match.index;
                var index = start + color.length + 1;
                var before = text[start - 1];
                var after = text[index - 1];
                offset = offset + index;
                text = text.substr(index);

                if ((!after || ',; )}'.indexOf(after) >= 0) &&
                    (!before || '{(,: '.indexOf(before)) >= 0) {

                    var bookmark = doc.setBookmark({
                        line: doc.getLineNumber(line),
                        ch: offset - (color.length + 1)
                    }, {
                        widget: makeWidget(line, editor, color),
                        insertLeft: true
                    });
                    bookmark.isPaletteMark = true;
                }
            }
        });
    }


    function batchUpdate(editor, change) {
        while (change) {
            updatePaletteWidgets(editor, {
                from: {
                    line: change.from.line,
                    ch: 0
                },
                to: {
                    line: change.to.line + (change.text.length - 1),
                    ch: 0
                }
            });
            change = change.next;
        }
    }

    CodeMirror.defineOption('paletteHints', false, function (editor, current) {
        if (current) {
            editor.on('change', batchUpdate);
            updatePaletteWidgets(editor, {
                from: {
                    line: editor.firstLine(),
                    ch: 0
                },
                to: {
                    line: editor.lastLine() + 1,
                    ch: 0
                }
            });
        } else {
            editor.off('change', batchUpdate);
            editor.getAllMarks().filter(isPaletteMark).forEach(clear);
        }
    });
})();
