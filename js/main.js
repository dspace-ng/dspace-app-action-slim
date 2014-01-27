$(function() {

  var UUID = require('node-uuid');
  var config = require('../config');

  // API CORE
  var DSpace = require('dspace-api-core');
  var LocalPlayer = require('dspace-api-core/models/localPlayer');
  var Places = require('dspace-api-core/collections/places');

  // API Bayeux
  var BayeuxHub = require('dspace-api-bayeux/hub');

  // UI Leaflet
  var Roster = require('dspace-ui-leaflet/roster');
  var Map = require('dspace-ui-leaflet/map');
  var PlacesOverlay = require('dspace-ui-leaflet/overlays/places');

  // local
  var AccountModal = require('./views/accountModal');
  var ProfileModal = require('./views/profileModal');
  var ControlsView = require('./views/controls');
  var ActionsView = require('./views/actions');

  var mapOptions = {};
  if(localStorage.map_options) {
    mapOptions = JSON.parse(localStorage.map_options);
  } else {
    localStorage.map_options = JSON.stringify(mapOptions);
  }
  if(mapOptions.center) config.map.center = mapOptions.center;
  if(mapOptions.zoom) config.map.zoom = mapOptions.zoom;

  var init = function(profile){

    $('body').append('<div id="' + config.map.elementId + '"></div>');
    var m = new Map({config: config.map});

    var dspace = new DSpace(m, Roster, BayeuxHub, config);

    var localPlayer = new LocalPlayer(profile, {
      settings: config.settings,
      nexus: dspace.nexus
    });

    localPlayer.on('change', function(player){
      localStorage.profile = JSON.stringify(player);
    });

    var layerGroup = new L.LayerGroup();
    layerGroup.addTo(dspace.map.frame);
    dspace.roster.createPlayerOverlays(localPlayer, { avatar: layerGroup, track: layerGroup });

    dspace.player = localPlayer;

    // PLAY!
    var publishPlayer = function(player){
      dspace.party.portal.channel.pub(player);
    };
    publishPlayer(localPlayer);
    localPlayer.on('change', publishPlayer);


    /**
     ** VIEWS
     **/

    var map = dspace.map.frame;

    var controls = new ControlsView({
      player: localPlayer,
      map: map
    });

    var actions = new ActionsView({});

    /*
     * POIs
     */
    var POIOverlays = [];
    dspace.POIOverlays = POIOverlays;
    _.forEach(config.poisets, function(poiset){
      var places = new Places([], {
        config: poiset,
        nexus: dspace.nexus
      });
      new PlacesOverlay({
        collection: places,
        config: poiset,
        map: map
      });
      map.poisControl.addOverlay(places.overlay.layer, poiset.name);
      POIOverlays.push(places.overlay);
    });

    // FIXME only for visible layers?
    map.on('zoomend', function(){
      _.each(POIOverlays, function(overlay){
        overlay.scaleMarkers();
      });
      mapOptions.zoom = map.getZoom();
      localStorage.map_options = JSON.stringify(mapOptions);
    });

    map.focus = new L.Marker(map.getCenter(), {
      icon: new L.Icon({
        iconUrl: config.settings.icons.focus.url,
        iconSize: [48, 48]
      })
    });

    map.on('click', function(){
      map.removeLayer(map.focus);
      controls.show();
      actions.hide();
    });

    map.focus.on('click', function(){
      map.removeLayer(map.focus);
      controls.show();
      actions.hide();
    });

    map.on('moveend', function(event){
      center = map.getCenter();
      mapOptions.center = [center.lat, center.lng];
      localStorage.map_options = JSON.stringify(mapOptions);
    }.bind(this));

    map.on('contextmenu', function(event){
      map.focus.setLatLng(event.latlng);
      map.addLayer(map.focus);
      controls.hide();
      actions.show();
    });

    //FIXME don't depend on popup
    map.on('popupopen', function(event){
      map.removeLayer(map.focus);
      controls.hide();
      actions.show();
    });

    this.controls = controls;

    //FIXME don't depend on popup
    map.on('popupclose', function(event){
      controls.show();
      actions.hide();
    });

    localPlayer.on('selected', function(player){
      console.log('selected localPlayer', player);
    });

    $('.leaflet-left .leaflet-control-layers-toggle')[0].classList.add('icon-marker');
    $('.leaflet-left .leaflet-control-layers-toggle')[1].classList.add('icon-profile');

    //#debug
    window.dspace = dspace;
  };

  var profile;
  if(localStorage.profile) {
    profile = JSON.parse(localStorage.profile);
    init(profile);
  } else {
    uuid =  UUID();
    profile = { uuid: uuid};
    profile.avatar = config.player.avatar;
    profile.color = '#' + Math.floor(Math.random()*16777215).toString(16);

    var newPlayer = new Backbone.Model(profile);
    newPlayer.once('change:track', function(player){
      player.once('change:nickname', function(player){
        localStorage.profile = JSON.stringify(player);
        init(player.toJSON());
      });
      new ProfileModal({ player: player });
    });
    new AccountModal({ player: newPlayer });
  }
});
