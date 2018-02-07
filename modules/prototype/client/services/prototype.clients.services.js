'use strict';
angular.module('prototype').factory ('PrototypeModel', function (ModelBase) {

  var PrototypeModel = ModelBase.extend ({
    urlName : 'prototype',
    getData: function() {
      return this.get('/api/admin/prototype');
    }

  });
  return new PrototypeModel ();
});
