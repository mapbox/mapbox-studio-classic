// ---------------------------------------------------------------------
// Common Colors

// You don't need to set up @variables for every color, but it's a good
// idea for colors you might be using in multiple places or as a base
// color for a variety of tints.
// Eg. @water is used in the #water and #waterway layers directly, but
// also in the #water_label and #waterway_label layers inside a color
// manipulation function to get a darker shade of the same hue.
@land: #56b881;

Map {
  background-color:@land;
}

// ---------------------------------------------------------------------
// Buildings 

#building {
  // At zoom level 13, only large buildings are included in the
  // vector tiles. At zoom level 14+, all buildings are included.
  comp-op:screen;
  building-fill:#66c891;
  building-fill-opacity:0.4;
  building-height:6;
}
