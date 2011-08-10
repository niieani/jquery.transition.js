/* Another polyfill for CSS3 Transitions.
 * This one parses a stylesheet looking for transitions happening on :hover and :focus and convert them to jQuery code.
 *
 * Limitations:
 * - Use simple and coherent selectors (`#menu li` to declare the transition and `#menu li:hover` for the target style)
 * - Detail the transition properties (`transition-property: padding-left, ...` instead of `transition: all`)
 *
 * Complete documentation and latest version available at https://github.com/louisremi/jquery.transition.js
 *
 * License: MIT or GPL
 *
 * Author: @louis_remi
 */

// return the rv value of a Gecko user agent
// as a floating point number.
// returns -1 for non-gecko browsers,
//          0 for pre Netscape 6.1/Gecko 0.9.1 browsers
//          number > 0 where each portion of
//          the rv value delimited by .
//          will be treated as value out of 100.
//          e.g. for rv: 3.12.42,
//          getGeckoRv() returns 3.1242
//          for rv:1.9.1.3 it returns 1.090103
//

// https://developer.mozilla.org/en/Browser_Detection_and_Cross_Browser_Support

function geckoGetRv()
{
  if (navigator.product != 'Gecko')
  {
    return -1;
  }
  var rvValue = 0;
  var ua      = navigator.userAgent.toLowerCase();
  var rvStart = ua.indexOf('rv:');
  var rvEnd   = ua.indexOf(')', rvStart);
  var rv      = ua.substring(rvStart+3, rvEnd);
  var rvParts = rv.split('.');
  var exp     = 1;

  for (var i = 0; i < rvParts.length; i++)
  {
    var val = parseInt(rvParts[i]);
    rvValue += val / exp;
    exp *= 100;
  }

  return rvValue;
}

function camelCase(stringToConvert)
{
    if(typeof(stringToConvert) == 'string')
        return stringToConvert.replace(/-([a-z])/g, function( all, letter ) {
                                return letter.toUpperCase();
                            });
    else return false;
}

function searchForProperty(myProperty, declarations)
{
    if(!declarations) return false;
    var dec = declarations.length;
    while(dec--)
    {
        if(declarations[dec].property == myProperty)
            return declarations[dec].valueText;
    }
}
function searchForPropertyCamel(myProperty, declarations)
{
    if(!declarations) return false;
    var dec = declarations.length;
    while(dec--)
    {
        var tempCase = camelCase(declarations[dec].property);
        if(tempCase == myProperty)
            return declarations[dec].valueText;
    }
}

Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

(function($, window, document, undefined) {

var div = document.createElement("div"),
	divStyle = div.style,
	propertyName = "transition",
	// with leading upper-case
	suffix = "Transition",
	testProperties = [
		"O" + suffix,
		// "ms", not "Ms"
		"ms" + suffix,
		"Webkit" + suffix,
		"Moz" + suffix,
		// prefix-less property
		propertyName
	],
	i = testProperties.length,
	supportTransition,
	self = this;

// test different vendor prefixes of this property
while ( i-- ) {
	if ( testProperties[i] in divStyle ) {
		supportTransition = testProperties[i];
		continue;
	}
}

if(geckoVer < 2 && geckoVer >= 0)
{
    supportTransition = false;
}

if ( !supportTransition ) {

    var geckoVer = geckoGetRv();

	$(function() {
		var docSS = document.styleSheets,
			i = docSS.length,
			rules, j, curRule, curSelectorText,
			duration,
			transition, selectors, k, curSelector,
			transitionSelector = {}, pseudoSelector = {},
			split, pseudo,
			selector,
            docFF = {};

            if(geckoVer < 2 && geckoVer > 0)
            {
                // List stylesheets for FF (manualy parsing CSS from files, docSS doesn't support custom values, it's a FF >= 3.6 bug)
                var lnks    = document.getElementsByTagName('link');
                var link = lnks.length;
                while(link--)
                {
                    href = lnks[link].href;
                    $.ajax({
                         async: false,
                         type: 'GET',
                         url: href,
                         success: function(data) {
                            var parser = new CSSParser();
                            docFF[link] = parser.parse(data);
                         }
                    });
                }
            }


		// Loop through all stylesheets
		while ( i-- ) {
			// if the stylesheet gives us security issues and is readOnly, exit here
			//if ( docSS[i].readOnly ) { continue };

            if(geckoVer < 2 && geckoVer > 0)
            {
                // adding inline styles from <style> for FF
                var inline = document.getElementsByTagName("style");
                var numOf = document.getElementsByTagName("style").length;
                while (numOf--)
                {
                    var parser = new CSSParser();
                    docFF[Object.size(docFF)] = (parser.parse(inline[numOf].innerHTML));
                }

                rules = docFF[i].cssRules;
            }
            else
            {
			    rules = docSS[i].rules || docSS[i].cssRules;
            }
			j = rules.length;

			// Loop through all rules
			while ( j-- ) {
				curRule = rules[j];
                if(geckoVer < 2 && geckoVer > 0)
                {
                    curSelectorText = curRule.mSelectorText;

                    if(curRule.declarations)
                    {
                        transition = searchForProperty("transition-property", curRule.declarations);
                    }
                }
                else
                {
				    curSelectorText = curRule.selectorText;
                    // Search for a transition property list
                    transition = curRule.style["transition-property"];

                    // enable this if you want to support old Safari, otherwise it won't work either.
                    //if(!transition) transition = curRule.style["-webkit-transition-property"];
                }

				// Turn a list of transition properties into a hash of properties
				transition = transition ?
					transition.replace(/(^|,)\s*([\w-]*)[^,]*/g, "$1$2").split(","):
					0;
				selectors = curSelectorText.split(",");
				k = selectors.length;

				if ( transition ) {
                    if(geckoVer < 2 && geckoVer > 0)
                    {
                        if(curRule.declarations)
                            duration = searchForProperty("transition-duration", curRule.declarations);
                    }
                    else
                    {
                        duration = curRule.style["transition-duration"];
                    }
					if ( duration ) {
						duration = parseFloat( duration ) * ( ~duration.indexOf("ms") ? 1 : 1000 );
					}
				}

				// Loop through all the selectors of the current rule
				while ( k-- )
                {
					curSelector = $.trim( selectors[k] );

					// If there is a transition in the current rule, add its selector to the transitionSelector list
					if ( transition ) {
						transitionSelector[curSelector] = {
							properties: transition,
							duration: duration
						};
					}
					// If there is a :hover, :focus or :target pseudo-class in the selector, add it to the listeners list
					split = curSelector.split( pseudo =
						~curSelector.indexOf(":hover")? ":hover":
						~curSelector.indexOf(":focus")? ":focus":
						~curSelector.indexOf(":target")? ":target": ","
					);
                    if ( split.length > 1 )
                    {
                        if(geckoVer < 2 && geckoVer > 0)
                        {
                        // store selectors at the same place when they exist for both :hover and :focus
                        (pseudo == ":hover" || pseudo == ":focus") && pseudoSelector[split.join("")] ?
                            pseudoSelector[split.join("")].pseudo += " " + pseudo:
                            pseudoSelector[split.join("")] = {
                                pseudo: pseudo,
                                style: curRule.declarations,
                                selector: split[0],
                                animated: split[1],
                                id: [i, j]
                            }
                        }
                        else
                        {
                        (pseudo == ":hover" || pseudo == ":focus") && pseudoSelector[split.join("")] ?
                            pseudoSelector[split.join("")].pseudo += " " + pseudo:
                            pseudoSelector[split.join("")] = {
                                pseudo: pseudo,
                                style: curRule.style,
                                selector: split[0],
                                animated: split[1],
                                id: [i, j]
                            }
                        }
                    }
				}
			}
		}

		// Match selectors of rules containing transitions,
		// and selectors with :hover, :focus or :target pseudo-class.
		// Only looking for exact match!
		var listener, delegate, animated, style,
			properties, temp, id,
			props,
			hfEvents;
		for ( selector in pseudoSelector ) {
			if ( ( transition = transitionSelector[selector] ) ) {
				temp = pseudoSelector[selector];

				pseudo = temp.pseudo;
				animated = temp.animated;
				split = temp.selector;
				id = temp.id;

				properties = transition.properties;
				duration = transition.duration;
				props = {};
				i = properties.length;

				while ( i-- ) {

                    if(geckoVer < 2 && geckoVer > 0)
                    {
                        var temppropdata = camelCase(properties[i]);
                        props[properties[i]] = searchForPropertyCamel(temppropdata, temp.style);
                    }
                    else
                    {
					// use camelCase property name
					props[properties[i]] =
						temp.style[properties[i].replace(/-([a-z])/g, function( all, letter ) {
							return letter.toUpperCase();
						})];
                    }
				}

                if(geckoVer < 2 && geckoVer > 0)
                {
                    // remove the rule from the CSS to fix a race condition in FF
                    docSS[id[0]].deleteRule(id[1]);
                }
                else
                {
                    // remove the rule from the CSS to fix a race condition in IE9
                    docSS[id[0]].removeRule(id[1]);
                }

				hfEvents = [[], []];
				if ( ~pseudo.indexOf(":hover") && ( hfEvents[0].push("mouseenter"), hfEvents[1].push("mouseleave") ) 
					|| ~pseudo.indexOf(":focus") && ( hfEvents[0].push("focus"), hfEvents[1].push("blur") )
				) {
					// If the selector _starts_ with an #id, we can bind the listener to it
					listener = /^#[\w\-]* /.test(split) && ( split = split.split(" ") ) ?
						split[0]:
						// use the body otherwise
						document.body;
					delegate = typeof split != "string" ? split[1] : split;

					// mouseenter and focus listeners
					$(listener).delegate( delegate, hfEvents[0].join(" "), {a: animated, p: props, d: duration}, function( e ) {
						var $animated = e.data.a ? $(this).find(e.data.a) : $(this),
							prop, save = {};
						// exit immediatly if nothing is to be animated
						if ( !$animated.length ) {
							return;
						}
						// Save the initial style of the elements to be animated
						if ( !$.data( this, "initStyle" ) ) {
							for ( prop in e.data.p ) {
								save[prop] = $.css( $animated[0], prop );

							}
							$.data( this, "initStyle", save );
						}
						$animated.stop(true).animate( props, e.data.d );

					// mouseleave and blur listeners
					}).delegate( delegate, hfEvents[1].join(" "), {a: animated, d: duration}, function( e ) {
						var self = this,
							init = $.data( this, "initStyle" ),
							$animated = e.data.a ? $(this).find(e.data.a) : $(this);
						// exit immediatly if nothing is to be animated
						if ( !$animated.length ) {
							return;
						}
						if ( init ) {
							$animated
								.stop(true).animate( init, e.data.d )
								// Clear the saved style at the end of the animation
								.queue(function() {
									$.data( self, "initStyle", null );
								});
						}
					});
				}
			}
		}
	});
}
	
})(jQuery, window, document);