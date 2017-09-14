
require(['dojo/on','esri/core/Accessor',
  'esri/Map',
  'esri/tasks/IdentifyTask', 
  'esri/tasks/support/IdentifyParameters',
  'esri/tasks/Locator',
  'esri/views/MapView',
  'esri/layers/FeatureLayer',
  'esri/layers/MapImageLayer', 
  'esri/widgets/Search', 
  'esri/widgets/Zoom',
  'esri/widgets/Legend', 
  'esri/widgets/BasemapToggle', 
  'esri/request',
  "esri/core/watchUtils",
  'dojo/_base/array',
  'esri/geometry/Polygon',
  'esri/renderers/SimpleRenderer',
  'esri/symbols/SimpleFillSymbol',
  'esri/symbols/SimpleMarkerSymbol',
  'dojo/dom',
  'dojo/domReady!'], 
    function(
        on, 
        Accessor, 
        Map, 
        IdentifyTask,
        IdentifyParameters, 
        Locator,
        MapView, 
        FeatureLayer, 
        MapImageLayer, 
        Search,
        Zoom,
        Legend, 
        BasemapToggle,
        esriRequest, 
        watchUtils,
        arrayUtils, 
        Polygon,
        SimpleRenderer, 
        SimpleFillSymbol,
        SimpleMarkerSymbol,
        dom
    ){
        function getImageLayer(height) {
            height_url = 'https://maps.coast.noaa.gov/arcgis/rest/services/dc_slr/slr_' + height + 'ft/MapServer';
            switch (height) {
                case 0:
                    var legendEnabled = true
                break;
                default:
                    var legendEnabled = false
            }
            var lyr = new MapImageLayer({
                url: height_url,
                id: height,
                visible: false,
                opacity: 0.5,
                legendEnabled: legendEnabled
            })
            return lyr
        }
      
        var slr0 = getImageLayer(0)
        var slr1 = getImageLayer(1)
        var slr2 = getImageLayer(2)
        var slr3 = getImageLayer(3)
        var slr4 = getImageLayer(4)
        var slr5 = getImageLayer(5)
        var slr6 = getImageLayer(6)        
        
        var cleanupsites = new MapImageLayer({
            url: 'https://fortress.wa.gov/ecy/ecyprodgislb/arcgis/rest/services/TCP/CleanupSitesStatic/MapServer', //neighborhood service
            id: 7,
            visible: false
        })
        
        var fema = new MapImageLayer({
            url: 'https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer',
            id: 8,
            visible: true,
            opacity: 1,
            sublayers:[                
                {
                    id: 28,
                    visible: true
                }
            ]
        })

        var landslide = new MapImageLayer({
            url: 'https://fortress.wa.gov/dnr/arcgisext//weba_ext_prod3/rest/services/Geology/WADNR_Landslide/MapServer',
            //url: 'https://fortress.wa.gov/dnr/arcgisext/weba_ext_prod3/rest/services/Geology/GER_Landslides_and_Landforms_WGS84/MapServer',
            id: 9,
            visible: false
        })

        var maplayers = [slr0, slr1, slr2, slr3, slr4, slr5, slr6, fema, landslide, cleanupsites];


        
        // set map and view parameters
        APP.map = new Map({
            // basemap: 'topo-vector',
            basemap: 'topo', 
            layers: maplayers            
        });

        APP.view = new MapView({
            container: 'viewDiv',
            map: APP.map,
            zoom: 7,
            center: [-121.5,47.27384]            
        })

        // change cursor to spinner if view is updating (layers loading etc)
        // watchUtils.whenTrue(APP.view, 'updating', function(f){
        //     dom.byId("viewDiv").style.cursor = "wait";
        // })

        // watchUtils.whenFalse(APP.view, 'updating', function(f){
        //     dom.byId("viewDiv").style.cursor = "auto";
        // })
         
        APP.identifyServices = [
            {
                'id': 7,
                'name': 'cleanupsites',
                'task': new IdentifyTask(cleanupsites.url),
                // 'visible': true
            },
            {
                'id': 8,
                'name': 'fema',
                'task': new IdentifyTask(fema.url),
                // 'visible': false
            },
            {
                'id': 9,
                'name': 'landslide',
                'task': new IdentifyTask(landslide.url),
                // 'visible': false
            }            
        ]

        APP.view.then(function() {
            on(APP.view, "click", executeIdentify);
            params = new IdentifyParameters();
            params.tolerance = 3;
            params.layerOption = "all";
            params.width = APP.view.width;
            params.height = APP.view.height;
        })
        
        function executeIdentify(evt) {
            // set identify params from click
            params.geometry = evt.mapPoint;
            params.mapExtent = APP.view.extent;
            dom.byId("viewDiv").style.cursor = "wait";
            
            // get visible services and sublayers within service
            // nested reduce functions...good times

            // main filter, find services that are visible on map
            var servicesWithVisibleSublayers = APP.map.layers.items.reduce(function(layersWithSublayers, layer) {                
                if(layer.visible) {
                    // sub filter -> find sublayers that are visible, return in array
                    var visibleSublayerIds = layer.allSublayers.items.reduce(function(visSublayers, sublayer) {
                        if(sublayer.visible) {
                            visSublayers.push(sublayer.id)
                        }
                        return visSublayers
                    }, [])
                    layersWithSublayers.push(
                        {
                            'id': layer.id,
                            'visibleSublayerIds': visibleSublayerIds
                        }
                    )
                }
                return layersWithSublayers
            }, [])

            // loop through visible services, execute corresponding identify task
            servicesWithVisibleSublayers.forEach(function(service) {
                // get relevant sub layer ids
                params.layerIds = service.visibleSublayerIds;
                // get identify task
                var filteredservice = APP.identifyServices.filter(function(s) {
                    return s.id == service.id                    
                })[0];
                // execute identify
                if (filteredservice !== undefined){
                    filteredservice.task.execute(params).then(function(response) {
                        // handle results, format popup
                        var results = response.results
                        return arrayUtils.map(results, function(result) {
                            var feature = result.feature;
                            var layername = result.layerName;
                            switch (layername){
                                case 'SDE.SDE.IsisSitesMapService':
                                    feature.popupTemplate = {
                                        title: 'TCP Cleanup Site',
                                        content: '<b>Site Name: </b> {cleanupSiteName}</br><b>CSID: </b>{csid}</br><b>Cleanup Type: </b>{cleanupType}'
                                    }
                                    break;
                                case 'Flood Hazard Zones':
                                    feature.popupTemplate = {
                                        title: 'FEMA Flood Hazard Zone',
                                        content: '<b>Flood Zone: </b> {FLD_ZONE}</br>'
                                    }
                                    break;                           
                                default:
                                    feature.popupTemplate = {
                                        title: layername,                                    
                                    }
                            }  
                            return feature;
                        })
                    }).then(showPopup);
                    function showPopup(response) {
                        if (response.length > 0) {
                            if(!APP.view.popup.visible){ //no popup showing
                                APP.view.popup.open({
                                    features: response,
                                    location: evt.mapPoint
                                });
                            }else{ // popup already showing, add these features to features already showing in popup
                                allfeatures = APP.view.popup.features.concat(response);
                                APP.view.popup.open({
                                    features: allfeatures,
                                    location: evt.mapPoint
                                });
                            }                        
                        }
                        dom.byId("viewDiv").style.cursor = "auto";
                    }
                }                
            });            
        }

        

        var search = new Search({
            view: APP.view,
            popupEnabled: false,
            popupOpenOnSelect: false,
            sources: [
                {
                    locator: new Locator({ url: "//geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer" }),
                    singleLineFieldName: "SingleLine",
                    name: "Search for location",
                    localSearchOptions: {
                    minScale: 300000,
                    distance: 50000
                    },
                    placeholder: "Search Geocoder",
                    maxResults: 3,
                    maxSuggestions: 6,
                    suggestionsEnabled: false,
                    minSuggestCharacters: 0
                }, {
                    featureLayer: new FeatureLayer({
                    url: cleanupsites.url,
                    outFields: ["*"]
                    }),
                    searchFields: ["cleanupSiteName"],
                    displayField: "cleanupSiteName",
                    exactMatch: false,
                    outFields: ["*"],
                    name: "Search for Cleanupsite",
                    placeholder: "Search Cleanupsites",
                    maxResults: 6,
                    maxSuggestions: 6,
                    suggestionsEnabled: true,
                    minSuggestCharacters: 0
                }
            ]
        })
        APP.view.ui.add(search, 'top-left')
        
        var legend = new Legend({
            // container: 'legend',
            view: APP.view
        })
        APP.view.ui.add(legend, 'bottom-right')

        APP.view.ui.move('zoom', 'top-left')
        
        var basemapToggle = new BasemapToggle({
            view: APP.view,
            nextBasemap: 'hybrid'
        })
        APP.view.ui.add(basemapToggle, 'top-right');

        // create layer list drop down
        var layerList = $('#layerList');    
        maplayers.forEach(function(l) {
                var layerName = l.title;
                var id = l.id
                l.visible === true ? className = 'active' : className = ''               
                switch(layerName) {
                    case 'Slr 0ft':
                        layerList.append('<li class="dropdown-header">NOAA Sea Level Rise</li>')
                        layerList.append('<li id="layers-item' + id + '" style="margin: 10px; color: #fff;"><a class="layername ' + className + '" id="' + id + '" href="#">' + layerName + '</a></li>')
                        break;
                    case 'NFHL':
                        layerList.append('<li role="separator" class="divider"></li>')
                        layerList.append('<li id="layers-item' + id + '" style="margin: 10px; color: #fff;"><a class="layername ' + className + '" id="' + id + '" href="#">FEMA Flooding</a></li>')
                        break;
                    case 'GER Landslides and Landforms WGS84':
                        layerList.append('<li role="separator" class="divider"></li>')
                        layerList.append('<li id="layers-item' + id + '" style="margin: 10px; color: #fff;"><a class="layername ' + className + '" id="' + id + '" href="#">DNR Landslides</a></li>')
                        break;
                    case 'CleanupSitesStatic':
                        layerList.append('<li role="separator" class="divider"></li>')
                        layerList.append('<li id="layers-item' + id + '" style="margin: 10px; color: #fff;"><a class="layername ' + className + '" id="' + id + '" href="#">TCP Cleanup Sites</a></li>')
                        break;
                    default:
                        layerList.append('<li id="layers-item' + id + '" style="margin: 10px; color: #fff;"><a class="layername ' + className + '" id="' + id + '" href="#">' + layerName + '</a></li>')                
                }
        })        
        $('#toggle-btn').removeClass('disabled')
        
        //toggle layer when name clicked in dropdown
        layerList.click(function(evt){
            var id = parseInt(evt.target.id);            
            var layer = APP.map.findLayerById(id)
            if(layer !== undefined){
                layer.visible === true ? (layer.visible = false, $(evt.target).removeClass('active')) : (layer.visible = true,$(evt.target).addClass('active'))
            }
        });

        //handle no layers in mapservice scenario
        function populateEmptyList(){
            layerList.append('<li>No Layers Loaded</li>')
        }

        //log error if view doesn't resolve
        function errback(error){
            console.error('error: ',error)
        }

        ////////////////////////////////
        // Identify region
        ////////////////////////////////
        
        
        //show legend if loaded
        $("#toggle-btn-leg").click(function(){
            $('.esri-ui-bottom-right').toggle();            
        })
        
});
