'use strict';
angular.module('documents')
  .directive('confirmUnpublish', ['ConfirmUnpublishService', function (ConfirmUnpublishService) {
    // x-confirm-unpublish
    return {
      restrict: 'A',
      scope: {
        files: '=',
        folders: '=',
        project: '=',
        currentNode: '=',
        unpublishCallback: '='
      },
      link: function (scope, element) {
        element.on('click', function () {
          ConfirmUnpublishService.confirmDialog(scope);
        });
      }
    };
  }])
  .service('ConfirmUnpublishService', ['$rootScope', '$uibModal', '_', '$timeout', 'DocumentMgrService', 'CollectionModel', function ($rootScope, $uibModal, _, $timeout, DocumentMgrService, CollectionModel) {
    var service = this;
    service.confirmDialog = function(scope) {
      return new Promise(function(fulfill, reject) {
        $uibModal.open({
          animation: true,
          templateUrl: 'modules/documents/client/views/partials/modal-document-confirm-unpublish.html',
          resolve: {},
          size: 'lg',
          controllerAs: 'confirmDlg',
          controller: function ($scope, $uibModalInstance) {
            var self = this;
            /*
						Set the following to true, during development, if you want to test the server side unpublish API.
						This will bypass the client side tests and send all selected files or folders.
						This is also a good way to test the client side error handling.
					  */
            self.testServerAPI = false;

            self.busy = true;
            self.unpublishCallback = scope.unpublishCallback;
            self.currentNode = scope.currentNode;
            self.project = scope.project;
            self.submit = submit;
            self.cancel = cancel;

            // Initialize ....
            init();

            function init() {
              self.files = scope.files ? collect(scope.files) : [];
              self.folders = scope.folders ? collect(scope.folders) : [];
              self.unpublishableFiles = [];
              self.unpublishableFolders = [];
              // The combined list is used by the ng-repeat.
              self.combinedList = self.folders.concat(self.files);
              // Parse folders and determine eligibility for unpublishing.
              parseFilesAndFolders()
                .then(function() {
                  updateText();
                  self.busy = false;
                  $scope.$apply();
                }).catch(function (err) {
                  self.errMsg = err.message;
                  return reject(err);
                });
            }

            function parseFilesAndFolders () {
              var promises = [];
              // Parse folders and determine eligibility for unpublishing.
              _.forEach(self.folders, function(item) {
                promises.push(new Promise (function (resolve, reject) {
                  checkFolderForContent(item)
                    .then(function() {
                      item.canBeUnpublished = (!item.hasPublished && item.userCanUnpublish);
                      if (item.canBeUnpublished) {
                        self.unpublishableFolders.push(item);
                      } else {
                        setReasonForItem(item);
                      }
                      return resolve(item);
                    }).catch(function (err) {
                      self.errMsg = err.message;
                      return reject(err);
                    });
                }));
              });
              // Parse files and determine eligibility for unpublishing.
              _.forEach(self.files, function(item) {
                promises.push(new Promise (function (resolve, reject) {
                  checkFileForCollections(item, self.files)
                    .then(function() {
                      item.canBeUnpublished = (item.restrictingCollections.length < 1 && item.userCanUnpublish);
                      if (item.canBeUnpublished) {
                        self.unpublishableFiles.push(item);
                      } else {
                        setReasonForItem(item);
                      }
                      return resolve(item);
                    }).catch(function (err) {
                      self.errMsg = err.message;
                      return reject(err);
                    });
                }));
              });
              return Promise.all(promises);
            }

            // Collect unpublishable folders and files.
            function collect(items) {
              if (!items ) {
                return [];
              }
              // Service may be invoked on a single folder or file ....
              items = Array.isArray(items) ? items : [ items ];
              var results = _.map(items, function(item) {
                var fClone = _.clone(item /* shallow clone */);
                fClone.reasons = [];
                // Clones has several new variables to simplify this directive.
                if (fClone.type === 'File') {
                  fClone.userCanUnpublish = fClone.userCan.unPublish;
                  fClone.restrictingCollections = [];
                  fClone.type = ['png','jpg','jpeg'].indexOf(fClone.internalExt) > -1 ? 'Picture' : 'File';
                } else {
                  fClone.userCanUnpublish = self.project.userCan.manageFolders;
                  fClone.type = 'Folder';
                  fClone.displayName = item.model.name;
                  fClone.isPublished = item.model.published;
                }
                fClone.canBeUnpublished = fClone.userCanUnpublish;
                return fClone;
              });
              _.remove(results, function(r) {
                return !r.isPublished;
              })
              return results;
            }

            // Level-order traversal of each folder to check for published files and folders.
            function checkFolderForContent(folder) {
              // Initiate the queue for level-order traversal.
              var folders = [folder];
              var promises = [];
              var currentFolder;
              // Initiate flag for whether the folder contains published docs.
              folder.hasPublished = false;
              var getDocs = function(f) {
                promises.push(new Promise (function (resolve, reject) {
                  DocumentMgrService.getDirectoryDocuments(self.project, f.model.id)
                    .then(function(result) {
                      // If we return any docs...
                      if (result.data.length > 0) {
                        _.forEach(result.data, (function(document) {
                          // If they're published...
                          if (document.isPublished) {
                            folder.hasPublished = true;
                          }
                        }));
                      }
                      return resolve(folder);
                    })
                    .catch(function (err) {
                      return reject(err);
                    });
                }));
              }
              // The body of the traversal.
              while (!_.isEmpty(folders)) {
                // Dequeue the current folder.
                currentFolder = folders.shift();
                if (currentFolder.model.published && currentFolder.type != "Folder") {
                  folder.hasPublished = true;
                }
                if (currentFolder.children || currentFolder.model.children) {
                  _.forEach(currentFolder.children || currentFolder.model.children, function(child) {
                    // Enqueue any child folders.
                    folders.push(child);
                  });
                }
                getDocs(currentFolder);
              }
              return Promise.all(promises);
            }

            // Make sure the file in question is not the last published main file of a collection.
            function checkFileForCollections(file, selectedFiles) {
              var promises = [];
              _.forEach(file.collections, function(collection) {
                promises.push(new Promise (function (resolve, reject) {
                  CollectionModel.getModel(collection.id)
                    .then(function(result) {
                      // Is this file in the *main* documents of the collection?
                      var found = _.find(result.mainDocuments, function(doc) {
                        return doc.document.id == file.id;
                      })
                      if (found) {
                        // If all main documents of this collection are trying to be unpublished...
                        if (assessCollection(selectedFiles, result.mainDocuments)) {
                          // Restrict this document (so it won't be unpublished).
                          file.restrictingCollections.push(result.displayName);
                        }
                      }
                      return resolve(result);
                    })
                    .catch(function (err) {
                      return reject(err);
                    })
                }))
              })
              return Promise.all(promises);
            }

            // This helper function determines if unpublishing all selected documents would leave the collection without a published main document.
            function assessCollection(selectedDocs, collectionDocs) {
              var sDocs = _.map(selectedDocs, function(s) {
                return s.id;
              })
              // Only consider published documents in the collection
              var cDocs = _.filter(collectionDocs, function(c) {
                return c.document.isPublished;
              });
              cDocs = _.map(cDocs, function(c) {
                return c.document.id;
              });
              // Remove all checked items from the collection's published main docs. Is there anything left?
              cDocs = _.difference(cDocs, sDocs);
              return cDocs.length == 0;
            }

            function updateText() {
              var folderCnt = self.folders.length;
              var fileCnt = self.files.length;
              var unpublishableFolderCnt = self.unpublishableFolders.length;
              var unpublishableFileCnt = self.unpublishableFiles.length;
              self.allBlocked = false;
              self.hasBlockedContent = false;

              if (unpublishableFolderCnt > 0 || unpublishableFileCnt > 0) {
                self.confirmText = "Are you sure you want to unpublish the following file(s) and/or folder(s)?";
                if (folderCnt > unpublishableFolderCnt || fileCnt > unpublishableFileCnt ) {
                  self.hasBlockedContent = true;
                  self.bannerText = "One or more of the following files or folders cannot be unpublished.";
                }
                self.showSubmit = true;
              } else {
                // No files and no folders can be unpublished
                self.allBlocked = true;
                if (self.testServerAPI) {
                  self.showSubmit = true;

                } else {
                  self.showSubmit = false;
                  self.hasBlockedContent = true;
                  self.bannerText = "One or more of the following files or folders cannot be unpublished.";
                }
              }
              self.combinedList = _.sortBy(self.combinedList, function(n) {
                return n.reasons.length*(-1);
              })
            }

            function setReasonForItem(item) {
              if (!item.userCanUnpublish) {
                item.reasons.push("Not authorized to unpublish");
              }
              if (item.hasPublished) {
                item.reasons.push("Contains one or more published items");
              }
              if (item.restrictingCollections && item.restrictingCollections.length > 0) {
                var msg = "Cannot remove all main documents of a published collection: (";
                msg += item.restrictingCollections.join(", ");
                msg += ")";
                item.reasons.push(msg);
              }
            }

            function cancel() {
              $uibModalInstance.dismiss('cancel');
              return reject;
            }

            function submit () {
              self.busy = true;
              var folders = self.testServerAPI ? self.folders : self.unpublishableFolders;
              var files = self.testServerAPI ? self.files : self.unpublishableFiles;
              self.unpublishCallback(files, folders)
                .then(function (result) {
                  self.busy = false;
                  $uibModalInstance.close(result);
                }, function (err) {
                  self.busy = false;
                  self.errMsg = err.message;
                  $scope.$apply();
                });
            }
          }
        });
      });
    };
  }]);
