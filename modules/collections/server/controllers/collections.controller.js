'use strict';
// =========================================================================
//
// Controller for Collections
//
// =========================================================================
var _ = require('lodash');
var path = require('path');
var DBModel = require(path.resolve('./modules/core/server/controllers/core.dbmodel.controller'));
var ProjectClass = require(path.resolve('./modules/projects/server/controllers/project.controller.js'));
var DocumentClass = require(path.resolve('./modules/documents/server/controllers/core.document.controller'));
var CollectionDocClass = require(path.resolve('./modules/collections/server/controllers/collectionDocuments.controller'));

module.exports = DBModel.extend({
  name     : 'Collection',
  plural   : 'collections',
  populate : [{
    path     : 'addedBy',
    select   : '_id displayName username email orgName'
  }, {
    path     : 'updatedBy',
    select   : '_id displayName username email orgName'
  }, {
    path     : 'mainDocuments',
    populate : [{
      path   : 'addedBy',
      select : '_id displayName username email orgName'
    }, {
      path   : 'updatedBy',
      select : '_id displayName username email orgName'
    }, {
      path   : 'document',
    }]
  }, {
    path     : 'otherDocuments',
    populate : [{
      path   : 'addedBy',
      select : '_id displayName username email orgName'
    }, {
      path   : 'updatedBy',
      select : '_id displayName username email orgName'
    }, {
      path   : 'document',
    }]
  }],

  getAll: function() {
    return this.list();
  },

  getForProject: function(projectCode) {
    var self = this;
    var Project = new ProjectClass(self.opts);

    return Project.findOne({ code: projectCode }).then(function(project) {
      if (project) {
        return self.list({ project: project._id });
      }
    });
  },

  publish: function(collectionId) {
    return this.findById(collectionId).then(function(collection) {
      if (!collection) {return;}

      // Create a News item?
      collection.publish();
      return collection.save();
    });
  },

  unpublish: function(collectionId) {
    return this.findById(collectionId).then(function(collection) {
      if (!collection) {return;}

      collection.unpublish();
      return collection.save();
    });
  },

  addCollection: function(projectCode, collection) {
    var self = this;

    var Project = new ProjectClass(self.opts);

    return Project.findOne({ code: projectCode }).then(function(project) {
      if (project && collection && collection.type && collection.displayName) {
        return self.create(collection).then(function(newCollection) {
          newCollection.project = project;
          return newCollection.save();
        });
      }
    });
  },

  removeCollection: function(collectionId) {
    var self = this;

    return this.findById(collectionId).then(function(collection) {
      if (!collection) {return;}

      // Remove the collection from the documents first
      var Document = new DocumentClass(self.opts);

      if (collection.mainDocument) {
        Document.findById(collection.mainDocument.document._id).then(function(document) {
          document.collections = _.reject(document.collections, function(c) {
            return c.equals(collectionId);
          });
          document.save();
        });
      }
      _.each(collection.otherDocuments, function(cd) {
        Document.findById(cd.document._id).then(function(document) {
          document.collections = _.reject(document.collections, function(c) {
            return c.equals(collectionId);
          });
          document.save();
        });
      });

      // Remove the collection documents next
      var CollectionDocument = new CollectionDocClass(self.opts);
      var deletePromises = _.map(collection.otherDocuments, function(cd) {
        return CollectionDocument.delete(cd);
      });

      if (collection.mainDocument) {
        deletePromises.push(CollectionDocument.delete(collection.mainDocument));
      }

      Promise.all(deletePromises).then(function () {
        // Now delete the collection
        return collection.remove();
      });
    });
  },

  addMainDocument: function(collectionId, documentId) {
    return this.addDocument(collectionId, documentId, "main");
  },

  addOtherDocument: function(collectionId, documentId) {
    return this.addDocument(collectionId, documentId, "other");
  },

  addDocument: function(collectionId, documentId, docType) {
    var self = this;

    // find the target collection in the database
    return this.findById(collectionId).then(function(collection) {
      if (!collection) {
        return;
      }

      // hold a reference to the doc lists, so we can flex the function based on the type of document being processed
      var docLists = {
        main : collection.mainDocuments,
        other : collection.otherDocuments
      };

      // find the database record for the document we are adding
      var Document = new DocumentClass(self.opts);
      return Document.findById(documentId).then(function(document) {
        if (document) {
          // update the record in the documents table, adding the reference
          // to the collection we are adding it to
          document.collections.push(collection);
          document.save();

          // create the new record in the collectiondocuments table
          var CollectionDocument = new CollectionDocClass(self.opts);
          return CollectionDocument.create({
            document: document,
          }).then(function(collectionDocument) {
            // update the record in the collections table, adding the reference to
            // the new document
            docLists[docType].push(collectionDocument);
            collection.save();
            return collectionDocument;
          });
        }
      });
    });
  },

  removeMainDocument: function(collectionId, documentId) {
    return this.removeDocument(collectionId, documentId, "main");
  },

  removeOtherDocument: function(collectionId, documentId) {
    return this.removeDocument(collectionId, documentId, "other");
  },

  removeDocument: function(collectionId, documentId, docType) {
    var self = this;

    // find the target collection in the database
    return this.findById(collectionId).then(function(collection) {
      if (!collection) {
        return;
      }

      // hold a reference to the doc lists, so we can flex the function based on the type of document being processed
      var docLists = {
        main : collection.mainDocuments,
        other : collection.otherDocuments
      };

      // verify the document we are trying to remove is in the collection,
      // and proceed only if this is true
      var collectionDocument = _.find(docLists[docType], function(cd) {
        return cd.document._id.equals(documentId);
      });

      if (collectionDocument) {
        // find the database record for the document we are processing
        var Document = new DocumentClass(self.opts);
        Document.findById(documentId).then(function(document) {
          // update the record on the documents table, removing the reference
          // to the collection we are removing it from
          document.collections = _.reject(document.collections, function(c) {
            return c.equals(collectionId);
          });
          document.save();

          // remove the reference to the document from the record in the collections table
          docLists[docType] = _.without(docLists[docType], collectionDocument);
          collection.save();

          // remove the corresponding record in the collectiondocuments table
          var CollectionDocument = new CollectionDocClass(self.opts);
          CollectionDocument.delete(collectionDocument);
        });
      }
    });
  }
});
