window.Source = function(templates, cwd, tm, source, revlayers) {
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
            var fields = l.fields || {};
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
    var Source = Backbone.Model.extend({});
    Source.prototype.url = function() {
        return '/source.json?id=' + this.get('id');
    };
    var Modal = new views.Modal({
        el: $('.modal-content'),
        templates: templates
    });
    var Editor = Backbone.View.extend({});
    Editor.prototype.events = {
        'click .js-browsesource': 'browseSource',
        'click .js-browsestyle': 'browseStyle',
        'click .js-save': 'save',
        'click .js-saveas': 'saveModal',
        'click .js-reset-mode': 'resetmode',
        'click .editor .js-tab': 'togglemode',
        'click .layer .js-delete': 'deletelayer',
        'click .layer .js-refreshSource': 'refreshSource',
        'click .layer .js-xrayswatch': 'togglelayer',
        'click .js-browsefile': 'browsefile',
        'click #history .js-tab': 'tabbed',
        'click #history .js-ref-delete': 'delstyle',
        'click #settings .js-tab': 'tabbed',
        'click #docs .js-docs-nav': 'scrollto',
        'click .layer .js-tab': 'tabbedFields',
        'click .js-addlayer': 'addlayerModal',
        'submit #addlayer': 'addDatabase',
        'keydown': 'keys',
        'click .js-zoomTo': 'zoomToLayer'
    };
    Editor.prototype.keys = function(ev) {
        // Escape. Collapses windows, dialogs, modals, etc.
        if (ev.which === 27) {
            if (Modal.active) Modal.close();
            window.location.href = '#';
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
            case (which === 72): // h for help
                ev.preventDefault();
                this.togglePane('docs');
                break;
            case (which === 220): // \ for settings
                ev.preventDefault();
                this.togglePane('settings');
                break;
            case (which === 66): // b for bookmarks
                ev.preventDefault();
                this.togglePane('bookmark');
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
    Editor.prototype.browseSource = function() {
        Modal.show('browseropen', {
            type: 'source',
            cwd: cwd
        });
        new views.Browser({
            el: $('.modal-content #browsesource'),
            filter: function(file) {
                return file.type === 'dir' || (/\.tm2source$/.test(file.basename) || /\.tm2$/.test(file.basename));
            },
            isFile: function(file) {
                return (/\.tm2source$/.test(file) || /\.tm2$/.test(file.basename));
            },
            callback: function(err, filepath) {
                if (err) return false; // @TODO
                window.location = '/source?id=tmsource://' + filepath;
                return false;
            }
        });
        return false;
    };
    Editor.prototype.browseStyle = function() {
        Modal.show('browseropen', {
            type: 'style',
            cwd: cwd
        });
        new views.Browser({
            el: $('.modal-content #browsestyle'),
            filter: function(file) {
                return file.type === 'dir' || /\.tm2$/.test(file.basename);
            },
            isFile: function(file) {
                return /\.tm2$/.test(file);
            },
            callback: function(err, filepath) {
                if (err) return false; // @TODO
                filepath = filepath.replace(/\.tm2/, '') + '.tm2';
                window.location = '/style?id=tmstyle://' + filepath;
                return false;
            }
        });
        return false;
    };
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
        $(ev.currentTarget).toggleClass('disabled');
    };
    Editor.prototype.addlayerModal = function() {
        Modal.show('addlayer');
        return false;
    };
    Editor.prototype.addDatabase = function(ev) {
        var values = _($('#addDatabase').serializeArray()).reduce(function(memo, field) {
            memo[field.name] = field.value;
            return memo;
        }, {});
        if (!values.id || !templates['layer' + values.type]) return false;
        if (!layers[values.id]) {
            var layer = {
                tm: tm,
                vt: {},
                id: values.id,
                properties: {
                    'buffer-size': 8
                },
                Datasource: {
                    type: values.type
                }
            };
            $('#editor').prepend(templates['layer' + values.type](layer));
            $('#layers .js-menu-content').prepend(templates.layeritem(layer));
            //set projection and allow edits
            var projTarget = $('#layers-' + layer.id + ' .js-metadata-projection');
            projTarget.attr('readonly', false);
            layers[values.id] = Layer(values.id, layer.Datasource);
            Modal.close();
            window.location.hash = '#layers-' + values.id;
            $('#layers .js-menu-content').sortable('destroy').sortable();
        } else {
            Modal.show('error', 'Layer name must be different from existing layer "' + values.id + '"');
        }
        return false;
    };
    Editor.prototype.addlayer = function(filetype, layersArray, filepath, metadata) {
        layersArray.forEach(function(current_layer, index, array) {
            //mapnik-omnivore replaces spaces with underscores for metadata.json.vector_layers[n].id
            //so this is just reversing that process in order to properly render the mapnikXML for TM2
            //This only applies to files that have gone through mapnik-omnivore
            var layername;
            if (metadata !== null) layername = (current_layer.id).split('_').join(' ');
            else layername = current_layer.id;
            //mapnik-omnivore sets all geojson file id's to 'OGRGeojson' so that it's readable for mapnik.
            //To avoid all geojson layers having the same name, replace id with the filename. 
            if (filetype === 'geojson') current_layer.id = metadata.filename;
            //All gpx files have the same three layer names (wayponts, routes, tracks)
            //Append filename to differentiate
            if (filetype === 'gpx') current_layer.id = metadata.filename + '_' + current_layer.id;
            //checks that the layer doesn't already exist
            if (!layers[current_layer.id]) {
                //Setup layer object
                var layer = {
                    tm: tm,
                    vt: {},
                    id: current_layer.id,
                    properties: {
                        'buffer-size': 8
                    },
                    Datasource: {
                        type: metadata.dstype,
                        file: filepath,
                        layer: layername
                    }
                };
                $('#editor').prepend(templates['layer' + metadata.dstype](layer));
                $('#layers .js-menu-content').prepend(templates.layeritem(layer));
                //Add new layer to the project's layers array
                layers[layer.id] = Layer(layer.id, layer.Datasource);
                //set projection and readonly
                var projTarget = $('#layers-' + layer.id + ' .js-metadata-projection');
                projTarget.val(metadata.projection);
                projTarget.attr('readonly', true);
                //set maxzoom, if needed
                var maxzoomTarget = $('.max');
                if (maxzoomTarget.val() < metadata.maxzoom) maxzoomTarget.val(metadata.maxzoom);
                
                //open proper modal, depending on if there are multiple layers
                Modal.close();
                if (layersArray.length > 1) {
                    window.location.hash = '#';
                    $('#layers .js-menu-content').sortable('destroy').sortable();
                } else {
                    window.location.hash = '#layers-' + layersArray[0].id;
                    $('#layers .js-menu-content').sortable('destroy').sortable();
                }
                //else layer already exists, show error  
            } else {
                Modal.show('error', 'Layer name must be different from existing layer "' + current_layer.id + '"');
            }
        });
    };
    Editor.prototype.deletelayer = function(ev) {
        var id = $(ev.currentTarget).attr('id').split('-').pop();
        if (!layers[id]) return false;
        if (confirm('Remove layer "' + id + '"?')) {
            layers[id].form.remove();
            layers[id].item.remove();
            $('#layers .js-menu-content').sortable('destroy').sortable();
            delete layers[id];
        }
        window.location.href = '#';
        return false;
    };
    //This only applies to single-layer sources at the moment
    Editor.prototype.refreshSource = function(ev) {
        // 'id' will remain consistent between the old and the new, since 'id' comes from the name of the actual file. So var 'id'
        // and var 'new_layer.id' will be the same thing in this function.
        // A source's 'id' is set in mapnik-omnivore here: https://github.com/mapbox/mapnik-omnivore/blob/master/lib/datasourceProcessor.js#L32
        // There's no way for the id to change as long as the filename/filepath is the same. The user would have to create an
        // entirely new datasource with the new filename/filepath in order to change the id. 
        var id = $(ev.currentTarget).attr('id').split('-').pop();
        if (!layers[id]) return false;
        var layerform = '#layers-' + id;
        var filepath = $(layerform + ' .filepath').val();
        $.ajax({
          url: '/metadata?file=' + filepath,
          success: function(metadata) {
            //id will remain consistent between the old and the new, since 'id' comes from the name of the actual file.
            //This is set in mapnik-omnivore here: https://github.com/mapbox/mapnik-omnivore/blob/master/lib/datasourceProcessor.js#L32
            //There's no way for the id to change as long as the filename/filepath is the same. The user would have to create an
            //entirely new datasource with the new filename/filepath in order to change the id.
            var new_layer = metadata.json.vector_layers[0];

            //mapnik-omnivore replaces spaces with underscores for metadata.json.vector_layers[n].id
            //so this is just reversing that process in order to properly render the mapnikXML for TM2
            //This only applies to files that have gone through mapnik-omnivore
            //Used for Datasource only
            var layername = (new_layer.id).split('_').join(' ');
            
            //Setup new layer object
            var layer = {
              tm: tm,
              vt: {},
              id: new_layer.id,
              properties: {
               'buffer-size': 8
              },
              Datasource: {
                type: metadata.dstype,
                file: filepath,
                layer: layername
              }
            };
            //Retain current settings to copy over
            var current_state = layers[id].get();
            //Add new layer and replace old in the project's layers array
            layers[layer.id] = Layer(layer.id, layer.Datasource);
            
            //Grab current settings in case they've been changed by user and apply them to refreshed modal
            //Set buffer size from current modal
            $('#' + layer.id + '-buffer-size').val(current_state.properties['buffer-size']);
            //Set description from current modal
            $(layerform + ' input[name=description]').val(current_state.description);
            
            //Transfer current field descriptions to the new fields, if relevant
            var new_fields = metadata.json.vector_layers[0].fields;
            var current_fields = current_state.fields;
            for(var field in new_fields){
              if(current_fields.TRADE_NAME !== undefined) new_fields[field] = current_fields[field];
            };
            //refresh fields
            $('div.fields', layerform).html(templates.layerfields(new_fields));

            //set projection and readonly
            var projTarget = $(layerform + ' .js-metadata-projection');
            projTarget.val(metadata.projection);
            projTarget.attr('readonly', true);
            //set maxzoom, if needed
            var maxzoomTarget = $('.max');
            if (maxzoomTarget.val() < metadata.maxzoom) maxzoomTarget.val(metadata.maxzoom);
          },
          error: function(jqXHR, textStatus, errorThrown) {
            Modal.show('error', 'Cannot refresh source. ' + jqXHR.responseText);
          }
        });
        return false;
    };
    Editor.prototype.error = function(model, resp) {
        this.messageclear();
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
        // Grab settings form values.
        var attr = _($('#settings').serializeArray()).reduce(function(memo, field) {
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
            var lon = map.getCenter().lng % 360;
            lon += (lon < -180) ? 360 : (lon > 180) ? -360 : 0;
            attr.center = [lon, map.getCenter().lat, map.getZoom()];
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
        this.messageclear();
        if (!map) {
            map = L.mapbox.map('map');
            map.setView([this.model.get('center')[1], this.model.get('center')[0]], this.model.get('center')[2]);
            map.on('zoomend', function() {
                $('#zoomedto').attr('class', 'contain z' + (map.getZoom() | 0));
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
        $('title').text(this.model.get('name'));
        $('.js-name').text(this.model.get('name') || 'Untitled');
        // Clear save notice.
        if (window.location.hash === '#refresh') {
            window.location.hash = '#';
        }
        // Rerender fields forms.
        _(layers).each(function(l) {
            l.refresh();
        });
        // Get existing bookamarks
        this.bookmarks = localStorage.getItem('tm2.bookmarks') ? JSON.parse(localStorage.getItem('tm2.bookmarks')) : {};
        for (var b in this.bookmarks) {
            this.appendBookmark(b);
        }
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
                    var extension = filepath.split('.').pop().toLowerCase();
                    if (filepath.indexOf('.geo.json') !== -1) extension = 'geojson';
                    //if file is compatible with mapnik omnivore, send to mapnik-omnivore for file's metadata
                    if (mapnikOmnivore_digestable(extension)) {
                        $.ajax({
                            url: '/metadata?file=' + filepath,
                            success: function(metadata) {
                                window.editor.addlayer(extension, metadata.json.vector_layers, filepath, metadata);
                            },
                            error: function(jqXHR, textStatus, errorThrown) {
                                Modal.show('error', jqXHR.responseText);
                            }
                        });
                        //else file is either postgis or sqlite...for now
                    } else if (extension === 'sqlite' || extension === 'postgis') {
                        var layername = filepath.substring(filepath.lastIndexOf("/") + 1, filepath.lastIndexOf("."));
                        window.editor.addlayer(extension, [{
                            id: layername
                        }], filepath, null);
                    } else {
                        Modal.show('error', 'File type "' + extension + '" unknown.');
                    }
                }
            }
        });
    };

    function mapnikOmnivore_digestable(ext) {
        if (ext === 'gpx' || ext === 'geojson' || ext === 'kml' || ext === 'shp' || ext === 'csv') return true;
        else return false;
    };
    Editor.prototype.messageclear = messageClear;
    Editor.prototype.delstyle = delStyle;
    Editor.prototype.tabbed = tabbedHandler;
    Editor.prototype.zoomToLayer = function(ev) {
        var id = $(ev.currentTarget).attr('id').split('-').pop();
        var filepath = layers[id].get().Datasource.file;
        $.ajax({
            url: '/metadata?file=' + filepath,
            success: function(metadata) {
                var center = metadata.center;
                map.setView([center[1], center[0]], metadata.maxzoom);
            }
        });
    };
    window.editor = new Editor({
        el: document.body,
        model: new Source(source)
    });
    window.editor.refresh();
    // Sortable layers for local sources.
    if (source.id.indexOf('tmsource://' === 0)) {
        $('#layers .js-menu-content').sortable();
        $('#layers .js-menu-content').bind('sortupdate', function(ev, ui) {
            var ids = $('#layers .js-menu-content .js-layer').map(function() {
                return $(this).attr('id');
            }).get();
            layers = _(ids).reduce(function(memo, id) {
                memo[id] = layers[id];
                return memo;
            }, {});
        });
    }
};