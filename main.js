
require(['dojo/on','esri/core/Accessor',
 'esri/Map',
 'esri/tasks/IdentifyTask', 
 'esri/tasks/support/IdentifyParameters',
  'esri/views/MapView',
  'esri/layers/FeatureLayer',
  'esri/layers/MapImageLayer', 
  'esri/widgets/Legend', 
  'esri/widgets/BasemapToggle', 
  'esri/request',
  "esri/core/watchUtils",
  'dojo/_base/array',
  'esri/geometry/Polygon',
  'esri/renderers/SimpleRenderer',
  'esri/symbols/SimpleFillSymbol',
  'esri/symbols/SimpleMarkerSymbol',
  'dojo/domReady!'], 
    function(
        on, 
        Accessor, 
        Map, 
        IdentifyTask,
        IdentifyParameters, 
        MapView, 
        FeatureLayer, 
        MapImageLayer, 
        Legend, 
        BasemapToggle,
        esriRequest, 
        watchUtils,
        arrayUtils, 
        Polygon,
        SimpleRenderer, 
        SimpleFillSymbol,
        SimpleMarkerSymbol
    ){
        function getImageLayer(height) {
            height_url = 'https://maps.coast.noaa.gov/arcgis/rest/services/dc_slr/slr_' + height + 'ft/MapServer';
            var lyr = new MapImageLayer({
                url: height_url,
                id: height,
                visible: false,
                opacity: 0.5
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
        
        var landslide = new MapImageLayer({
            url: 'https://fortress.wa.gov/dnr/arcgisext/weba_ext_prod3/rest/services/Geology/GER_Landslides_and_Landforms_WGS84/MapServer',
            id: 9,
            visible: false
        })

        var fema = new MapImageLayer({
            url: 'https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer',
            id: 8,
            visible: false,
            opacity: 1,
            sublayers:[
                // {
                //     id: 0,
                //     visible: false
                // },
                // {
                //     id: 3,
                //     visible: false
                // },
                {
                    id: 28,
                    visible: true
                },
            ]
        })

        var cleanupsites = new MapImageLayer({
            url: 'https://fortress.wa.gov/ecy/ecyprodgislb/arcgis/rest/services/TCP/CleanupSitesStatic/MapServer', //neighborhood service
            id: 7            
        })

        slrLayers = [slr6, slr5, slr4, slr3, slr2, slr1, slr0, fema, landslide, cleanupsites]

        // set map and view parameters
        APP.map = new Map({
            basemap: 'gray',
            layers: slrLayers            
        });

        APP.view = new MapView({
            container: 'viewDiv',
            map: APP.map,
            zoom: 7,
            center: [-121.5,47.27384]            
        })
        
        var basemapToggle = new BasemapToggle({
            view: APP.view,
            nextBasemap: 'hybrid'
        })
        APP.view.ui.add(basemapToggle, 'top-right');           

        // create layer list drop down
        var layerList = $('#layerList');    
        slrLayers.forEach(function(l) {
                var layerName = l.title;
                var id = l.id
                l.visible === true ? className = '' : className = 'inactive'               
                layerList.append('<li id="layers-item' + id + '" style="margin: 10px; color: #fff;"><a class="layername ' + className + '" id="' + id + '" href="#">' + layerName + '</a></li>')                
        })        
        $('#toggle-btn').removeClass('disabled')
        
        //toggle layer when name clicked in dropdown
        layerList.click(function(evt){
            var id = parseInt(evt.target.id);            
            var layer = APP.map.findLayerById(id)
            if(layer !== undefined){
                layer.visible === true ? (layer.visible = false, $(evt.target).addClass('inactive')) : (layer.visible = true,$(evt.target).removeClass('inactive'))
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
        // taskCleanupsites = new IdentifyTask(cleanupsites);
        // taskFema = new IdentifyTask(fema);
        // taskLandslide = new IdentifyTask(landslide);

        // // set identify task parameters
        // APP.view.then(function(){
        //     APP.view.on('click', doIdentify)            
        //     params = new IdentifyParameters();
        //     params.width = APP.view.width;
        //     params.height = APP.view.height;    
        //     params.tolerance = 3;
        // })
        // .otherwise(errback)

        // //identify task - open generic popup with all attributes
        // //currently does identify on all layers in mapservice
        // function doIdentify(evt){
        //     identifyServices = [
        //         {
        //             'service': cleanupsites,
        //             'task': taskCleanupsites
        //         }, 
        //         {
        //             'service': fema,
        //             'task': taskFema
        //         },
        //         {
        //             'service': landslide,
        //             'task': taskLandslide
        //         }
        //     ];
        //     params.geometry = evt.mapPoint;
        //     params.mapExtent = APP.view.extent;
        //     //get visible layers
        //     var vislayers = [];
        //     identifyServices.forEach(function(mapserver) {
        //         if (mapserver.service.visible) {
        //             vislayers.push(mapserver)
        //         }
        //     });
            
        //     vislayers.forEach(function(f) {
        //         params.layerIds = f.service.allSublayers.filter(function(l) {
        //             return l
        //         })
        //         f.task.
        //     })
        //     // params.layerIds = vislayers
        //     iden.execute(params)
        //         .then(function(response){                    
        //             var results = response.results;   
        //             return results.map(
        //                 function (results) {
        //                     feature = results.feature;
        //                     var layername = results.layerName;
        //                     feature.popupTemplate = {
        //                         title: layername,
        //                         //content: '{*}'
        //                         content: 'Location: <strong>' + feature.attributes.location +
        //                                 '</strong><br>Observed Stage: <strong>' + feature.attributes.observed +
        //                                 '</strong><br>Flood Stage: <strong>' + feature.attributes.flood + '</strong>'
        //                     }
        //                     return feature
        //                 })
        //         }).then(showPopup)
        
        //     function showPopup(response){
        //         if(response.length > 0){
        //             view.popup.open({
        //                 features: response,
        //                 location: evt.mapPoint
        //             })
        //         }
        //     }
        // }
        
        //show legend if loaded
        $("#toggle-btn-leg").click(function(){
            $(".leg").toggle();
            $("#toggle-btn-leg").toggleClass('disabled');
            // $("#toggle-btn-leg").html() === 'Show Legend' ? $("#toggle-btn-leg").html('Hide Legend') : $("#toggle-btn-leg").html('Show Legend')   
        })
        
});