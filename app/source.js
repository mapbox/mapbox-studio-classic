window.Source = function(templates, cwd, tm, source, revlayers, examples) {
    var map;
    var tiles;
    var mtime = (+new Date).toString(36);
    statHandler('srcbytes')();
    // set initial page view to avoid #browsefile trap
    $(function() {
        if (window.location.hash === '#browsefile') window.location.hash = '#';
    });
    var Layer = function(id, datasource) {
        var code;
        if (datasource && (datasource.type === 'postgis' || datasource.type === 'sqlite')) {
            var cmParams = {
                lineNumbers: true,
                mode: 'text/x-plsql'
            };
            if (datasource.table) cmParams.value = datasource.table;
            code = CodeMirror($('#layers-' + id + ' div.sql').get(0), cmParams);
            code.getWrapperElement().id = 'layers-' + id + '-code';
        }
        var layer = {
            code: code,
            form: $('#layers-' + id),
            item: $('#layers #' + id)
        };
        layer.refresh = function() {
            var l = _(editor.model.get('vector_layers')).find(function(l) {
                return l.id === id;
            });
            var fields = l && l.fields ? l.fields : {};
            $('div.fields', layer.form).html(templates.layerfields(fields));
        };
        layer.get = function() {
            var attr = _($('#layers-' + id).serializeArray()).reduce(function(memo, field) {
                // @TODO determine what causes empty field names.
                if (!field.name) return memo;
                var group = field.name.split('-')[0];
                var name = field.name.split('-').slice(1).join('-');
                switch (group) {
                    case 'fields':
                    case 'properties':
                    case 'Datasource':
                        memo[group] = memo[group] || {};
                        memo[group][name] = parseInt(field.value, 10).toString() === field.value ? parseInt(field.value, 10) : field.value;
                        break;
                    default:
                        memo[field.name] = parseInt(field.value, 10).toString() === field.value ? parseInt(field.value, 10) : field.value;
                        break;
                }
                return memo;
            }, {});
            if (code) {
                attr.Datasource = attr.Datasource || {};
                attr.Datasource.table = code.getValue();
            }
            return attr;
        };
        return layer;
    };
    var layers = _(revlayers).reduce(function(memo, l) {
        memo[l.id] = Layer(l.id, l.Datasource);
        return memo;
    }, {});
    function orderLayers() {
        var ids = $('#layers .js-layer-content .js-layer').map(function() {
            return $(this).attr('id');
        }).get();
        layers = _(ids).reduce(function(memo, id) {
            memo[id] = layers[id];
            return memo;
        }, {});
    };
    var Source = Backbone.Model.extend({});
    Source.prototype.url = function() {
        return '/source.json?id=' + this.get('id');
    };
    var Modal = window.Modal = new views.Modal({
        el: $('.modal-content'),
        templates: templates
    });
    var Editor = Backbone.View.extend({});
    Editor.prototype.events = {
        'click .js-newstyle': 'newStyle',
        'click .js-sourcenewstyle': 'sourceNewStyle',
        'click .js-browsesource': 'browseSource',
        'click .js-browsestyle': 'browseStyle',
        'click .js-save': 'save',
        'click .js-saveas': 'saveModal',
        'click .js-reset-mode': 'resetmode',
        'click .editor .js-tab': 'togglemode',
        'click .layer .js-delete': 'deletelayer',
        'click .layer .js-refresh-source': 'refreshSource',
        'click .layer .js-xrayswatch': 'togglelayer',
        'click .js-browsefile': 'browsefile',
        'click #history .js-tab': 'tabbed',
        'click #history .js-ref-delete': 'delstyle',
        'click .js-settings-drawer .js-tab': 'tabbed',
        'click #docs .js-docs-nav': 'scrollto',
        'click .layer .js-tab': 'tabbedFields',
        'click .js-addlayer': 'addlayerModal',
        'click .js-adddb': 'addDatabase',
        'click .js-updatename': 'updatenameModal',
        'submit #updatename': 'updateLayername',
        'submit #addlayer': 'addlayerSubmit',
        'change #editor form': 'changed',
        'change #settings-drawer': 'changed',
        'submit #settings-drawer': 'save',
        'keydown': 'keys',
        'click .js-zoom-to': 'zoomToLayer'
    };
    Editor.prototype.changed = function() {
        $('body').addClass('changed');
    };
    Editor.prototype.keys = function(ev) {
        // Escape. Collapses windows, dialogs, modals, etc.
        if (ev.which === 27) {
            if (Modal.active) {
              Modal.close();
            } else {
              window.location.href = '#';
            }
        }
        if ((!ev.ctrlKey && !ev.metaKey) || ev.shiftKey) return;
        var which = ev.which;
        switch (true) {
            case (which === 83): // s
                this.save();
                break;
            case (which === 190): // . for fullscreen
                ev.preventDefault();
                this.togglePane('full');
                break;
            case (which === 220): // \ for settings
                ev.preventDefault();
                this.togglePane('settings');
                break;
            default:
                return true;
        }
        return false;
    };

    Editor.prototype.saveModal = function() {
        Modal.show('browsersave', {
            type: 'source',
            cwd: cwd
        });
        new views.Browser({
            el: $('.modal-content #saveas'),
            filter: function(file) {
                return file.type === 'dir' && !(/\.tm2$/).test(file.basename);
            },
            callback: function(err, filepath) {
                if (err) return false; // @TODO
                filepath = filepath.replace(/\.tm2/, '') + '.tm2source';
                var id = 'tmsource://' + filepath;
                window.editor.model.set({
                    id: id
                });
                window.editor.save(null, {
                    success: function() {
                        window.location = '/source?id=' + id;
                    },
                    error: _(window.editor.error).bind(window.editor)
                });
                return false;
            }
        });
        return false;
    };
    Editor.prototype.newStyle = function() { return Modal.show('newstyle', examples) || false; };
    Editor.prototype.browseSource = views.Browser.sourceHandler(Modal, cwd);
    Editor.prototype.browseStyle = views.Browser.styleHandler(Modal, cwd);
    Editor.prototype.user = function() {
        window.location.href = window.location.origin + '/unauthorize';
        return false;
    };
    Editor.prototype.scrollto = function(ev) {
        id = $(ev.currentTarget).attr('href').split('#').pop();
        document.getElementById(id).scrollIntoView();
        return false;
    };
    Editor.prototype.tabbedFields = function(ev) {
        $(ev.currentTarget).parent('.layer').addClass('active').siblings('.layer').removeClass('active');
        return false;
    };
    Editor.prototype.togglePane = function(name) {
        var loc = location.href;
        if (loc.indexOf('#' + name) === -1) {
            location.href = loc.substring(0, loc.indexOf('#')) + '#' + name;
        } else {
            location.href = loc.replace('#' + name, '#');
        }
    };
    Editor.prototype.togglemode = function(ev) {
        var target = $(ev.currentTarget);
        switch (target.attr('href').split('#editor-').pop()) {
            case 'sql':
                $('body').addClass('sql').removeClass('conf').removeClass('fields');
                break;
            case 'conf':
                $('body').addClass('conf').removeClass('sql').removeClass('fields');
                break;
            case 'fields':
                $('body').addClass('fields').removeClass('sql').removeClass('conf');
                break;
        }
        tabbedHandler(ev);
        return false;
    };
    Editor.prototype.resetmode = function(ev) {
        $('body').removeClass('fields').removeClass('sql').removeClass('conf');
        $('.editor a.js-tab[href=#editor-conf]').addClass('active').siblings('a').removeClass('active');
    };
    Editor.prototype.togglelayer = function(ev) {
        var $target = $(ev.currentTarget);
        var $siblings = $('.js-xrayswatch');
        if (ev.shiftKey) {
            $siblings.hasClass('disabled') ? $siblings.removeClass('disabled') : $siblings.addClass('disabled');
            $target.removeClass('disabled');
            window.location.href === '#refresh';
            return false;
        } else {
            $target.toggleClass('disabled');
        }
    };
    Editor.prototype.addlayerModal = function(ev) {
        Modal.show('addlayer');
        return false;
    };
    Editor.prototype.addlayerSubmit = function(ev, filepath) {
        // Set map in loading state
        $('#full').addClass('loading');
        var filepath = filepath || $('#addlayer input[name=Datasource-file]').val();
        var extension = filepath.split('.').pop().toLowerCase();
        $.ajax({
            url: '/metadata?file=' + filepath,
            success: function(metadata) {
                // Clear loading state
                $('#full').removeClass('loading');
                if (extension === 'tif' || extension === 'vrt') window.editor.addlayer(extension, [{'id':metadata.filename}], filepath, metadata);
                else window.editor.addlayer(extension, metadata.json.vector_layers, filepath, metadata);
                window.editor.changed();
            },
            error: function(jqXHR, textStatus, errorThrown) {
                // Clear loading state
                $('#full').removeClass('loading');
                Modal.show('error', jqXHR.responseText);
            }
        });
        return false;
    };
    Editor.prototype.updatenameModal = function(ev) {
        //send layer id to update modal
        var id = $(ev.currentTarget).attr('id').split('updatename-').pop();
        Modal.show('updatename', {'id':id});
        return false;
    };
    Editor.prototype.addDatabase = function(ev) {
        var type = $(ev.currentTarget).attr('href').split('#add-db-').pop();

        // Pick the first data_n layername that is not already taken.
        var i = 0;
        var id = 'data';
        while (layers[id]) { id = 'data_' + (++i); }

        var layer = {
            tm: tm,
            id: id,
            properties: { 'buffer-size': 8 },
            Datasource: { type: type }
        };
        $('#editor').prepend(templates['layer' + type](layer));
        $('#layers .js-layer-content').prepend(templates.layeritem(layer));
        layers[id] = Layer(id, layer.Datasource);
        orderLayers();
        Modal.close();
        window.location.hash = '#layers-' + id;
        $('#layers .js-layer-content').sortable('destroy').sortable();
        return false;
    };
    function consistentSourceType(metadata){
        var sourceType = $('.js-layer .datasourceType').val();
        if(sourceType === undefined) return true;
        //if adding raster among vector sources
        else if(sourceType !== 'gdal' && metadata.hasOwnProperty('raster')) return false;
        //if adding vector among raster sources
        else if(sourceType === 'gdal' && !metadata.hasOwnProperty('raster')) return false;
        else return true;
    };

    Editor.prototype.addlayer = function(filetype, layersArray, filepath, metadata) {
        var consistent = consistentSourceType(metadata);

        if (!consistent) return Modal.show('error', 'Projects are restricted to entirely raster layers or entirely vector layers.');

        layersArray.forEach(function(current_layer, index, array) {
            //mapnik-omnivore replaces spaces with underscores for metadata.json.vector_layers[n].id
            //so this is just reversing that process in order to properly render the mapnikXML for Mapbox Studio
            //This only applies to files that have gone through mapnik-omnivore
            var layername = metadata ? (current_layer.id).split('_').join(' ') : current_layer.id;

            //mapnik-omnivore sets all geojson file id's to 'OGRGeojson' so that it's readable for mapnik.
            //To avoid all geojson layers having the same name, replace id with the filename.
            if (filetype === 'geojson') current_layer.id = metadata.filename;

            //All gpx files have the same three layer names (wayponts, routes, tracks)
            //Append filename to differentiate
            if (filetype === 'gpx') current_layer.id = metadata.filename + '_' + current_layer.id;

            //checks that the layer doesn't already exist
            if (layers[current_layer.id]) return Modal.show('error', 'Layer name must be different from existing layer "' + current_layer.id + '"');

            //Setup layer object
            var layer = {
                tm: tm,
                id: current_layer.id.replace(/[^\w+-]/gi, '_'),
                srs: metadata.projection,
                properties: {
                    'buffer-size': 8
                },
                Datasource: {
                    type: metadata.dstype,
                    file: filepath,
                    layer: layername
                }
            };

            if (metadata.dstype === 'gdal') {
                layer.nodata = metadata.raster.nodata;
                layer.Datasource.nodata = metadata.raster.nodata;
            }

            //Add the new layer form and div
            $('#editor').prepend(templates['layer' + layer.Datasource.type](layer));
            $('#layers .js-layer-content').prepend(templates.layeritem(layer));

            //Add new layer to the project's layers array
            layers[layer.id] = Layer(layer.id, layer.Datasource);
            orderLayers();

            //set maxzoom, if needed
            var maxzoomTarget = $('.max');
            if (maxzoomTarget.val() < metadata.maxzoom) maxzoomTarget.val(metadata.maxzoom);

            //show new layer
            var center = metadata.center;
            map.setView([center[1], center[0]], metadata.maxzoom);

            //open proper modal, depending on if there are multiple layers
            if (layersArray.length > 1) {
                window.location.hash = '#';
                $('#layers .js-layer-content').sortable('destroy').sortable();
            } else {
                window.location.hash = '#layers-' + layersArray[0].id;
                $('#layers .js-layer-content').sortable('destroy').sortable();
            }

            analytics.track('source add layer', { type: filetype, projection: metadata.projection });
        });
    };
    Editor.prototype.deletelayer = function(ev) {
        var id = $(ev.currentTarget).attr('id').split('del-').pop();
        if (!layers[id]) return false;
        Modal.show('confirm', 'Remove layer "' + id + '"?', function(err, confirm) {
            if (err) return Modal.show('error', err);
            if (!confirm) return;
            layers[id].form.remove();
            layers[id].item.remove();
            $('#layers .js-layer-content').sortable('destroy').sortable();
            delete layers[id];
            window.location.href = '#';
        });
        return false;
    };
    //This only applies to single-layer sources at the moment
    Editor.prototype.refreshSource = function(ev) {
        // Set map in loading state
        $('#full').addClass('loading');

        // 'id' will remain consistent between the old and the new, since 'id' comes from the name of the actual file. So var 'id'
        // and var 'new_layer.id' will be the same thing in this function.
        // A source's 'id' is set in mapnik-omnivore here: https://github.com/mapbox/mapnik-omnivore/blob/master/lib/datasourceProcessor.js#L32
        // There's no way for the id to change as long as the filepath is the same.
        var id = $(ev.currentTarget).attr('id').split('refresh-').pop();
        if (!layers[id]) return false;
        var layerform = '#layers-' + id;
        var filepath = $(layerform + ' .filepath').val();

        //Retain current settings to copy over
        var layer = layers[id].get();

        //Get updated metadata from source
        $.ajax({
          url: '/metadata?file=' + filepath,
          success: function(metadata) {
            // Clear loading state
            $('#full').removeClass('loading');
            //Transfer new maxzoom, if relevant
            var maxzoomTarget = $('.max');
            if (maxzoomTarget.val() < metadata.maxzoom) maxzoomTarget.val(metadata.maxzoom);

            //Transfer current field descriptions to the new fields, if relevant
            var new_fields = metadata.json.vector_layers[0].fields;
            var current_fields = layer.fields;
            for(var field in new_fields){
              if(current_fields.field !== undefined) new_fields[field] = current_fields[field];
            };
            layer.fields = new_fields;

            //Transfer new projection
            layer.srs = metadata.projection;

            //Add new layer and replace old in the project's layers array
            layers[layer.id] = Layer(layer.id, layer.Datasource);

            //Save
            window.editor.save();
          },
          error: function(jqXHR, textStatus, errorThrown) {
            // Clear loading state
            $('#full').removeClass('loading');
            Modal.show('error', 'Cannot refresh source. ' + jqXHR.responseText);
          }
        });
        return false;
    };
    //This only applies to single-layer sources and PostGIS/SQLite
    Editor.prototype.updateLayername = function(ev) {
      //Retain current settings to copy over
      var current_id = $('#current_id').val();
      var layer = layers[current_id].get();
      var new_id = $('#newLayername').val();

      // No-op.
      if (current_id === new_id) {
        Modal.close();
        return false;
      }

      // Replace old layer/form
      layer.id = new_id;
      layers[current_id].form.replaceWith(templates['layer' + layer.Datasource.type](layer));
      layers[current_id].item.replaceWith(templates.layeritem(layer));
      delete layers[current_id];
      layers[layer.id] = Layer(layer.id, layer.Datasource);

      //Close
      Modal.close();
      $('#layers .js-layer-content').sortable('destroy').sortable();
      window.location.href = '#layers-' + new_id;

      return false;

    };
    Editor.prototype.error = function(model, resp) {
        $('#full').removeClass('loading');
        if (resp.responseText) {
            var json;
            try {
                json = JSON.parse(resp.responseText);
            } catch (err) {}
            Modal.show('error', json ? json.message : resp.responseText);
        } else {
            Modal.show('error', 'Could not save source "' + model.id + '"');
        }
    };
    Editor.prototype.save = function(ev, options) {
        // Set map in loading state.
        $('#full').addClass('loading');
        // Clear focus from any fields.
        $('#settings-drawer input, #settings-drawer textarea').blur();
        // Grab settings form values.
        var attr = _($('#settings-drawer').serializeArray()).reduce(function(memo, field) {
            memo[field.name] = parseInt(field.value, 10).toString() === field.value ? parseInt(field.value, 10) : field.value;
            return memo;
        }, this.model.attributes);
        // Grab layers. Reverse at save time.
        attr.Layer = _(layers).map(function(l) {
            return l.get();
        });
        attr.Layer.reverse();
        // Save center, disabled layers.
        attr._prefs = attr._prefs || {};
        if (this.model.get('_prefs').saveCenter) {
            var zoom = Math.min(Math.max(map.getZoom(),attr.minzoom),attr.maxzoom);
            var lon = map.getCenter().lng % 360;
            lon += (lon < -180) ? 360 : (lon > 180) ? -360 : 0;
            attr.center = [lon, map.getCenter().lat, zoom];
        }
        attr._prefs.disabled = _($('#layers .layer').map(function(v) {
            return $('.js-xrayswatch.disabled', this).size() ? $(this).attr('id') : false;
        })).compact();
        // New mtime querystring.
        mtime = (+new Date).toString(36);
        options = options || {
            success: _(this.refresh).bind(this),
            error: _(this.error).bind(this)
        };
        this.model.save(attr, options);
        return ev && !! $(ev.currentTarget).is('a');
    };

    Editor.prototype.refresh = function(ev) {
        $('#full').removeClass('loading');
        $('body').removeClass('changed');
        if (!map) {
            map = L.mapbox.map('map');
            map.setView([this.model.get('center')[1], this.model.get('center')[0]], this.model.get('center')[2]);
            map.on('zoomend', function() {
                $('#zoomedto').attr('class', 'align-top inline contain zoom' + (map.getZoom() | 0));
            });
            $('#map-center').text([this.model.get('center')[1].toFixed(4) + ', ' + this.model.get('center')[0].toFixed(4)]);
            map.on('moveend', function(e) {
                $('#map-center').text(map.getCenter().lat.toFixed(4) + ', ' + map.getCenter().lng.toFixed(4));
            });
            map.on('click', inspectFeature({
                id: this.model.id,
                type: 'source',
                map: map
            }));
            new views.Maputils({
                el: $('#view'),
                map: map,
                model: this.model
            });
        }
        map.options.minZoom = this.model.get('minzoom');
        map.options.maxZoom = 22;
        // Refresh map layer.
        if (tiles) map.removeLayer(tiles);
        tiles = L.mapbox.tileLayer({
            tiles: ['/source/{z}/{x}/{y}.png?id=' + this.model.id + '&' + mtime],
            minzoom: this.model.get('minzoom'),
            maxzoom: 22
        }).on('tileload', statHandler('srcbytes')).on('load', errorHandler).addTo(map);
        // Refresh map title.
        $('title, .js-name').text(this.model.get('name') || 'Untitled');
        // Clear save notice.
        if (window.location.hash === '#refresh') {
            window.location.hash = '#';
        }
        // Rerender fields forms.
        _(layers).each(function(l) {
            l.refresh();
        });

        return false;
    };
    Editor.prototype.browsefile = function(ev) {
        Modal.show('browser', {
            id: 'browsefile',
            cwd: cwd,
            label: 'Select'
        });
        var target = $(ev.currentTarget).siblings('input[name=Datasource-file]');
        $('.browsefile-pending').removeClass('browsefile-pending');
        target.addClass('browsefile-pending');
        $('#browsefile input[name=basename]').attr('title', target.attr('title'));
        $('#browsefile input[name=basename]').attr('pattern', target.attr('pattern'));
        $('#browsefile input[name=basename]').attr('placeholder', target.attr('placeholder'));
        var pattern = target.attr('pattern') && new RegExp(target.attr('pattern'));
        // File browser.
        new views.Browser({
            el: $('#browsefile'),
            filter: function(file) {
                if (pattern) {
                    return file.type === 'dir' || pattern.test(file.basename);
                } else {
                    return file.type === 'dir';
                }
            },
            isFile: function(file) {
                if (pattern) {
                    return file.type === 'dir' || pattern.test(file);
                } else {
                    return file.type === 'dir';
                }
            },
            callback: function(err, filepath) {
                if (err || !target.size()) {
                    window.location.href = '#';
                } else {
                    target.val(filepath);
                    var form = $(target).parents('form');
                    if (form.is('#addlayer')) {
                        Modal.close();
                        window.editor.addlayerSubmit(null, filepath);
                    } else {
                        Modal.close();
                    }
                }
            }
        });
    };

    Editor.prototype.delstyle = delStyle;
    Editor.prototype.tabbed = tabbedHandler;
    Editor.prototype.zoomToLayer = function(ev) {
        var id = $(ev.currentTarget).attr('id').split('zoom-').pop();
        var filepath = layers[id].get().Datasource.file;

        // Set map in loading state
        $('#full').addClass('loading');

        $.ajax({
            url: '/metadata?file=' + filepath,
            success: function(metadata) {
                // Clear loading state
                $('#full').removeClass('loading');
                var center = metadata.center;
                map.setView([center[1], center[0]], metadata.maxzoom);
            },
            error: function(jqXHR, textStatus, errorThrown) {
                // Clear loading state
                $('#full').removeClass('loading');
                Modal.show('error', 'Cannot access source metadata. ' + jqXHR.responseText);
            }
        });
    };
    Editor.prototype.sourceNewStyle = function(){
        Modal.show('sourcenewstyle', {source:source});
    };
    window.editor = new Editor({
        el: document.body,
        model: new Source(source)
    });
    window.editor.refresh();

    window.onhashchange = function(ev) {
        analytics.page({hash:window.location.hash});
    };

    // Sortable layers for local sources.
    if (source.id.indexOf('tmsource://' === 0)) {
        $('#layers .js-layer-content').sortable();
        $('#layers .js-layer-content').bind('sortupdate', orderLayers);
    }
};
