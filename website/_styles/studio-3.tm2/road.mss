// Basic color palette, from which variations will be derived.
@road:saturate(darken(@land,15%),60%);

// ---------------------------------------------------------------------

// Roads are split across 3 layers: #road, #bridge, and #tunnel. Each
// road segment will only exist in one of the three layers. The
// #bridge layer makes use of Mapnik's group-by rendering mode;
// attachments in this layer will be grouped by layer for appropriate
// rendering of multi-level overpasses.

// The main road style is for all 3 road layers and divided into 2 main
// attachments. The 'case' attachment is 

#road, #bridge, #tunnel {
  // casing/outlines & single lines
  ::case[zoom>=6]['mapnik::geometry_type'=2] {
    [class='motorway'] {
      line-join:round;
      line-color:@road;
      #road { line-cap: round; }
      [zoom>=6]  { line-width:0.4; }
      [zoom>=7]  { line-width:0.6; }
      [zoom>=8] { line-width:1.5; }
      [zoom>=10]  { line-width:2; }
      [zoom>=12]  { line-width:3; }
      [zoom>=14] { line-width:4;  }
      [zoom>=15] { line-width:6; }
      [zoom>=16] { line-width:8; }
    }
    [class='main'] {
      line-join:round;
      line-color: @road;
      #road { line-cap: round; }
      [zoom>=6] { line-width:0.5; }
      [zoom>=8] { line-width:1.0; }
      [zoom>=10] { line-width:2; }
      [zoom>=13] { line-width:2; }
      [zoom>=14] { line-width:2; }
      [zoom>=15] { line-width:3; }
      [zoom>=16] { line-width:4; }
    }
    [class='street'][zoom>=12],[class='street_limited'][zoom>=12] {
      line-join:round;
      line-color:@road;
      #road { line-cap: round; }
      [zoom>=12] { line-width:0.5; }
      [zoom>=14] { line-width:1; }
      [zoom>=15] { line-width:2; }
      [zoom>=16] { line-width:4; }
    }
  }
}
