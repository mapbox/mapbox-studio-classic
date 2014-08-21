// Basic color palette, from which variations will be derived.
@a:#34a;
@b:#84a;
@c:#a4a;
@d:#2288aa;
@e:#22cc88;

#poi_label {
  ::glow,
  ::norm {
    marker-comp-op:screen;
    marker-allow-overlap:true;
    marker-width:4;
    marker-height:4;
    marker-line-width:0;
    marker-fill:@d;
  }
  ::glow {
    marker-opacity:0.2;
    marker-width:10;
    marker-height:10;
    marker-fill:@e;
  }
}

// ---------------------------------------------------------------------

// Roads are split across 3 layers: #road, #bridge, and #tunnel. Each
// road segment will only exist in one of the three layers. The
// #bridge layer makes use of Mapnik's group-by rendering mode;
// attachments in this layer will be grouped by layer for appropriate
// rendering of multi-level overpasses.

// The main road style is for all 3 road layers and divided into 2 main
// attachments. The 'case' attachment is 

#aeroway['mapnik::geometry_type'=3],
#building {
  polygon-fill:darken(#8a8acb,5%);
  }

#road, #bridge, #tunnel {
  // casing/outlines & single lines
  ::case[zoom>=6]['mapnik::geometry_type'=2] {
    comp-op:screen;
    [class='motorway'] {
      line-join:round;
      [osm_id =~ '.*[0-3]'] { line-color: @a; }
      [osm_id =~ '.*[4-6]'] { line-color: @b; }
      [osm_id =~ '.*[7-9]'] { line-color: @c; }
      #road { line-cap: round; }
      [zoom>=6]  { line-width:0.4; }
      [zoom>=7]  { line-width:0.6; }
      [zoom>=8] { line-width:1.5; }
      [zoom>=10]  { line-width:3; }
      [zoom>=12]  { line-width:4; }
      [zoom>=14] { line-width:6;  }
      [zoom>=15] { line-width:8; }
      [zoom>=16] { line-width:10; }
    }
    [class='main'] {
      line-join:round;
      line-color: @a;
      #road { line-cap: round; }
      [osm_id =~ '.*[0-3]'] { line-color: @a; }
      [osm_id =~ '.*[4-6]'] { line-color: @b; }
      [osm_id =~ '.*[7-9]'] { line-color: @c; }
      [zoom>=6] { line-width:0.5; }
      [zoom>=8] { line-width:1.0; }
      [zoom>=10] { line-width:2; }
      [zoom>=13] { line-width:3; }
      [zoom>=14] { line-width:4; }
      [zoom>=15] { line-width:5; }
      [zoom>=16] { line-width:6; }
    }
    [class='street'][zoom>=12],[class='street_limited'][zoom>=12] {
      line-join:round;
      #road { line-cap: round; }
      [osm_id =~ '.*[0-3]'] { line-color: @a; }
      [osm_id =~ '.*[4-6]'] { line-color: @b; }
      [osm_id =~ '.*[7-9]'] { line-color: @c; }
      [zoom>=12] { line-width:0.5; }
      [zoom>=14] { line-width:1; }
      [zoom>=15] { line-width:2; }
      [zoom>=16] { line-width:4; }
    }
  }
  ::glow[zoom>=6]['mapnik::geometry_type'=2] {
    comp-op:screen;
    line-opacity:0.4;
    [class='motorway'] {
      line-join:round;
      [osm_id =~ '.*[0-3]'] { line-color: @a; }
      [osm_id =~ '.*[4-6]'] { line-color: @b; }
      [osm_id =~ '.*[7-9]'] { line-color: @c; }
      #road { line-cap: round; }
      [zoom>=6]  { line-width:1; }
      [zoom>=7]  { line-width:2; }
      [zoom>=8] { line-width:3; }
      [zoom>=10]  { line-width:6; }
      [zoom>=12]  { line-width:8; }
      [zoom>=14] { line-width:10;  }
      [zoom>=15] { line-width:12; }
      [zoom>=16] { line-width:14; }
    }
    [class='main'] {
      line-join:round;
      line-color: @a;
      #road { line-cap: round; }
      [osm_id =~ '.*[0-3]'] { line-color: @a; }
      [osm_id =~ '.*[4-6]'] { line-color: @b; }
      [osm_id =~ '.*[7-9]'] { line-color: @c; }
      [zoom>=6] { line-width:1; }
      [zoom>=8] { line-width:2; }
      [zoom>=10] { line-width:4; }
      [zoom>=13] { line-width:6; }
      [zoom>=14] { line-width:8; }
      [zoom>=15] { line-width:10; }
      [zoom>=16] { line-width:12; }
    }
    [class='street'][zoom>=12],[class='street_limited'][zoom>=12] {
      line-join:round;
      #road { line-cap: round; }
      [osm_id =~ '.*[0-3]'] { line-color: @a; }
      [osm_id =~ '.*[4-6]'] { line-color: @b; }
      [osm_id =~ '.*[7-9]'] { line-color: @c; }
      [zoom>=12] { line-width:2; }
      [zoom>=14] { line-width:3; }
      [zoom>=15] { line-width:5; }
      [zoom>=16] { line-width:9; }
    }
  }
}
