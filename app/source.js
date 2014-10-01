window.Source = function(templates, cwd, tm, source, revlayers, examples, filters) {
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
            item: $('#layers [data-layer=' + id + ']')
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
                    case 'vtfx':
                        memo = memo || {};
                        memo[group] = memo[group] || [];
                        var vtfx = name.split('-')[0];
                        var filter = name.split('-')[1];
                        var hash = name.split('-')[2];
                        if (memo[group][memo[group].length -1] && memo[group][memo[group].length -1].hash === hash){
                            memo[group][memo[group].length -1][filter] = field.value;
                            break;
                        }
                        var entry = {};
                        entry.id = vtfx;
                        entry[filter] = field.value;
                        memo[group].push(entry);
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
            return $(this).attr('data-layer');
        }).get();
        layers = _(ids).reduce(function(memo, id) {
            memo[id] = layers[id];
            return memo;
        }, {});
    };
    var VTFX = function(id) {
        var processor = {
            form: $('#layers-' + id),
            item: $('#layers [data-layer=' + id + ']')
        };
        processor.refresh = function() {
            var p = _(editor.model.get('vtfx')).find(function(v, k) {
                if (k === id) return true;
            });

            var v = {
                id: id,
                vtfx: p,
                filters: filters
            };

            $('div.vtfx', processor.form).html(templates.layervtfx(v));
        };
        processor.get = function() {
            var attr = _($('#layers-' + id).serializeArray()).reduce(function(memo, field) {
                // @TODO determine what causes empty field names.
                if (!field.name) return memo;
                var fields = field.name.split('-');
                var group = fields[0];
                var vtfx = fields[1];
                var filter = fields[2];
                var hash = fields[3];
                var name = fields.slice(4).join('-');
                switch (group) {
                    case 'vtfx':
                        memo = memo || {};
                        memo[name] = memo[name] || [];
                        if (memo[name][memo[name].length -1] && memo[name][memo[name].length -1].hash === hash){
                            memo[name][memo[name].length -1][filter] = field.value;
                            break;
                        }
                        var entry = {};
                        entry.id = vtfx;
                        entry.hash = hash;
                        entry[filter] = field.value;
                        memo[name].push(entry);
                        break;
                    default:
                        break;
                }
                return memo;
            }, {});
            return attr;
        };
        return processor;
    };
    var vtfx = _(revlayers).reduce(function(memo, l) {
        memo[l.id] = VTFX(l.id);
        return memo;
    }, {});
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
        'click .js-newproject': 'newProject',
        'click .js-sourcenewstyle': 'sourceNewStyle',
        'click .js-browseproject': 'browseProject',
        'click .js-save': 'save',
        'click .js-offpane': 'offPane',
        'click .js-onpane': 'onPane',
        'click .js-saveas': 'saveModal',
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
        'click .js-zoom-to': 'zoomToLayer',
        'click .js-lockCenter': 'lockCenter',
        'change .filter-select': 'refreshFilters',
        'click .js-addfilter': 'addFilter',
        'click .js-removefilter': 'removeFilter'
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
            case (which === 82): // r for refresh
                this.update();
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

    Editor.prototype.onPane = function(ev) {
        var id = $(ev.currentTarget).attr('href').split('-').pop();
        $('form.pane').removeClass('target');
        $('#layers-' + id).addClass('target');
        return false;
    };

    Editor.prototype.offPane = function() {
        $('form.pane').removeClass('target');

        // refresh map.
        this.update();
    };

    Editor.prototype.saveModal = function() {
        Modal.show('browsersave', {
            type: 'source',
            cwd: cwd
        });
        new views.Browser({
            el: $('.modal-content #saveas'),
            filter: function(file) { return file.type === 'dir' || (/\.tm2source$/.test(file.basename) || /\.tm2$/.test(file.basename)) },
            isProject: function(file) {
              return (/\.tm2source$/.test(file) || /\.tm2$/.test(file));
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
                        $('body').removeClass('changed');
                        window.location = '/source?id=' + id;
                    },
                    error: _(window.editor.error).bind(window.editor)
                });
                return false;
            }
        });
        return false;
    };
    Editor.prototype.newProject = function() { return Modal.show('newproject', examples) || false; };
    Editor.prototype.browseProject = views.Browser.projectHandler(Modal, cwd);
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
    Editor.prototype.togglelayer = function(ev) {
        var $target = $(ev.currentTarget);
        var $siblings = $('.js-xrayswatch');
        if (ev.shiftKey) {
            $siblings.hasClass('disabled') ? $siblings.removeClass('disabled') : $siblings.addClass('disabled');
            $target.removeClass('disabled');
            this.update();
            return false;
        } else {
            $target.toggleClass('disabled');
            this.update();
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
            Datasource: { type: type },
            filters: filters,
            vtfx: vtfx
        };

        $('#editor').prepend(templates['layer' + type](layer));
        $('#layers .js-layer-content').prepend(templates.layeritem(layer));
        layers[id] = Layer(id, layer.Datasource);
        orderLayers();
        Modal.close();
        $('#layers-' + id).addClass('target');
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
        var view = this;
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
                },
                filters: filters
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

            //Add new layer to the project's processors/vtfx array
            vtfx[layer.id] = VTFX(layer.id);

            view.changed();
            view.update();

            //set maxzoom, if needed
            var maxzoomTarget = $('.max');
            if (maxzoomTarget.val() < metadata.maxzoom) maxzoomTarget.val(metadata.maxzoom);

            //show new layer
            var center = metadata.center;
            map.setView([center[1], center[0]], metadata.maxzoom);

            //open proper modal, depending on if there are multiple layers
            if (layersArray.length > 1) {
                $('#layers .js-layer-content').sortable('destroy').sortable();
            } else {
                $('#layers-' + layersArray[0].id).addClass('target');
                $('#layers .js-layer-content').sortable('destroy').sortable();
            }

            analytics.track('source add layer', { type: filetype, projection: metadata.projection });
        });
        $('.layer-content ~ .empty-state').removeClass('visible');
    };
    Editor.prototype.deletelayer = function(ev) {
        var view = this;
        var id = $(ev.currentTarget).attr('id').split('del-').pop();
        if (!layers[id]) return false;
        Modal.show('confirm', 'Remove layer "' + id + '"?', function(err, confirm) {
            if (err) return Modal.show('error', err);
            if (!confirm) return;
            layers[id].form.remove();
            layers[id].item.remove();
            $('#layers .js-layer-content').sortable('destroy').sortable();
            delete layers[id];
            delete vtfx[id];

            // set layer empty state if there are no layers
            if ($('.layer-content:has(div)').length === 0) {
                $('.layer-content ~ .empty-state').addClass('visible');
            }

            view.changed();
            view.update();
        });
        return false;
    };
    //This only applies to single-layer sources at the moment
    Editor.prototype.refreshSource = function(ev) {
        var view = this;
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
            layer.vtfx = vtfx;

            //Transfer new projection
            layer.srs = metadata.projection;

            //Add new layer and replace old in the project's layers array
            layers[layer.id] = Layer(layer.id, layer.Datasource);
            vtfx[layer.id] = VTFX(layer.id);

            //Update
            view.changed();
            view.update();

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
        var processor = vtfx[current_id].get();

        // No-op.
        if (current_id === new_id) {
        Modal.close();
        return false;
        }

        // Replace old layer/form
        layer.id = new_id;
        layer.filters = filters;

        layers[current_id].form.replaceWith(templates['layer' + layer.Datasource.type](layer));
        $('.js-layer[data-layer=' + current_id + ']').replaceWith(templates.layeritem(layer));
        layers[current_id].item.replaceWith(templates.layeritem(layer));
        delete layers[current_id];
        layers[layer.id] = Layer(layer.id, layer.Datasource);

        // Replace old processor/vtfx
        var v = {
            id: new_id,
            vtfx: processor[current_id],
            filters: filters
        };
        delete vtfx[current_id];
        vtfx[v.id] = VTFX(v.id);

        // Close modal
        Modal.close();
        $('#layers .js-layer-content').sortable('destroy').sortable();
        $('#layers-' + new_id).addClass('target');

        this.changed();

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

    Editor.prototype.update = function(ev) {
      this.save(null, null, true);
    };

    Editor.prototype.save = function(ev, options, refresh) {
        // If map is temporary and permanent save is requested go into saveas flow.
        if (this.model.id.indexOf('tmpsource:') === 0 && !refresh) return this.saveModal();

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

        attr.vtfx = {};
        _(vtfx).each(function(p, k) {
            p = p.get()[k];
            if (p) {
                delete p[0].hash;
            }
            attr.vtfx[k] = p;
        });

        // Grab map center which is dependent upon the "last saved" value.
        attr._prefs = attr._prefs || this.model.attributes._prefs || {};
        attr._prefs.saveCenter = !$('.js-lockCenter').is('.active');
        attr.center = $('.js-savedCenter').text().split(',');
        attr.center[0] = parseFloat(attr.center[0]);
        attr.center[1] = parseFloat(attr.center[1]);
        attr.center[2] = parseInt(attr.center[2], 10);
        // Force center zoom to be within min/max zoom range.
        if (attr._prefs.saveCenter) {
            attr.center[2] = Math.min(Math.max(attr.center[2],attr.minzoom),attr.maxzoom);
        }

        // Save disabled layers.
        attr._prefs.disabled = _($('#layers .layer').map(function(v) {
            return $('.js-xrayswatch.disabled', this).size() ? $(this).attr('data-layer') : false;
        })).compact();
        // New mtime querystring.
        mtime = (+new Date).toString(36);
        options = options || {
            success: _(function() {
                if (!refresh) $('body').removeClass('changed');
                this.refresh();
            }).bind(this),
            error: _(this.error).bind(this)
        };
        // Set refresh option in querystring.
        if (refresh) options.url = this.model.url() + '&refresh=1';

        this.model.save(attr, options);
        return ev && !! $(ev.currentTarget).is('a');
    };

    Editor.prototype.refresh = function(ev) {
        if (!map) {
            map = L.mapbox.map('map');
            map.setView([this.model.get('center')[1], this.model.get('center')[0]], this.model.get('center')[2]);
            this.map = map;

            map.on('zoomend', function() {
                $('#zoomedto').attr('class', 'align-top inline contain zoom' + (map.getZoom() | 0));
            });

            function setCenter(e) {
                $('.js-mapCenter').text(map.getCenter().wrap().lng.toFixed(4) + ', ' + map.getCenter().wrap().lat.toFixed(4));
                if (!$('.js-lockCenter').is('.active')) $('.js-savedCenter').text(
                    map.getCenter().wrap().lng.toFixed(4) + ',' +
                    map.getCenter().wrap().lat.toFixed(4) + ',' +
                    map.getZoom()
                );
            }
            setCenter();
            map.on('moveend', setCenter);
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
        }).on('tileload', statHandler('srcbytes')).on('load', errorHandler).addTo(map).on('ready',$('#full').removeClass('loading'));
        // Refresh map title.
        $('title, .js-name').text(this.model.get('name') || 'Untitled');

        // Rerender fields forms.
        _(layers).each(function(l) {
            l.refresh();
        });
        _(vtfx).each(function(p) {
            p.refresh();
        });

        return false;
    };
    Editor.prototype.browsefile = function(ev) {
        Modal.show('browser', {
            title: 'Browse files',
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
                var center = metadata.center,
                    zoom = Math.max(metadata.minzoom, metadata.maxzoom - 1);
                map.setView([center[1], center[0]], zoom);
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
    Editor.prototype.lockCenter = function(ev) {
        $(ev.currentTarget).toggleClass('active');
        this.changed();
        return false;
    };
    Editor.prototype.refreshFilters = function(ev) {
        var id = ev.currentTarget.attributes.getNamedItem('layer').value;

        $('.tmpvtfx.'+id).replaceWith(templates.layervtfxfields({parameters: filters[ev.currentTarget.value], name: ev.currentTarget.value, id: id}));
        this.changed();
    };
    Editor.prototype.addFilter = function(ev) {
        var id = ev.currentTarget.attributes.getNamedItem('layer').value;

        var attr = _($('.vtfx-' + id).serializeArray()).reduce(function(memo, field) {
            // @TODO determine what causes empty field names.
            if (!field.name) return memo;
            var fields = field.name.split('-');
            var group = fields[0];
            var vtfx = fields[1];
            var filter = fields[2];
            switch (group) {
                case 'tmpvtfx':
                    memo = memo || {};
                    memo.id = vtfx;
                    memo[filter] = field.value;
                    break;
                default:
                    break;
            }
            return memo;
        }, {});

        $('.vtfx-'+id + ' .saved').append(templates.layervtfxsaved({vtfx: [attr], filters: filters, id: id}));
        $('.tmpvtfx.'+id).replaceWith(templates.layervtfxfields({parameters: filters[attr.id], name: attr.id, id: id}));

        //Add new layer to the project's processors/vtfx array
        vtfx[id] = VTFX(id);

        this.changed();
    };
    Editor.prototype.removeFilter = function(ev) {
        var id = ev.currentTarget.attributes.getNamedItem('layer').value;
        $(ev.currentTarget.parentElement).remove();
    };

    window.editor = new Editor({
        el: document.body,
        model: new Source(source)
    });
    window.editor.refresh();

    window.onhashchange = function(ev) {
        analytics.page({hash:window.location.hash});
    };

    if ('onbeforeunload' in window) window.onbeforeunload = function() {
        if ($('body').hasClass('changed')) return 'You have unsaved changes.';
    };

    // Set empty state for layer list
    if ($('.layer-content:has(div)').length === 0) {
        $('.layer-content ~ .empty-state').addClass('visible');
    }

    // Sortable layers for local sources.
    $('#layers .js-layer-content').sortable();
    $('#layers .js-layer-content').bind('sortupdate', orderLayers);
};
