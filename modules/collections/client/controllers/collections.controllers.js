var collectionModules = angular.module('collections');


//Controller for collections list.
collectionModules.controller('CollectionListCtrl',
  ['$scope', '$log', '$state', '$location', 'NgTableParams', 'project', 'collections', 'types',
    function($scope, $log, $state, $location, NgTableParams, project, collections, types) {
      $scope.tableParams = new NgTableParams({ count: 10 },{ dataset: collections });
      $scope.project = project;
      $scope.types = types;
    }]);


//Controller for creating/editing collections.
collectionModules.controller('CollectionEditCtrl',
  ['$scope', '$log', '$state', '$uibModal', '$location', 'NgTableParams', 'collection', 'project', 'types', 'CollectionModel', 'AlertService', 'ConfirmService', '_',
    function($scope, $log, $state, $uibModal, $location, NgTableParams, collection, project, types, CollectionModel, AlertService, ConfirmService, _) {
      $scope.collection = collection;
      $scope.collection.project = project._id;
      $scope.project = project;
      $scope.types = types;
      // Keep a copy of original documents for comparison.
      $scope.originalDocuments = {
        main: _.map(collection.mainDocuments, function(cd) { return cd.document; }),
        other: _.map(collection.otherDocuments, function(cd) { return cd.document; })
      }
      // Create a new copy of documents to manipulate before saving.
      $scope.modifiedDocuments = {
        main: _.map(collection.mainDocuments, function(cd) { return cd.document; }),
        other: _.map(collection.otherDocuments, function(cd) { return cd.document; })
      }
      // Create an object to keep track of table parameters.
      $scope.tableParams = {
        main: new NgTableParams({ sorting: { sortOrder: 'asc' }, count: 5 }, { dataset: $scope.modifiedDocuments.main }),
        other: new NgTableParams({ sorting: { sortOrder: 'asc' }, count: 10 }, { dataset: $scope.modifiedDocuments.other })
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
      $scope.goToEdit = function() {
        $state.transitionTo('p.collection.edit', { projectid: project.code, collectionId: collection._id }, {
          reload: true, inherit: false, notify: true
        });
      }

      // Shorthand for transitioning to List.
      $scope.goToList = function() {
        $state.transitionTo('p.collection.list', { projectid: project.code }, {
          reload: true, inherit: false, notify: true
        });
      }

      // Called after using the Document Manager modal.
      $scope.updateDocuments = function(selectedDocs, docType) {
        var alternate = docType == 'main' ? 'other' : 'main';
        var errMsg = '';
        _.forEach(selectedDocs, function(doc) {
          // Iterate through each selected document, and see if it exists in the collection already.
          var match = false;
          _.forEach($scope.modifiedDocuments[alternate], function(altDoc) {
            if (altDoc.id == doc.id) {
              // If it's in the other document set, we alert the user that it won't be added (no docs can be in both 'Main' and 'Related').
              errMsg += ('<br/> - ' + doc.displayName);
              match = true;
            }
          });
          _.forEach($scope.modifiedDocuments[docType], function(mainDoc) {
            if (mainDoc.id == doc.id) {
              // If it's in the current document set, just don't add it (no duplicate documents).
              match = true;
            }
          });
          if (!match) {
            $scope.modifiedDocuments[docType].push(doc);
          }
        });
        if (errMsg.length > 0) {
          AlertService.error('The following document(s) already exist in "' + (docType == 'main' ? 'Related' : 'Main') + ' Documents" and have not been added:' + errMsg, 7000);
        }
        $scope.tableParams[docType] = new NgTableParams({ sorting: { sortOrder: 'asc' }, count: docType == 'main' ? 5 : 10 }, { dataset: $scope.modifiedDocuments[docType] });
        // Reload the table
        $scope.validationFlags.docsChanged = true;
        if ($scope.validationFlags.documentsTabInvalid) {
          $scope.checkDocumentsField();
        }
      };

      // Remove a document from the list via the trash glyphicon.
      $scope.removeDocument = function(removedDoc, docType) {
        $scope.modifiedDocuments[docType] = _.without($scope.modifiedDocuments[docType], removedDoc);
        $scope.tableParams[docType] = new NgTableParams({ sorting: { sortOrder: 'asc' }, count: docType == 'main' ? 5 : 10 }, { dataset: $scope.modifiedDocuments[docType] });
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
        var publishedMainDocs = _.filter($scope.modifiedDocuments.main, function (item) {
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
            return $scope.submitDocs(false);
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
            return $scope.submitDocs(false);
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
        if ($scope.collection.dateAdded) {
          // Editing an existing collection.
          CollectionModel.save($scope.collection)
            .then(function(){
              if ($scope.validationFlags.docsChanged) {
                $scope.submitDocs(true);
              } else {
                AlertService.success('"' + $scope.collection.displayName + '" was saved successfully.', 4000, true)
                $scope.goToEdit();
              }
            })
            .catch(function() {
              AlertService.error('"' + $scope.collection.displayName + '" was not saved.', 4000, true);
              $scope.goToEdit();
            });
        } else {
          // Creating a new collection.
          CollectionModel.add($scope.collection)
            .then(function() {
              if ($scope.validationFlags.docsChanged) {
                $scope.submitDocs(true);
              } else {
                AlertService.success('"' + $scope.collection.displayName + '" was saved successfully.', 4000, true)
                $scope.goToEdit();
              }
            })
            .catch(function() {
              AlertService.error('"' + $scope.collection.displayName + '" was not saved.', 4000, true);
            });
        }
      };

      // Helper function when saving, to submit any changes to documents.
      $scope.submitDocs = function(reload) {
        var docPromises = {};
        _.forEach($scope.modifiedDocuments, function(updatedDocs, docType) {
          var addedDocuments = _.filter(updatedDocs, function(updatedDoc) {
            return !_.find($scope.originalDocuments[docType], function(originalDoc) { return originalDoc._id === updatedDoc._id; });
          });
          var removedDocuments = _.filter($scope.originalDocuments[docType], function(originalDoc) {
            return !_.find(updatedDocs, function(updatedDoc) { return updatedDoc._id === originalDoc._id; });
          });
          // Generate promises for document management.
          docPromises[docType] = _.union(_.map(addedDocuments, function(doc) {
            return CollectionModel.addDocument(collection._id, doc._id, docType);
          }), _.map(removedDocuments, function(doc) {
            return CollectionModel.removeDocument(collection._id, doc._id, docType);
          }));
        })
        if (reload) {
          // We're saving/creating a collection. This is the last operation to happen, so we need it to complete before reloading!
          return Promise.all(_.union(docPromises.main, docPromises.other))
            .then(function() {
              AlertService.success('"' + $scope.collection.displayName + '" and documents were saved successfully.', 4000, true);
              $scope.goToEdit();
            }, function() {
              AlertService.error('"' + $scope.collection.displayName + '" documents were not saved.', 4000, true);
              $scope.goToEdit();
            });
        } else {
          // We're publishing/unpublishing. Do not reload; more operations need to happen!
          return Promise.all(_.union(docPromises.main, docPromises.other))
        }
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
              $scope.goToList();
            }
          });
        } else {
          $scope.goToList();
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
              $scope.goToList();
            })
            .catch(function() {
              // User cancels delete, or error is thrown.
              AlertService.error('"'+ $scope.collection.displayName +'" was not deleted.', 4000, true);
              $state.reload();
            });
        });
      };
    }]);
