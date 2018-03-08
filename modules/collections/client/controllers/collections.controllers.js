var collectionModules = angular.module('collections');

collectionModules.controller('CollectionEditCtrl',
  ['$scope', '$log', '$state', '$uibModal', '$location', 'NgTableParams', 'collection', 'project', 'types', 'CollectionModel', 'AlertService', '_',
    function($scope, $log, $state, $uibModal, $location, NgTableParams, collection, project, types, CollectionModel, AlertService, _) {
      $scope.collection = collection;
      $scope.project = project;
      $scope.types = types;

      $scope.mainTableParams = new NgTableParams({ sorting: { sortOrder: 'asc' }, count: 5 }, { dataset: collection.mainDocuments });
      $scope.otherTableParams = new NgTableParams({ sorting: { sortOrder: 'asc' }, count: 10 }, { dataset: collection.otherDocuments });

      $scope.linkedMainDocuments = _.map(collection.mainDocuments, function(cd) { return cd.document; });
      $scope.linkedOtherDocuments = _.map(collection.otherDocuments, function(cd) { return cd.document; });

      $scope.showSuccess = function(msg, transitionCallback, title) {
        var modalDocView = $uibModal.open({
          animation: true,
          templateUrl: 'modules/utils/client/views/partials/modal-success.html',
          controller: function($scope, $state, $uibModalInstance) {
            var self = this;
            self.title = title || 'Success';
            self.msg = msg;
            self.ok = function() {
              $uibModalInstance.close($scope.org);
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
        // do not care how this modal is closed, just go to the desired location...
        modalDocView.result.then(function (/* res */) {transitionCallback(); }, function (/* err */) { transitionCallback(); });
      };

      $scope.showError = function(msg, errorList, transitionCallback, title) {
        var modalDocView = $uibModal.open({
          animation: true,
          templateUrl: 'modules/utils/client/views/partials/modal-error.html',
          controller: function($scope, $state, $uibModalInstance) {
            var self = this;
            self.title = title || 'An error has occurred';
            self.msg = msg;
            self.ok = function() {
              $uibModalInstance.close($scope.org);
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
        // do not care how this modal is closed, just go to the desired location...
        modalDocView.result.then(function (/* res */) {transitionCallback(); }, function (/* err */) { transitionCallback(); });
      };

      $scope.confirmMove = function(title, msg, moveFunc) {
        var modalDocView = $uibModal.open({
          animation: true,
          templateUrl: 'modules/utils/client/views/partials/modal-confirm-generic.html',
          controller: function($scope, $state, $uibModalInstance) {
            var self = this;
            self.title = title || 'Move document?';
            self.question = msg || 'Are you sure?';
            self.actionOK = 'Move';
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
        modalDocView.result.then(function(/* res */) {
          moveFunc();
        });
      };

      var goToList = function() {
        $state.transitionTo('p.collection.list', { projectid: project.code }, {
          reload: true, inherit: false, notify: true
        });
      };

      var goToDetail = function() {
        $state.transitionTo('p.collection.edit', { projectid: project.code, collectionId: collection._id }, {
          reload: true, inherit: false, notify: true
        });
      };

      var reloadEdit = function() {
      // want to reload this screen, do not catch unsaved changes (we are probably in the middle of saving).
        $scope.allowTransition = true;
        $state.reload();
      };

      $scope.otherDocsReordered = function() {
        reloadEdit();
      };

      $scope.goToDocument = function(doc) {
      // Open document in doc manager.
        $location.url('/p/' + $scope.project.code + '/docs?folder=' + doc.directoryID);
      };

      $scope.updateDocuments = function(updatedDocuments, sourceDocuments, docType) {
        var originalDocuments = _.map(sourceDocuments, function(cd) { return cd.document; });

        // Find documents added to the collection
        var addedDocuments = _.filter(updatedDocuments, function(updatedDoc) {
          return !_.find(originalDocuments, function(originalDoc) { return originalDoc._id === updatedDoc._id; });
        });

        // Find documents removed from the collection
        var removedDocuments = _.filter(originalDocuments, function(originalDoc) {
          return !_.find(updatedDocuments, function(updatedDoc) { return updatedDoc._id === originalDoc._id; });
        });

        // Generate promise for document management
        var docPromises = _.union(_.map(addedDocuments, function(doc) {
          return CollectionModel.addDocument(collection._id, doc._id, docType);
        }), _.map(removedDocuments, function(doc) {
          return CollectionModel.removeDocument(collection._id, doc._id, docType);
        }));

        // complete the task
        Promise.all(docPromises)
          .then(reloadEdit)
          .catch(function(/* res */) {
            $scope.showError('Could not update other documents for "'+ $scope.collection.displayName +'".', [], reloadEdit, 'Update Other Documents Error');
          });
      };

      $scope.removeDocument = function(document, type) {
        CollectionModel.removeDocument($scope.collection._id, document._id, type)
          .then(reloadEdit)
          .catch(function(/* res */) {
            $scope.showError('Could not remove document from "'+ $scope.collection.displayName +'".', [], reloadEdit, 'Remove Document Error');
          });
      };

      $scope.delete = function() {
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
        modalView.result.then(function(/* res */) {
          CollectionModel.deleteId($scope.collection._id)
            .then(function(/* res */) {
              // deleted show the message, and go to list...
              $scope.showSuccess('"'+ $scope.collection.displayName +'"' + ' was deleted successfully.', goToList, 'Delete Success');
            })
            .catch(function(/* res */) {
              // could have errors from a delete check...
              $scope.showError('"'+ $scope.collection.displayName +'"' + ' was not deleted.', [], reloadEdit, 'Delete Error');
            });
        });
      };

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

      $scope.publish = function() {
        var publishedMainDocs = _.filter($scope.collection.mainDocuments, function (item) {
          return item.document.isPublished === true;
        });

        if (publishedMainDocs.length < 1) {
          AlertService.error("At least one 'PUBLISHED' main document is required to publish the collection.");
          return;
        }

        $scope.confirmPublishView(true).result.then(function() {
          $scope.collection.isPublished;
          return CollectionModel.publishCollection($scope.collection._id);
        })
          .then(function() {
            // published, show the message, and go to list...
            $scope.showSuccess('"'+ $scope.collection.displayName +'"' + ' was published successfully.', goToDetail, 'Publish Success');
          })
          .catch(function(/* res */) {
            $scope.showError('"'+ $scope.collection.displayName +'"' + ' was not published.', [], reloadEdit, 'Publish Error');
          });
      };

      $scope.unpublish = function() {
        $scope.confirmPublishView(false).result.then(function() {
          return CollectionModel.unpublishCollection($scope.collection._id);
        })
          .then(function() {
            // unpublished, show the message, and go to list...
            $scope.showSuccess('"'+ $scope.collection.displayName +'"' + ' was unpublished successfully.', goToDetail, 'Unpublish Success');
          })
          .catch(function(/* res */) {
            $scope.showError('"'+ $scope.collection.displayName +'"' + ' was not unpublished.', [], reloadEdit, 'Unpublish Error');
          });
      };

      $scope.save = function(isValid) {
        if (!isValid) {
          $scope.$broadcast('show-errors-check-validity', 'collectionForm');
          return false;
        }
        // Update parent and status
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
          .then(function (/* model */) {
            goToDetail();
          })
          .catch(function(/* err */) {
            // swallow rejected promise error
          });
      };
    }]);

collectionModules.controller('CollectionCreateCtrl',
  ['$scope', '$log', '$state', '$uibModal', '$location', 'NgTableParams', 'collection', 'project', 'types', 'CollectionModel',
    function($scope, $log, $state, $uibModal, $location, NgTableParams, collection, project, types, CollectionModel) {
      $scope.collection = collection;
      $scope.collection.project = project._id;
      $scope.project = project;
      $scope.types = types;

      $scope.save = function(isValid) {
        if (!isValid) {
          $scope.$broadcast('show-errors-check-validity', 'collectionForm');
          return false;
        }
        // Update parent and status
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
        CollectionModel.add($scope.collection)
          .then(function(/* model */) {
            $state.transitionTo('p.collection.edit', { projectid: project.code, collectionId: collection._id }, {
              reload: true, inherit: false, notify: true
            });
          })
          .catch(function(/* err */) {
            // swallow error
          });
      };
    }]);

collectionModules.controller('CollectionListCtrl',
  ['$scope', '$log', '$state', '$location', 'NgTableParams', 'project', 'collections', 'types',
    function($scope, $log, $state, $location, NgTableParams, project, collections, types) {
      $scope.tableParams = new NgTableParams({ count: 10 },{ dataset: collections });
      $scope.project = project;
      $scope.types = types;
    }]);
