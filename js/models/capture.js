var Capture = Backbone.Model.extend({

  idAttribute: 'uuid',

  initialize: function() {
    // for new capture
    if(!this.get('uuid')){
      this.set({
        '@type': 'capture',
        uuid: uuid(),
        timeStart: new Date().getTime()
      });
    }
  },

  /*
   * pictures: 'image/*'
   * videos: 'video/*'
   * audio rec: 'video/3gpp'
   *
   * used to attach media files to capture
   * #attribution http://blog.w3villa.com/websites/uploading-filesimage-with-ajax-jquery-without-submitting-a-form/
   */
  attachFile: function(file) {
    this.set('mediaType', file.type);
    var formData = new FormData();
    var metadata = { captureUUID: this.get('uuid') };
    formData.append('file', file);
    formData.append('meta', JSON.stringify(metadata));
    $.ajax({
      url: config.media.url,
      data: formData,
      type: 'post',
      contentType: false,
      processData: false
    });
  },

  // for now we use for marker location where capture got submited
  markerLocation: function() {
    return this.get('locationSubmit');
  }
});