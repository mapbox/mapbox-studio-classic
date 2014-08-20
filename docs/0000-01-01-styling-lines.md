Styling lines
=============

Line styles can be applied to both line and polygon layers. The simplest line styles have just a `line-width` (in pixels) and a `line-color` making a single solid line. The default values for these properties are `1` and `black` respectively if they are not specified.

![](https://cloud.githubusercontent.com/assets/126952/3893043/893b0c40-2237-11e4-83b5-5fef2e1478ba.png)

    #admin[admin_level=2] {
      line-width: 0.75;
      line-color: #426;
    }

## Dashed lines
 
Simple dashed lines can be created with the `line-dasharray` property. The value of this property is a comma-separated list of pixel widths that will alternatively be applied to dashes and spaces. This style draws a line with 5 pixel dashes separated by 3 pixel spaces:

![](https://cloud.githubusercontent.com/assets/126952/3893044/893cb6ee-2237-11e4-886b-d35dad27acb2.png)

    #admin[admin_level>=3] {
      line-width: 0.5;
      line-color: #426;
      line-dasharray: 5,3;
    }
 
You can make your dash patterns as complex as you want, with the limitation that the dasharray values must all be whole numbers.

![](https://cloud.githubusercontent.com/assets/126952/3893076/d7d35dda-2237-11e4-99ff-7b04d27e44f4.png)

    #admin[admin_level>=3] {
      line-width: 0.5;
      line-color: #426;
      line-dasharray: 10,3,2,3;
    }
 
## Caps & Joins

With thicker line widths you'll notice long points at sharp angles and odd gaps on small polygons.

![](https://cloud.githubusercontent.com/assets/126952/3893195/c3bea344-2238-11e4-9da7-a4c46aba4a74.png)

    #admin::bigoutline {
      line-color: white;
      line-width: 15;
    }

You can adjust the angles with the `line-join` property: `round` or `square` them off (the default is called `miter`). The gaps can be filled by setting `line-cap` to `round` or `square` (the default is called `butt`).

![](https://cloud.githubusercontent.com/assets/126952/3893194/c3b7d6f4-2238-11e4-8013-39b721fb7d30.png)

    #admin::bigoutline {
      line-color: white;
      line-width: 15;
      line-join: round;
      line-cap: round;
    }

For dashed lines, line-caps are applied to each dash and their additional length is not included in the dasharray definition. Notice how the following style creates almost-solid lines despite the dasharray defining a gap of 4 pixels.

![](https://cloud.githubusercontent.com/assets/126952/3893235/2131fb8e-2239-11e4-9975-bd4cea05228a.png)

    #admin {
      line-width: 4;
      line-cap: round;
      line-dasharray: 4, 4;
    }

## Compound line styles

### Roads

For certain types of line styles you will need to style and overlap multiple line styles. For example, a road with casing:

![](https://cloud.githubusercontent.com/assets/126952/3893352/0cfd24e4-223a-11e4-80ca-be06b2b036e1.png)

    #road[class='motorway'] {
      ::case {
        line-width: 5;
        line-color:#d83;
      }
      ::fill {
        line-width: 2.5;
        line-color:#fe3;
      }
    }

Dealing with multiple road classes, things get a little more complicated. You can either group your styles by class or group them by attachment. Here we've grouped by class (filtering on the `class` field).

![](https://cloud.githubusercontent.com/assets/126952/3893351/0cf7ecfe-223a-11e4-9aa6-8d367835f306.png)

    #road {
      [class='motorway'] {
        ::case {
          line-width: 5;
          line-color:#d83;
        }
        ::fill {
          line-width: 2.5;
          line-color:#fe3;
        }
      }
      [class='main'] {
        ::case {
          line-width: 4.5;
          line-color:#ca8;
        }
        ::fill {
          line-width: 2;
          line-color:#ffa;
        }
      }
    }

### Railroads

A common way of symbolizing railroad lines is with regular hatches on a thin line. This can be done with two line attachments - one thin and solid, the other thick and dashed. The dash should be short with wide spacing.

![](https://cloud.githubusercontent.com/assets/126952/3893425/b8d7178e-223a-11e4-813a-f14390ac3bd6.png)

    #road[class='major_rail' {
      ::line, ::hatch { line-color: #777; }
      ::line { line-width:1; }
      ::hatch {
        line-width: 4;
        line-dasharray: 1, 24;
      }
    }

Another common railroad line style is similar, but with a thin dash and a thick outline. Make sure you define the `::dash` after the `::line` so that it appears on top correctly.

![](https://cloud.githubusercontent.com/assets/126952/3893426/b8da3a5e-223a-11e4-824d-24c1fec600a2.png)

    #road[class='major_rail'] {
      ::line {
        line-width: 5;
        line-color: #777;
      }
      ::dash {
        line-color: #fff;
        line-width: 2.5;
        line-dasharray: 6, 6;
      }
    }

### Tunnels

A simple tunnel style can be created by modifying a regular road style and making the background line dashed. 

![](https://cloud.githubusercontent.com/assets/126952/3893606/73e3eeac-223c-11e4-83dd-8343f8525513.png)

    #road,
    #bridge {
      ::case {
        line-width: 8;
        line-color:#888;
      }
      ::fill {
        line-width: 5;
        line-color:#fff;
      }
    }
    #tunnel {
      ::case {
        line-width: 8;
        line-color:#888;
        line-dasharray: 4, 3;
      }
      ::fill {
        line-width: 5;
        line-color:#fff;
      }
    }

## Line patterns with Images

Certain types of line pattens are too complex to be easily achieved with regular compound line styles. TileMill allows you to use repeated images alongside or in place of your other line styles. As an example we'll make a pattern that we'll use to represent a cliff. To do this you'll need to work with external graphics software - we'll be using [Inkscape](http://inkscape.org) in this example.

In Inkscape (or whatever you are using), create a new document. The size should be rather small - the height of the image will be the width of the line pattern and the width of the image will be repeated along the length of the line. Our example is 30x16 pixels.

![](https://cloud.githubusercontent.com/assets/126952/3893643/d05c41fc-223c-11e4-968f-53eb8d2713a8.png)

Note how the centerline of the pattern is centered on the image (with empty space at the top) for correct alignment with the line data.

To use the image from Inkscape, export it as a PNG file. Line patterns just need a single CartoCSS style to be added to your TileMill project:

![](https://cloud.githubusercontent.com/assets/126952/3893795/0039a7d8-223e-11e4-92b6-253ccf826af3.png)

    #barrier_line[class='cliff'] {
      line-pattern-file: url(cliff.png);
    }

For some types of patterns, such as the cliff in this example, the direction of the pattern is important. The bottom of line pattern images will be on the right side of lines. The left side of the image will be at the beginning of the line.


