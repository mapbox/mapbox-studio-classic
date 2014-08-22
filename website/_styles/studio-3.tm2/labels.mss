// =====================================================================
// LABELS

// General notes:
// - `text-halo-rasterizer: fast;` gives a noticeable performance
//    boost to render times and is recommended for *all* halos.

// ---------------------------------------------------------------------
// Languages

// There are 5 language options in the MapBox Streets vector tiles:
// - Local/default: '[name]'
// - English: '[name_en]'
// - French: '[name_fr]'
// - Spanish: '[name_es]'
// - German: '[name_de]'
@name: '[name]';  
@text: saturate(darken(@land,15%),60%);

// ---------------------------------------------------------------------
// Fonts

// All fontsets should have a good fallback that covers as many glyphs
// as possible. 'Arial Unicode MS Regular' and 'Arial Unicode MS Bold' 
//are recommended as final fallbacks if you have them available. 
//They support all the characters used in the MapBox Streets vector tiles.
@fallback: 'Open Sans Regular';
@sans: 'Open Sans Regular', @fallback;
@sans_md: 'Open Sans Semibold', @fallback;
@sans_bd: 'Open Sans Bold', @fallback;
@sans_it: 'Open Sans Italic', @fallback;

@a: 'Lato Black';
@b: 'Marselis Slab Offc Pro Bold Italic';
@c: 'DIN Offc Pro Regular';
@d: 'BentonGraphicsSansCond MedItal';
@e: 'Tisa SC Offc Pro Medium';
@f: 'Super Grotesk Offc Pro Medium';
@g: 'Meta Serif Offc Pro Light Italic';

#place_label[zoom>=8] {
  text-name: @name;
  text-face-name: @sans;
  text-wrap-width: 120;
  text-wrap-before: true;
  text-fill: @text;
  text-size: 10;
  text-orientation: 15;
  text-halo-fill:@land;
  text-halo-radius:2;
  [type='city'][zoom>=8][zoom<=15] {
  	text-face-name: @a;
    text-size: 18;
    [zoom>=10] { 
      text-size: 18;
      text-wrap-width: 140;
    }
    [zoom>=12] { 
      text-size: 20;
      text-wrap-width: 180;
    }
    // Hide at largest scales:
    [zoom>=16] { text-name: "''"; }
  }
  [type='town'] {
    text-size: 14;
    [zoom>=12] { text-size: 16; }
    [zoom>=14] { text-size: 20; }
    [zoom>=16] { text-size: 24; }
    // Hide at largest scales:
    [zoom>=18] { text-name: "''"; }
  }
  [type='village'] {
    text-size: 12;
    [zoom>=12] { text-size: 14; }
    [zoom>=14] { text-size: 18; }
    [zoom>=16] { text-size: 22; }
  }
  [type='hamlet'],
  [type='suburb'],
  [type='neighbourhood'] {
    text-fill: @text;
    [osm_id =~ '.*[0-1]'] {
      text-face-name: @b;
      text-size:10;
    }
    [osm_id =~ '.*[0-1]'] {
      text-face-name: @d;
      text-size:12;
    }
    [osm_id =~ '.*[4-6]'] {
      text-face-name: @g;
      text-size:12;
    }
    [osm_id =~ '.*[7-9]'] {
      text-face-name: @f;
      text-size:10;
    }
    text-face-name:	@d;
    text-transform: uppercase;
    text-character-spacing: 0.5;
  }
}


// ---------------------------------------------------------------------
// Roads
#road_label {
  text-name: @name;
  text-face-name: @sans;
  text-placement: line;  // text follows line path
  [osm_id =~ '.*[0-1]'] {
    text-face-name: @b;
    text-size:8;
  }
  [osm_id =~ '.*[2-3]'] {
    text-face-name: @d;
    text-size:9;
  }
  [osm_id =~ '.*[4-6]'] {
    text-face-name: @g;
    text-size:8;
  }
  [osm_id =~ '.*[7-9]'] {
     text-face-name: @f;
     text-size:7;
  }
  text-fill: @text;
  text-halo-fill:@land;
  text-halo-radius:1;
  text-size: 14;
  text-avoid-edges: true;  // prevents clipped labels at tile edges
}
