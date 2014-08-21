// Languages: name (local), name_en, name_fr, name_es, name_de
@name: '[name_en]';
@text: #553;
@sans: 'Tisa Offc Pro Medium Italic';
@sans_it: 'Meta Offc Pro Light Italic', 'Arial Unicode MS Regular';
@serif_md: 'Meta Serif SC Offc Pro Medium', 'Arial Unicode MS Regular';

#place_label[zoom>=8] {
  text-name: @name;
  text-face-name: @sans;
  text-fill: @text;
  text-halo-fill: @bg;
  text-halo-radius: 2;
  text-size: 10;
  text-orientation: 35;
  [type='city'][zoom>=8][zoom<=15] {
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
    text-transform: uppercase;
    text-character-spacing: 0.5;
  }
}

#water_label {
  [zoom<=15][area>200000],
  [zoom=16][area>50000],
  [zoom=17][area>10000],
  [zoom>=18][area>0]{
    text-name: @name;
    text-size: 14;
    text-line-spacing: -2;
    text-face-name: @sans_it;
    text-fill: #abc;
    text-halo-fill: fadeout(@water,85);
    text-halo-radius: 2;
    text-halo-rasterizer: fast;
  }
}

#road_label {
  text-name: "'• ' + [name]";
  text-face-name: @sans;
  text-placement: point;
  text-min-distance: 40;
  text-fill: #553;
  text-halo-fill:@bg;
  text-halo-radius:1.5;
  text-size: 11;
  text-orientation: 35;
  text-avoid-edges: true;  // prevents clipped labels at tile edges
}


#poi_label {
  text-name: "'• ' + [name]";
  text-face-name: "Lato Black";
  text-placement: point;
  text-min-distance: 40;
  text-fill: @bg;
  text-halo-fill: @text;
  text-halo-radius:1.5;
  text-size: 11;
  text-avoid-edges: true;  // prevents clipped labels at tile edges
}
