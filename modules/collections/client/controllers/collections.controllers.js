var collectionModules = angular.module('collections');


//Controller for displaying a list of collections.
collectionModules.controller('CollectionListCtrl',
  ['$scope', 'NgTableParams', 'project', 'collections', 'types',
    function($scope, NgTableParams, project, collections, types) {
      $scope.tableParams = new NgTableParams({ count: 10 },{ dataset: collections });
      $scope.project = project;
      $scope.types = types;
    }]);


//Controller for creating/editing collections.
collectionModules.controller('CollectionEditCtrl',
  ['$scope', '$log', '$state', '$uibModal', 'collection', 'project', 'types', 'CollectionModel', 'AlertService', 'ConfirmService', '_',
    function($scope, $log, $state, $uibModal, collection, project, types, CollectionModel, AlertService, ConfirmService, _) {
      var self = this;

      $scope.collection = collection;
      $scope.collection.project = project._id;
      $scope.project = project;
      $scope.types = types;

      // Keep a copy of original documents for comparison.
      $scope.originalDocumentList = {
        main: _.map($scope.collection.mainDocuments, function(cd) { return cd.document; }),
        other: _.map($scope.collection.otherDocuments, function(cd) { return cd.document; })
      }
      // Create a new copy of documents to manipulate before saving.
      $scope.documentList = {
        main: _.map($scope.collection.mainDocuments, function(cd) { return cd.document; }),
        other: _.map($scope.collection.otherDocuments, function(cd) { return cd.document; })
      }
      // Validation flags. Used for various purposes including in-line validation (see ng-class in collection-edit.html) or flagging changed documents.
      $scope.validationFlags = {
        save: false,
        name: false,
        type: false,
        date: false,
        authorization: false,
        detailsTabInvalid: false,
        documentsTabInvalid: false,
        docsChanged: false
      }
      // Date Picker flag, required for proper functionality.
      $scope.datePicker = { opened: false };

      // Open document directory in Document Manager.
      $scope.goToDocument = function(doc) {
        return '/p/' + $scope.project.code + '/docs?folder=' + doc.directoryID;
      };

      // Shorthand for transitioning to Edit. This is interchangeable with $state.reload() *if* we're already in Edit (not in Create).
      self.goToEdit = function() {
        $state.transitionTo('p.collection.edit', { projectid: project.code, collectionId: collection._id }, {
          reload: true, inherit: false, notify: true
        });
      }

      // Shorthand for transitioning to List.
      self.goToList = function() {
        $state.transitionTo('p.collection.list', { projectid: project.code }, {
          reload: true, inherit: false, notify: true
        });
      }

      // Called after using the Document Manager modal.
      $scope.updateDocuments = function(updatedDocuments, docType) {
        var alternate = docType == 'main' ? 'other' : 'main';
        var duplicates = $scope.findDuplicates(updatedDocuments, $scope.documentList[alternate]);
        if (duplicates.length > 0) {
          // If duplicates are found...
          var errMsg = '';
          _.forEach(duplicates, function(doc) {
            errMsg += ('<br/> - ' + doc.displayName);
            updatedDocuments = _.without(updatedDocuments, doc);
            // Remove them from the updated documents list, and alert the user.
          })
          AlertService.error('The following document(s) already exist in "' + (docType == 'main' ? 'Related' : 'Main') + ' Documents" and have not been added:' + errMsg, 7000);
        }
        $scope.documentList[docType] = _.map(updatedDocuments);
        $scope.validationFlags.docsChanged = true;
        if ($scope.validationFlags.documentsTabInvalid) {
          $scope.checkDocumentsField();
        }
      };

      // Helper function to check if user has selected a document for both 'main' and 'other'.
      $scope.findDuplicates = function(docs1, docs2) {
        var duplicateFiles = [];
        _.forEach(docs1, function(doc1) {
          _.find (docs2, function(doc2) {
            if (doc1.id == doc2.id) {
              duplicateFiles.push(doc1);
            }
          })
        })
        return duplicateFiles;
      }

      // Remove a document from the list via the trash glyphicon.
      $scope.removeDocument = function(removedDoc, docType) {
        $scope.documentList[docType] = _.without($scope.documentList[docType], removedDoc);
        $scope.validationFlags.docsChanged = true;
      };

      // Checks the validity of the collection's input fields.
      $scope.checkValidity = function(publishing) {
        $scope.validationFlags.detailsTabInvalid = false;
        $scope.validationFlags.documentsTabInvalid = false;
        // This resets validity.
        $scope.validationFlags.save = true;
        // Only start checking validation if user tries to save or publish.
        $scope.checkDetailsField();
        if (publishing) {
          $scope.checkDocumentsField();
        }
      }

      // Helper function to check validity of Details tab specifically.
      $scope.checkDetailsField = function() {
        if ($scope.validationFlags.save) {
          $scope.validationFlags.name = $scope.collection.displayName.length < 1;
          var duplicateName = _.find($scope.$parent.$resolve.collections, function(collection) {
            return ((collection.displayName == $scope.collection.displayName) && (collection.id != $scope.collection.id));
          });
          if (duplicateName) {
            $scope.validationFlags.name = true;
            AlertService.error('Project already contains a collection named "'+ $scope.collection.displayName +'".', 4000, true)
          }
          $scope.validationFlags.type = $scope.collection.type.length < 1;
          $scope.validationFlags.date = !$scope.collection.date;
          $scope.validationFlags.authorization = (!$scope.collection.isForMEM && !$scope.collection.isForENV);
          $scope.validationFlags.detailsTabInvalid = ($scope.validationFlags.name || $scope.validationFlags.type || $scope.validationFlags.date || $scope.validationFlags.authorization);
        }
      }

      // Helper function to check validity of Documents tab specifically.
      $scope.checkDocumentsField = function() {
        var publishedMainDocs = _.filter($scope.documentList.main, function (item) {
          return item.isPublished === true;
        });
        $scope.validationFlags.documentsTabInvalid = publishedMainDocs.length < 1;
      }

      // Modal confirming whether user wants to publish/unpublish.
      $scope.confirmPublishView = function(isPublishing) {
        return $uibModal.open({
          animation: true,
          templateUrl: 'modules/utils/client/views/partials/modal-confirm-generic.html',
          controller: function($scope, $state, $uibModalInstance) {
            var self = this;
            self.title = isPublishing ? 'Publish Collection?' : 'Unpublish Collection?';
            self.question = 'Are you sure you want to ' + (isPublishing ? 'publish "' : 'unpublish "') + $scope.collection.displayName + '"?';
            self.actionOK = isPublishing ? 'Publish' : 'Unpublish';
            self.actionCancel = 'Cancel';
            self.ok = function() {
              $uibModalInstance.close($scope.project);
            };
            self.cancel = function() {
              $uibModalInstance.dismiss('cancel');
            };
          },
          controllerAs: 'self',
          scope: $scope,
          size: 'md',
          windowClass: 'modal-alert',
          backdropClass: 'modal-alert-backdrop'
        });
      };

      // Publish a collection.
      $scope.publish = function() {
        $scope.checkValidity(true);
        if ($scope.validationFlags.detailsTabInvalid || $scope.validationFlags.documentsTabInvalid) {
          return;
        }
        $scope.confirmPublishView(true).result
          .then(function() {
            return CollectionModel.save($scope.collection);
          })
          .then(function() {
            return $scope.saveCollectionDocuments(false);
          })
          .then(function() {
            return CollectionModel.publishCollection($scope.collection._id);
          })
          .then(function() {
            // Published and saved. Reload the page.
            AlertService.success('"'+ $scope.collection.displayName +'" was published successfully.', 4000, true);
            $state.reload();
          })
          .catch(function() {
            // User cancels publish, or error is thrown.
            AlertService.error('"'+ $scope.collection.displayName +'" was not published.', 4000, true);
          });
      };

      // Unpublish a collection.
      $scope.unpublish = function() {
        $scope.checkValidity(false);
        if ($scope.validationFlags.detailsTabInvalid || $scope.validationFlags.documentsTabInvalid) {
          return;
        }
        $scope.confirmPublishView(false).result
          .then(function() {
            return CollectionModel.save($scope.collection);
          })
          .then(function() {
            return $scope.saveCollectionDocuments(false);
          })
          .then(function() {
            return CollectionModel.unpublishCollection($scope.collection._id);
          })
          .then(function() {
            // Unpublished and saved. Reload the page.
            AlertService.success('"'+ $scope.collection.displayName +'" was unpublished successfully.', 4000, true);
            $state.reload();
          })
          .catch(function() {
            // User cancels publish, or error is thrown.
            AlertService.error('"'+ $scope.collection.displayName +'" was not unpublished.', 4000, true);
          });
      };

      // Validate, and save the collection.
      $scope.save = function() {
        if ($scope.collection.isPublished) {
          $scope.checkValidity(true);
        } else {
          $scope.checkValidity(false);
        }
        if ($scope.validationFlags.detailsTabInvalid || $scope.validationFlags.documentsTabInvalid) {
          return;
        }
        // Update parent and status.
        $scope.collection.status = 'Issued';
        switch($scope.collection.type) {
        case 'Permit Amendment':
          $scope.collection.parentType = 'Authorizations';
          $scope.collection.status = 'Amended';
          break;
        case 'Permit':
          $scope.collection.parentType = 'Authorizations';
          break;
        case 'Inspection Report':
        case 'Order':
          $scope.collection.parentType = 'Compliance and Enforcement';
          break;
        case 'Annual Report':
        case 'Management Plan':
        case 'Dam Safety Inspection':
        case 'Letter of Assurance':
          $scope.collection.parentType = 'Other';
          break;
        }

        CollectionModel.save($scope.collection)
          .then(function(){
            $scope.saveCollectionDocuments(true);
          })
          .catch(function() {
            AlertService.error('"' + $scope.collection.displayName + '" was not saved.', 4000, true);
            self.goToEdit();
          });
      };

      /*
       * This objecect contains jQuery-sortable settings related to sortable document lists.
       * It is defined as a function because it is initialized once for each list.
       */
      self.createOptions = function () {
        var options = {
          handle : '.sort-handle',
          axis: 'y',
          placeholder: "fb-list-item",
          connectWith: ".sortable-list",
          update: function() {
            $scope.validationFlags.docsChanged = true;
          },
          helper: function(e, item) {
            return item;
          }
        };
        return options;
      };
      $scope.sortableOptionsList = [self.createOptions('main'), self.createOptions('other')];

      // Helper function when saving, to submit any changes to documents.
      $scope.saveCollectionDocuments = function(reload) {
        // In order to maintain the ordering, we need to first remove all the current documents...
        var clearDocPromises = [];
        _.forEach($scope.originalDocumentList.main, function(document) {
          clearDocPromises.push(CollectionModel.removeDocument($scope.collection._id, document._id, "main"));
        });
        _.forEach($scope.originalDocumentList.other, function(document) {
          clearDocPromises.push(CollectionModel.removeDocument($scope.collection._id, document._id, "other"));
        });

        // ...and then re-add the entire updated set
        var addDocPromises = [];
        _.forEach($scope.documentList.main, function(document) {
          addDocPromises.push(CollectionModel.addDocument($scope.collection._id, document._id, "main"));
        });
        _.forEach($scope.documentList.other, function(document) {
          addDocPromises.push(CollectionModel.addDocument($scope.collection._id, document._id, "other"));
        });

        return Promise.all(clearDocPromises)
          .then(function(){
            // old documents cleared, add new documents
            return Promise.all(addDocPromises);
          }, function(){
            // error clearing documents
            AlertService.error('"' + $scope.collection.displayName + '" documents were not saved.', 4000);
          })
          .then(function(){
            // new document set updated
            AlertService.success('"' + $scope.collection.displayName + '" and documents were saved successfully.', 4000, true);
            if(reload){
              // only reload page if we're creating a new collection
              self.goToEdit();
            }
          }, function(){
            // error adding documents
            AlertService.error('"' + $scope.collection.displayName + '" documents were not saved.', 4000);
          });
      }

      // Cancel any unsaved changes on the page.
      $scope.cancel = function() {
        if ($scope.collectionForm.$dirty || $scope.validationFlags.docsChanged) {
          ConfirmService.confirmDialog({
            titleText: "Warning: Unsaved Changes",
            confirmText: "Are you sure you want to leave this page?",
            okText: 'Yes',
            cancelText: 'No',
            onOk: function() {
              self.goToList();
            }
          });
        } else {
          self.goToList();
        }
      }

      // Delete a collection.
      $scope.delete = function() {
        if ($scope.collection.isPublished) {
          AlertService.error("Error: published collections cannot be deleted", 4000, true);
          return;
        }
        var modalView = $uibModal.open({
          animation: true,
          templateUrl: 'modules/utils/client/views/partials/modal-confirm-delete.html',
          controller: function($scope, $state, $uibModalInstance) {
            var self = this;
            self.dialogTitle = "Delete Collection";
            self.name = $scope.collection.displayName;
            self.ok = function() {
              $uibModalInstance.close($scope.collection);
            };
            self.cancel = function() {
              $uibModalInstance.dismiss('cancel');
            };
          },
          controllerAs: 'self',
          scope: $scope,
          size: 'md'
        });
        modalView.result.then(function() {
          CollectionModel.deleteId($scope.collection._id)
            .then(function() {
              // Collection deleted. Show confirmation message and return to list.
              AlertService.success('"'+ $scope.collection.displayName +'" was deleted successfully.', 4000, true);
              self.goToList();
            })
            .catch(function() {
              // User cancels delete, or error is thrown.
              AlertService.error('"'+ $scope.collection.displayName +'" was not deleted.', 4000, true);
              $state.reload();
            });
        });
      };
    }]);
