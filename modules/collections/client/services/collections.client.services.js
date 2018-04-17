'use strict';

angular.module('collections').factory('CollectionModel', function (ModelBase) {
  var Class = ModelBase.extend ({
    urlName : 'collection',

    lookupProject: function(projectCode) {
      return this.get('/api/collections/project/' + projectCode);
    },

    removeCollection: function(collectionId) {
      return this.put('/api/collections/' + collectionId + '/remove', {});
    },

    addDocument: function(collectionId, documentId, docType) {
      if ( docType === "main") {
        return this.put('/api/collections/' + collectionId + '/document/' + documentId + '/main/add', {});
      }
      return this.put('/api/collections/' + collectionId + '/document/' + documentId + '/add', {});
    },

    removeDocument: function(collectionId, documentId, docType) {
      if ( docType === "main") {
        return this.put('/api/collections/' + collectionId + '/document/' + documentId + '/main/remove', {});
      }
      return this.put('/api/collections/' + collectionId + '/document/' + documentId + '/remove', {});
    },

    publishCollection: function(collectionId) {
      return this.put('/api/collections/' + collectionId + '/publish', {});
    },

    unpublishCollection: function(collectionId) {
      return this.put('/api/collections/' + collectionId + '/unpublish', {});
    }
  });
  return new Class ();
});
