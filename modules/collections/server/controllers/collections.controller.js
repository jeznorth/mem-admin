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

  addOtherDocument: function(collectionId, documentId) {
    return this.addDocument(collectionId, documentId, "other");
  },

  sortOtherDocuments: function (collectionId, idList) {
    return this.findById(collectionId).then(function (collection) {
      if (!collection) { throw new Error('Missing collection'); }
      if (!idList || !Array.isArray(idList) || idList.length === 0) { throw new Error('Missing id list'); }
      if (!collection.otherDocuments || !Array.isArray(collection.otherDocuments) || collection.otherDocuments.length === 0) { throw new Error('Missing other documents in collection'); }

      // shallow copy array
      var toSortList = collection.otherDocuments.slice();
      var document, index = 0;

      idList.forEach(function (id) {
        var foundIndex = toSortList.findIndex(function (item) {
          return item._id.toString() === id;
        });
        if (foundIndex > -1) {
          document = toSortList[foundIndex];
          // update the document
          document.sortOrder = index++;
          document.save();
          // remove the found item from the temporary list
          toSortList.splice(foundIndex, 1);
        }
      });
      if (toSortList.length > 0) {
        /*
          Handle items not in the passed in list of ids.  E.g. Two users working on collection.
          One is sorting the other is adding or removing documents. Both start from the same list but the second
          user submits the new document list before the first user finishes sorting.  We make sure the newly added
          documents are at the bottom of the new list.
        */
        toSortList.forEach(function (document) {
          document.sortOrder = index++;
          document.save();
        });
      }
    });
  },

  removeOtherDocument: function(collectionId, documentId) {
    return this.removeDocument(collectionId, documentId, "other");
  },

  updateOtherDocumentSortOrder: function(collectionId, documentId, sortOrder) {
    return this.findById(collectionId).then(function(collection) {
      if (!collection) {return;}

      // Is the document already in there?
      var collectionDocument = _.find(collection.otherDocuments, function(cd) {
        return cd.document._id.equals(documentId);
      });

      if (collectionDocument) {
        collectionDocument.sortOrder = sortOrder;
        return collectionDocument.save();
      }
    });
  },

  addMainDocument: function(collectionId, documentId) {
    return this.addDocument(collectionId, documentId, "main");
  },

  removeMainDocument: function(collectionId, documentId) {
    return this.removeDocument(collectionId, documentId, "main");
  },

  addDocument: function(collectionId, documentId, targetDocType) {
    var self = this;

    return this.findById(collectionId).then(function(collection) {
      if (!collection) {
        return;
      }

      // hold a reference to the doc lists, so we can flex the function based on the type of document being processed
      var docLists = {
        main : collection.mainDocuments,
        other : collection.otherDocuments
      };
      var watchDocListType = targetDocType === "main" ? "other" : "main";

      // do not re-add the same document
      if (!_.find(docLists[targetDocType], function(cd) { return cd.document._id.equals(documentId); })) {

        // remove from the other document list, if it is there
        var inWatchDocList = _.filter(docLists[watchDocListType], function(cd) { return cd.document._id.equals(documentId); });
        _.each(inWatchDocList, function(otherDoc){
          self.removeDocument(collectionId, otherDoc.document._id, watchDocListType);
        })

        // add to the target document list
        var Document = new DocumentClass(self.opts);
        return Document.findById(documentId).then(function(document) {
          if (document) {
            // Add to document collection
            document.collections.push(collection);
            document.save();

            // Add to collection
            var CollectionDocument = new CollectionDocClass(self.opts);
            return CollectionDocument.create({
              document: document,
            }).then(function(collectionDocument) {
              docLists[targetDocType].push(collectionDocument);
              collection.save();
              return collectionDocument;
            });
          }
        });
      }
    });
  },

  removeDocument: function(collectionId, documentId, docType) {
    var self = this;

    return this.findById(collectionId).then(function(collection) {
      if (!collection) {
        return;
      }

      var docList = docType === "main" ? collection.mainDocuments : collection.otherDocuments;
      // Is the document in the collection?
      var collectionDocument = _.find(docList, function(cd) {
        return cd.document._id.equals(documentId);
      });

      if (collectionDocument) {
        // Remove from document
        var Document = new DocumentClass(self.opts);
        Document.findById(documentId).then(function(document) {
          document.collections = _.reject(document.collections, function(c) {
            return c.equals(collectionId);
          });
          document.save();

          // Remove from Collection
          docList = _.without(docList, collectionDocument);
          collection.save();

          // Remove from CollectionDocument
          var CollectionDocument = new CollectionDocClass(self.opts);
          CollectionDocument.delete(collectionDocument);
        });
      }
    });
  },
});
