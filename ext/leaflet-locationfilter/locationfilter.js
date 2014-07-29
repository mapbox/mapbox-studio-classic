/*
 * Leaflet.locationfilter - leaflet location filter plugin
 * Copyright (C) 2012, Tripbirds.com
 * http://tripbirds.com
 *
 * Licensed under the MIT License.
 *
 * Date: 2012-09-24
 * Version: 0.1
 */
L.LatLngBounds.prototype.modify = function(map, amount) {
    var sw = this.getSouthWest(),
        ne = this.getNorthEast(),
        swPoint = map.latLngToLayerPoint(sw),
        nePoint = map.latLngToLayerPoint(ne);

    sw = map.layerPointToLatLng(new L.Point(swPoint.x-amount, swPoint.y+amount));
    ne = map.layerPointToLatLng(new L.Point(nePoint.x+amount, nePoint.y-amount));
    
    return new L.LatLngBounds(sw, ne);
};

L.Control.Button = L.Class.extend({
    initialize: function(options) {
        L.Util.setOptions(this, options);
    },

    addTo: function(container) {
        // container.addButton(this);
        return this;
    },
    
    onAdd: function (buttonContainer) {
        this._buttonContainer = buttonContainer;
        this._button = L.DomUtil.create('a', this.options.className, this._buttonContainer.getContainer());
        this._button.href = '#';
        this.setText(this.options.text);

        var that = this;
        this._onClick = function(event) {
            that.options.onClick.call(that, event);
        };

        L.DomEvent
            .on(this._button, 'click', L.DomEvent.stopPropagation)
            .on(this._button, 'mousedown', L.DomEvent.stopPropagation)
            .on(this._button, 'dblclick', L.DomEvent.stopPropagation)
            .on(this._button, 'click', L.DomEvent.preventDefault)
            .on(this._button, 'click', this._onClick, this);
    },

    remove: function() {
        L.DomEvent.off(this._button, "click", this._onClick);
        this._buttonContainer.getContainer().removeChild(this._button);
    },

    setText: function(text) {
        this._button.title = text;
        this._button.innerHTML = text;
    }
});

L.Control.ButtonContainer = L.Control.extend({
    options: {
        position: 'topleft'
    },

    getContainer: function() {
        if (!this._container) {
            this._container = L.DomUtil.create('div', this.options.className);
        }
        return this._container;
    },

    onAdd: function (map) {
        this._map = map;
        return this.getContainer();
    },

    addButton: function(button) {
        button.onAdd(this);
    },

    addClass: function(className) {
        L.DomUtil.addClass(this.getContainer(), className);
    },

    removeClass: function(className) {
        L.DomUtil.removeClass(this.getContainer(), className);
    }
});

L.LocationFilter = L.Class.extend({
    includes: L.Mixin.Events,

    options: {
        enableButton: {
            enableText: "Select area",
            disableText: "Remove selection"
        },
        adjustButton: {
            text: "Select area within current zoom"
        },
        buttonPosition: 'topleft'
    },

    initialize: function(options) {
        L.Util.setOptions(this, options);
    },

    addTo: function(map) {
        map.addLayer(this);
        return this;
    },

    onAdd: function(map) {
        this._map = map;

        // if (this.options.enableButton || this.options.adjustButton) {
        //     this._initializeButtonContainer();
        // }

        if (this.options.enable) {
            this.enable();
        }
    },

    onRemove: function(map) {
        this.disable();
        if (this._buttonContainer) {
            this._buttonContainer.removeFrom(map);
        }
    },

    /* Get the current filter bounds */
    getBounds: function() { 
        return new L.LatLngBounds(this._sw, this._ne); 
    },

    setBounds: function(bounds) {
        this._nw = bounds.getNorthWest();
        this._ne = bounds.getNorthEast();
        this._sw = bounds.getSouthWest();
        this._se = bounds.getSouthEast();
        this._north = new L.LatLng(this._nw.lat, (this._ne.lng - this._nw.lng)/2 + this._nw.lng);
        this._south = new L.LatLng(this._sw.lat, (this._se.lng - this._sw.lng)/2 + this._sw.lng);
        this._east = new L.LatLng((this._sw.lat - this._nw.lat)/2 + this._nw.lat, this._ne.lng);
        this._west = new L.LatLng((this._sw.lat - this._nw.lat)/2 + this._nw.lat, this._nw.lng);
        if (this.isEnabled()) {
            this._draw();
            this.fire("change", {bounds: bounds});
        }
    },

    isEnabled: function() {
        return this._enabled;
    },

    /* Draw a rectangle */
    _drawRectangle: function(bounds, divClass, options) {
        options = options || {};
        var defaultOptions = {
            stroke: false,
            fill: true,
            fillColor: "black",
            fillOpacity: 0.3,
            clickable: false,
            className: divClass
        };
        options = L.Util.extend(defaultOptions, options);
        var rect = new L.Rectangle(bounds, options);
        rect.addTo(this._layer);
        return rect;
    },

    /* Draw a draggable marker */
    _drawImageMarker: function(point, options) {
        var marker = new L.Marker(point, {
            icon: new L.DivIcon({
                iconAnchor: options.anchor,
                iconSize: options.size,
                className: options.className
            }),
            draggable: true
        });
        marker.addTo(this._layer);
        return marker;
    },

    /* Draw a move marker. Sets up drag listener that updates the
       filter corners and redraws the filter when the move marker is
       moved */
    _drawMoveMarker: function(point) {
        var that = this;
        this._moveMarker = this._drawImageMarker(point, {
            "className": "location-filter move-marker",
            "anchor": [-10, -10],
            "size": [13,13]
        });
        this._moveMarker.on('drag', function(e) {
            var markerPos = that._moveMarker.getLatLng(),
                latDelta = markerPos.lat-that._nw.lat,
                lngDelta = markerPos.lng-that._nw.lng;
            that._nw = new L.LatLng(that._nw.lat+latDelta, that._nw.lng+lngDelta, true);
            that._ne = new L.LatLng(that._ne.lat+latDelta, that._ne.lng+lngDelta, true);
            that._sw = new L.LatLng(that._sw.lat+latDelta, that._sw.lng+lngDelta, true);
            that._se = new L.LatLng(that._se.lat+latDelta, that._se.lng+lngDelta, true);
            that._north = new L.LatLng(that._north.lat+latDelta, that._north.lng+lngDelta, true);
            that._south = new L.LatLng(that._south.lat+latDelta, that._south.lng+lngDelta, true);
            that._east = new L.LatLng(that._east.lat+latDelta, that._east.lng+lngDelta, true);
            that._west = new L.LatLng(that._west.lat+latDelta, that._west.lng+lngDelta, true);
            that._draw();
        });
        this._setupDragendListener(this._moveMarker);
        return this._moveMarker;
    },

    /* Draw a resize marker */
    _drawResizeMarker: function(point, className) {
        return this._drawImageMarker(point, {
            "className": "location-filter resize-marker " + className,
            "anchor": [7, 6],
            "size": [23, 22]
        });
    },

    /* Track moving of the given resize marker and update the markers
       given in options.moveAlong to match the position of the moved
       marker. Update filter corners and redraw the filter */
    _setupResizeMarkerTracking: function(marker, options) {
        var that = this;
        marker.on('drag', function(e) {
            var curPosition = marker.getLatLng(),
                latMarker = options.moveAlong.lat,
                lngMarker = options.moveAlong.lng,
                midLatCloseMarker = options.moveAlong.midLatClose,
                midLngCloseMarker = options.moveAlong.midLngClose,
                midLatFarMarker = options.moveAlong.midLatFar,
                midLngFarMarker = options.moveAlong.midLngFar;

            // Move follower markers when this marker is moved
            latMarker.setLatLng(new L.LatLng(curPosition.lat, latMarker.getLatLng().lng, true));
            lngMarker.setLatLng(new L.LatLng(lngMarker.getLatLng().lat, curPosition.lng, true));
            midLatCloseMarker.setLatLng(new L.LatLng(curPosition.lat, (curPosition.lng - latMarker.getLatLng().lng)/2 + latMarker.getLatLng().lng, true));
            midLngCloseMarker.setLatLng(new L.LatLng(((lngMarker.getLatLng().lat - curPosition.lat)/2) + curPosition.lat, curPosition.lng, true));
            midLatFarMarker.setLatLng(new L.LatLng(lngMarker.getLatLng().lat, (curPosition.lng - latMarker.getLatLng().lng)/2 + latMarker.getLatLng().lng, true));
            midLngFarMarker.setLatLng(new L.LatLng(((lngMarker.getLatLng().lat - curPosition.lat)/2) + curPosition.lat, latMarker.getLatLng().lng, true));

            that._resizePositions();

        });
        this._setupDragendListener(marker);
    },

    _setupResizeMarkerTrackingMid: function(marker, options) {
        var that = this;
        marker.on('drag', function(e) {
            var curPosition = marker.getLatLng(),
                oneCornerMarker = options.moveAlong.cOne,
                twoCornerMarker = options.moveAlong.cTwo,
                oneSideMarker = options.moveAlong.sOne,
                twoSideMarker = options.moveAlong.sTwo,
                opposite = options.moveAlong.opposite.getLatLng();

            // Move follower markers when this marker is moved
            if (options.moveAlong.dir === 'lng') {
                marker.setLatLng(new L.LatLng(opposite.lat, curPosition.lng, true));
                oneCornerMarker.setLatLng(new L.LatLng(oneCornerMarker.getLatLng().lat, curPosition.lng, true));
                twoCornerMarker.setLatLng(new L.LatLng(twoCornerMarker.getLatLng().lat, curPosition.lng, true));
                oneSideMarker.setLatLng(new L.LatLng(oneSideMarker.getLatLng().lat, (curPosition.lng - opposite.lng)/2 + opposite.lng, true));
                twoSideMarker.setLatLng(new L.LatLng(twoSideMarker.getLatLng().lat, (curPosition.lng - opposite.lng)/2 + opposite.lng, true));
            } else {
                marker.setLatLng(new L.LatLng(curPosition.lat, opposite.lng, true));
                oneCornerMarker.setLatLng(new L.LatLng(curPosition.lat, oneCornerMarker.getLatLng().lng, true));
                twoCornerMarker.setLatLng(new L.LatLng(curPosition.lat, twoCornerMarker.getLatLng().lng, true));
                oneSideMarker.setLatLng(new L.LatLng((curPosition.lat - opposite.lat)/2 + opposite.lat, oneCornerMarker.getLatLng().lng, true));
                twoSideMarker.setLatLng(new L.LatLng((curPosition.lat - opposite.lat)/2 + opposite.lat, twoCornerMarker.getLatLng().lng, true));
            }
            that._resizePositions();
        });
        this._setupDragendListener(marker);
    },

    _resizePositions: function(){
        var that = this;
        // Sort marker positions in nw, ne, sw, se order
        var corners = [that._nwMarker.getLatLng(), 
                       that._neMarker.getLatLng(), 
                       that._swMarker.getLatLng(), 
                       that._seMarker.getLatLng()];
        corners.sort(function(a, b) {
            if (a.lat != b.lat)
                return b.lat-a.lat;
            else
                return a.lng-b.lng;
        });

        var middles = [that._westMarker.getLatLng(),
                       that._southMarker.getLatLng(),
                       that._eastMarker.getLatLng(),
                       that._northMarker.getLatLng()];
        middles.sort(function(a, b) {
            if (a.lat != b.lat)
                return b.lat-a.lat;
            else
                return a.lng-b.lng;
        });

        // Update corner points and redraw everything except the resize markers
        that._nw = corners[0];
        that._ne = corners[1];
        that._sw = corners[2];
        that._se = corners[3];
        that._north = middles[0];
        that._west = middles[1];
        that._east = middles[2];
        that._south = middles[3];
        that._draw({repositionResizeMarkers: false});

        var markers = document.getElementsByClassName('resize-marker');
        for (var i = 0; i < 4; i ++) {
            markers[i].classList.remove('nesw', 'nwse');
        }
        if (that._nwMarker.getLatLng() == corners [0] || that._nwMarker.getLatLng() == corners [3]) {
            that._nwMarker._icon.classList.add('nwse');
            that._seMarker._icon.classList.add('nwse');
            that._swMarker._icon.classList.add('nesw');
            that._neMarker._icon.classList.add('nesw');
        } else {
            that._nwMarker._icon.classList.add('nesw');
            that._seMarker._icon.classList.add('nesw');
            that._swMarker._icon.classList.add('nwse');
            that._neMarker._icon.classList.add('nwse');
        }
    },

    /* Emit a change event whenever dragend is triggered on the
       given marker */
    _setupDragendListener: function(marker) {
        var that = this;
        marker.on('dragend', function(e) {
            that.fire("change", {bounds: that.getBounds()});
        });
    },

    /* Create bounds for the mask rectangles and the location
       filter rectangle */
    _calculateBounds: function() {
        var mapBounds = this._map.getBounds(),
            outerBounds = new L.LatLngBounds(
                new L.LatLng(mapBounds.getSouthWest().lat-0.1,
                             mapBounds.getSouthWest().lng-0.1, true),
                new L.LatLng(mapBounds.getNorthEast().lat+0.1,
                             mapBounds.getNorthEast().lng+0.1, true)
            );

        // The south west and north east points of the mask */
        this._osw = outerBounds.getSouthWest();
        this._one = outerBounds.getNorthEast();

        // Bounds for the mask rectangles
        this._northBounds = new L.LatLngBounds(new L.LatLng(this._ne.lat, this._osw.lng, true), this._one);
        this._westBounds = new L.LatLngBounds(new L.LatLng(this._sw.lat, this._osw.lng, true), this._nw);
        this._eastBounds = new L.LatLngBounds(this._se, new L.LatLng(this._ne.lat, this._one.lng, true));
        this._southBounds = new L.LatLngBounds(this._osw, new L.LatLng(this._sw.lat, this._one.lng, true));
    },

    _calculatePixelCorners: function(){
        // calculate the new geographic dimensions of the bounding by desired dimensions in pixels
        // uses node-sphericalmercator to calculate between pixel values and lat,lng
        var zoom = this._map.getZoom(),
            ne = this._sm.px([this._ne.lng, this._ne.lat], zoom),
            sw = this._sm.px([this._sw.lng, this._sw.lat], zoom),
            center = [(ne[0] - sw[0])/2 + sw[0], (ne[1] - sw[1])/2 + sw[1]],
            w = Math.ceil(window.exporter.model.get('coordinates').dimensions[0] / window.exporter.model.get('coordinates').scale),
            h = Math.ceil(window.exporter.model.get('coordinates').dimensions[1] / window.exporter.model.get('coordinates').scale);

        ne = this._sm.ll([center[0] + w/2, center[1] - h/2], zoom);
        sw = this._sm.ll([center[0] - w/2, center[1] + h/2], zoom);

        this._nw = L.latLng(ne[1], sw[0]);
        this._ne = L.latLng(ne[1], ne[0]);
        this._sw = L.latLng(sw[1], sw[0]);
        this._se = L.latLng(sw[1], ne[0]);
        this._north = new L.LatLng(this._nw.lat, (this._ne.lng - this._nw.lng)/2 + this._nw.lng);
        this._south = new L.LatLng(this._sw.lat, (this._se.lng - this._sw.lng)/2 + this._sw.lng);
        this._east = new L.LatLng((this._sw.lat - this._nw.lat)/2 + this._nw.lat, this._ne.lng);
        this._west = new L.LatLng((this._sw.lat - this._nw.lat)/2 + this._nw.lat, this._nw.lng);
    },

    /* Initializes rectangles and markers */
    _initialDraw: function() {
        if (this._initialDrawCalled) {
            return;
        }
        // for geo -> pixel conversion
        this._sm = new SphericalMercator();

        this._layer = new L.LayerGroup();

        // Calculate filter bounds
        this._calculateBounds();

        // Create rectangles
        this._northRect = this._drawRectangle(this._northBounds, 'northRect');
        this._westRect = this._drawRectangle(this._westBounds, 'westRect');
        this._eastRect = this._drawRectangle(this._eastBounds, 'eastRect');
        this._southRect = this._drawRectangle(this._southBounds, 'southRect');
        this._innerRect = this._drawRectangle(this.getBounds(), 'innerRect', {
            fillOpacity: 0,
            stroke: true,
            color: "white",
            weight: 1,
            opacity: 0.9
        });

        // Create resize markers
        this._nwMarker = this._drawResizeMarker(this._nw, 'nwse');
        this._neMarker = this._drawResizeMarker(this._ne, 'nesw');
        this._swMarker = this._drawResizeMarker(this._sw, 'nesw');
        this._seMarker = this._drawResizeMarker(this._se, 'nwse');

        this._northMarker = this._drawResizeMarker(this._north, 'ns');
        this._southMarker = this._drawResizeMarker(this._south, 'ns');
        this._eastMarker = this._drawResizeMarker(this._east, 'ew');
        this._westMarker = this._drawResizeMarker(this._west, 'ew');

        // Setup tracking of resize markers. Each marker has pair of
        // follower markers that must be moved whenever the marker is
        // moved. For example, whenever the north west resize marker
        // moves, the south west marker must move along on the x-axis
        // and the north east marker must move on the y axis
        this._setupResizeMarkerTracking(this._nwMarker, {moveAlong: {lat: this._neMarker, lng: this._swMarker, midLatClose: this._northMarker, midLngClose: this._westMarker, midLatFar: this._southMarker, midLngFar: this._eastMarker}});
        this._setupResizeMarkerTracking(this._neMarker, {moveAlong: {lat: this._nwMarker, lng: this._seMarker, midLatClose: this._northMarker, midLngClose: this._eastMarker, midLatFar: this._southMarker, midLngFar: this._westMarker}});
        this._setupResizeMarkerTracking(this._swMarker, {moveAlong: {lat: this._seMarker, lng: this._nwMarker, midLatClose: this._southMarker, midLngClose: this._westMarker, midLatFar: this._northMarker, midLngFar: this._eastMarker}});
        this._setupResizeMarkerTracking(this._seMarker, {moveAlong: {lat: this._swMarker, lng: this._neMarker, midLatClose: this._southMarker, midLngClose: this._eastMarker, midLatFar: this._northMarker, midLngFar: this._westMarker}});
        this._setupResizeMarkerTrackingMid(this._northMarker, {moveAlong: {dir: 'lat', cOne: this._neMarker, cTwo: this._nwMarker, sOne: this._eastMarker, sTwo: this._westMarker, opposite: this._southMarker}});
        this._setupResizeMarkerTrackingMid(this._southMarker, {moveAlong: {dir: 'lat', cOne: this._seMarker, cTwo: this._swMarker, sOne: this._eastMarker, sTwo: this._westMarker, opposite: this._northMarker}});
        this._setupResizeMarkerTrackingMid(this._eastMarker, {moveAlong: {dir: 'lng', cOne: this._neMarker, cTwo: this._seMarker, sOne: this._northMarker, sTwo: this._southMarker, opposite: this._westMarker}});
        this._setupResizeMarkerTrackingMid(this._westMarker, {moveAlong: {dir: 'lng', cOne: this._nwMarker, cTwo: this._swMarker, sOne: this._northMarker, sTwo: this._southMarker, opposite: this._eastMarker}});

        // Create move marker
        this._moveMarker = this._drawMoveMarker(this._nw);

        this._initialDrawCalled = true;
    },

    /* Reposition all rectangles and markers to the current filter bounds. */    
    _draw: function(options) {
        options = L.Util.extend({repositionResizeMarkers: true}, options);

        /*  In order to combat skewing of the bounding box
        *   and divergence from desired pixel dimensions due
        *   to the projection of the map (especially near the poles),
        *   if the dimensions of the bounding box are locked
        *   recalculate bounding box coordinates by saved
        *   pixel dimensions.
        */ 
        if (window.exporter.model.get('coordinates') && window.exporter.model.get('coordinates').locked){
            this._calculatePixelCorners();
        }

        // Calculate filter bounds
        this._calculateBounds();

        // Reposition rectangles
        this._northRect.setBounds(this._northBounds);
        this._westRect.setBounds(this._westBounds);
        this._eastRect.setBounds(this._eastBounds);
        this._southRect.setBounds(this._southBounds);
        this._innerRect.setBounds(this.getBounds());

        // Reposition resize markers
        if (options.repositionResizeMarkers) {
            this._nwMarker.setLatLng(this._nw);
            this._neMarker.setLatLng(this._ne);
            this._swMarker.setLatLng(this._sw);
            this._seMarker.setLatLng(this._se);
            this._northMarker.setLatLng(this._north);
            this._southMarker.setLatLng(this._south);
            this._eastMarker.setLatLng(this._east);
            this._westMarker.setLatLng(this._west);
        }

        // Reposition the move marker
        this._moveMarker.setLatLng(this._nw);
    }, 

    /* Adjust the location filter to the current map bounds */
    _adjustToMap: function() {
        this.setBounds(this._map.getBounds());
        this._map.zoomOut();
    },

    /* Enable the location filter */
    enable: function() {
        if (this._enabled) {
            return;
        }

        // Initialize corners
        var bounds;
        if (this._sw && this._ne) {
            bounds = new L.LatLngBounds(this._sw, this._ne);
        } else if (this.options.bounds) {
            bounds = this.options.bounds;
        } else {
            bounds = this._map.getBounds();
        }
        this._map.invalidateSize();
        this._nw = bounds.getNorthWest();
        this._ne = bounds.getNorthEast();
        this._sw = bounds.getSouthWest();
        this._se = bounds.getSouthEast();

        this._north = new L.LatLng(this._nw.lat, (this._ne.lng - this._nw.lng)/2 + this._nw.lng);
        this._south = new L.LatLng(this._sw.lat, (this._se.lng - this._sw.lng)/2 + this._sw.lng);
        this._east = new L.LatLng((this._sw.lat - this._nw.lat)/2 + this._nw.lat, this._ne.lng);
        this._west = new L.LatLng((this._sw.lat - this._nw.lat)/2 + this._nw.lat, this._nw.lng);

        // Update buttons
        if (this._buttonContainer) {
            this._buttonContainer.addClass("enabled");
        }

        if (this._enableButton) {
            this._enableButton.setText(this.options.enableButton.disableText);
        }

        if (this.options.adjustButton) {
            this._createAdjustButton();
        }
        
        // Draw filter
        this._initialDraw();
        this._draw();

        // Set up map move event listener
        var that = this;
        this._moveHandler = function() {
            that._draw();
        };
        this._map.on("move", this._moveHandler);

        // Add the filter layer to the map
        this._layer.addTo(this._map);
        
        // Zoom out the map if necessary
        var mapBounds = this._map.getBounds();
        bounds = new L.LatLngBounds(this._sw, this._ne).modify(this._map, 10);
        if (!mapBounds.contains(bounds.getSouthWest()) || !mapBounds.contains(bounds.getNorthEast())) {
            this._map.fitBounds(bounds);
        }

        this._enabled = true;
        
        // Fire the enabled event
        this.fire("enabled");
    },

    /* Disable the location filter */
    disable: function() {
        if (!this._enabled) {
            return;
        }

        // Update buttons
        if (this._buttonContainer) {
            this._buttonContainer.removeClass("enabled");
        }

        if (this._enableButton) {
            this._enableButton.setText(this.options.enableButton.enableText);
        }

        if (this._adjustButton) {
            this._adjustButton.remove();
        }

        // Remove event listener
        this._map.off("move", this._moveHandler);

        // Remove rectangle layer from map
        this._map.removeLayer(this._layer);

        this._enabled = false;

        // Fire the disabled event
        this.fire("disabled");
    },

    /* Create a button that allows the user to adjust the location
       filter to the current zoom */
    _createAdjustButton: function() {
        var that = this;
        this._adjustButton = new L.Control.Button({
            className: "adjust-button",
            text: this.options.adjustButton.text,
            
            onClick: function(event) {
                that._adjustToMap();
                that.fire("adjustToZoomClick");
            }
        }).addTo(this._buttonContainer);
    },

    /* Create the location filter button container and the button that
       toggles the location filter */
    _initializeButtonContainer: function() {
        var that = this;
        this._buttonContainer = new L.Control.ButtonContainer({
	    className: "location-filter button-container",
	    position: this.options.buttonPosition
	});

        if (this.options.enableButton) {
            this._enableButton = new L.Control.Button({
                className: "enable-button",
                text: this.options.enableButton.enableText,

                onClick: function(event) {
                    if (!that._enabled) {
                        // Enable the location filter
                        that.enable();
                        that.fire("enableClick");
                    } else {
                        // Disable the location filter
                        that.disable();
                        that.fire("disableClick");
                    }
                }
            }).addTo(this._buttonContainer);
        }

        this._buttonContainer.addTo(this._map);
    }
});
