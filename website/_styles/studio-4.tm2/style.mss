// Common Colors //
@water: #456;
@bg: #f1f075;

Map {
  background-color:@bg;
  }

#water {
  polygon-pattern-file:url(./paper.png);
  polygon-pattern-alignment:global;
  }

#mapbox_satellite_open  {
  comp-op:multiply;
  raster-opacity: 1;
  raster-scaling: bilinear;
  image-filters: scale-hsla( 0.5,0.6, 0.0,0.2, 0.2,1, 0,1 );
}

// Southern Hemisphere:
#hillshadeX {
  comp-op: overlay;
  polygon-opacity: 0.5;
  [class='medium_shadow'] { polygon-fill: #46a; }
  [class='full_shadow'] { polygon-fill: #246; }
  [class='medium_highlight'] { polygon-fill: #ea8; }
  [class='full_highlight'] { polygon-fill: #fea; }
}

#admin[admin_level=2] {
  [maritime=0] {
    ::case {
      opacity: 0.5;
      line-color: @water;
      line-join: round;
      line-cap: round;
      line-width: 3;
      [zoom>=6] { line-width: 5; }
    }
    ::fill {
      line-color: white;
      line-join: round;
      line-cap: round;
      line-width: 0.6;
      [zoom>=6] { line-width: 1; }
    }
  }
  [maritime=1] { line-color: #345; line-dasharray: 3,2; }
}

#admin[admin_level=4][maritime=0] {
  ::case {
    line-opacity: 0.5;
    line-color: @water; 
    line-join: round;
    line-cap: round;
    line-width: 3;
  }
  ::fill {
    line-opacity: 0.75;
    line-color: white;
    line-join: round;
    line-cap: round;
    line-width: 0.6;
    line-dasharray: 2,2;
  }
}
  