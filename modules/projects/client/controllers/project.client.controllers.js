'use strict';

angular.module('project')
  .controller('controllerProjectEntry', controllerProjectEntry)
  .controller('controllerModalProjectImport', controllerModalProjectImport)
  .controller('controllerProjectPublicContent', controllerProjectPublicContent);

// -----------------------------------------------------------------------------------
//
// CONTROLLER: Project Entry Tombstone
//
// -----------------------------------------------------------------------------------
controllerModalProjectImport.$inject = ['Upload', '$modalInstance', '$timeout', '$scope', '$state', 'Project',  'ProjectModel', 'rProject', 'REGIONS', 'PROJECT_TYPES', '_', 'ENV'];
/* @ngInject */
function controllerModalProjectImport(Upload, $modalInstance, $timeout, $scope, $state, sProject, ProjectModel, rProject, REGIONS, PROJECT_TYPES, _, ENV) {
  var projectImport = this;
  $scope.environment = ENV;

  // Setup default endpoint for import option
  $scope.defaultOption = '/api/projects/import/mem';

  projectImport.fileList = [];

  $scope.$watch('files', function (newValue) {
    if (newValue) {
      projectImport.inProgress = false;
      _.each( newValue, function(file, idx) {
        projectImport.fileList.push(file);
      });
    }
  });

  $scope.$on('importUploadComplete', function() {
    $modalInstance.close();
  });

  $scope.$on('importUploadStart', function(event) {
    projectImport.upload();
    $modalInstance.dismiss();
  });

  projectImport.ok = function () {
    $scope.$broadcast('importUploadStart', false);
  };

  projectImport.removeFile = function(f) {
    _.remove(projectImport.fileList, f);
  };

  projectImport.cancel = function () {
    $modalInstance.dismiss();
  };

  // Standard save make sure documents are uploaded before save.
  projectImport.upload = function() {
    // console.log("Got file:",projectImport.fileList);
    var docCount = projectImport.fileList.length;
    projectImport.fileList.forEach(function (item) {
      // Check file type
      var upload = Upload.upload({
        url: item.importType,
        file: item
      });

      upload.then(function (response) {
        $timeout(function () {
          //console.log('filedata', response.data);
          // // when the last file is finished, send complete event.
          if (--docCount === 0) {
            // emit to parent.
            $scope.$emit('importUploadComplete');
          }
          // console.log("we're done with ",response);
          item.processingComplete = true;
        });
      }, function (response) {
        // if (response.status > 0) {
        //  projectImport.errorMsg = response.status + ': ' + response.data;
        // } else {
        //  _.remove($scope.files, file);
        // }
      }, function (evt) {
        item.progress = Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
      });
    });
  };
}

var getContentHtml = function(contentArray, page, type) {
  var content = contentArray ? contentArray.filter(function(c) { return c.type === type && c.page === page; }) : [];
  return content.length ? content[0].html : '';
};

var setContentHtml = function(contentArray, page, type, html) {
  var content = contentArray ? contentArray.filter(function(c) { return c.type === type && c.page === page; }) : [];
  if (content.length) {
    content[0].html = html;
  } else {
    contentArray.push({
      page: page,
      type: type,
      html: html
    });
  }
};

// -----------------------------------------------------------------------------------
//
// CONTROLLER: Project Entry Tombstone
// Used.
//
// -----------------------------------------------------------------------------------
controllerProjectEntry.$inject = ['$scope', '$state', '$stateParams', '$modal', 'project', 'REGIONS', 'PROJECT_TYPES', 'PROJECT_COMMODITIES', 'PROJECT_ACTIVITIES_DEFAULTS', 'PROJECT_ACTIVITY_STATUS', 'PROJECT_CONTENT_DEFAULTS', 'CEAA_TYPES', '_', 'UserModel', 'ProjectModel', 'OrganizationModel', 'Authentication', 'codeFromTitle', 'PhaseBaseModel', 'AlertService', 'Utils'];
/* @ngInject */
function controllerProjectEntry ($scope, $state, $stateParams, $modal, project, REGIONS, PROJECT_TYPES, PROJECT_COMMODITIES, PROJECT_ACTIVITIES_DEFAULTS, PROJECT_ACTIVITY_STATUS, PROJECT_CONTENT_DEFAULTS, CEAA_TYPES, _, UserModel, ProjectModel, OrganizationModel, Authentication, codeFromTitle, PhaseBaseModel, AlertService, Utils) {
  $scope.project = project;

  ProjectModel.setModel($scope.project);

  if ($scope.project.proponent && !_.isObject ($scope.project.proponent)) {
    OrganizationModel.getModel ($scope.project.proponent).then (function (org) {
      $scope.project.proponent = org;
    });
  }
  if ($scope.project.primaryContact && !_.isObject ($scope.project.primaryContact)) {
    UserModel.me ($scope.project.primaryContact)
    .then (function (userrecord) {
      $scope.project.primaryContact = userrecord;
    })
    .catch (function (err) {
      console.error ('Error getting user record:');
    });
  }

  if ($stateParams.projectid === 'new') {
    ProjectModel.modelIsNew = true;
  }

  // Get EPIC projects
  Utils.getEpicProjects().then(function(res) {
    $scope.epicProjectsList = res.data;
  });

  $scope.questions = ProjectModel.getProjectIntakeQuestions();
  $scope.regions = REGIONS;
  $scope.types = PROJECT_TYPES;
  $scope.commodities = PROJECT_COMMODITIES;
  $scope.activityStatusItems = PROJECT_ACTIVITY_STATUS;
  $scope._ = _;
  $scope.CEAA = CEAA_TYPES;
  PhaseBaseModel.getCollection().then( function (data) {
    var obj = {};
    _.each(data, function (item) {
      obj[item.code] = item.name;
    });
    $scope.allPhases = obj;
    $scope.$apply();
  });

  // Commodities

  var found = _.find($scope.commodities, function(list) {
    return list.type === $scope.project.type;
  });
  $scope.commoditiesList = found ? found.commodities : [];

  // PROJECT DESCRIPTION FIELD
  $scope.tinymceOptions = {
    inline: false,
    plugins: 'autolink link paste',
    menubar: false,
    toolbar: 'undo redo | bold italic | link',
    statusbar: false,
    height: 100,
    content_css: '/modules/core/client/css/core.css'
  };

  if (ProjectModel.modelIsNew) {
    $scope.project.activities = PROJECT_ACTIVITIES_DEFAULTS;
  }

  $scope.addOwnershipOrganization = function (data) {
    if (!data) return;

    // Add this to the list if it's not already added.
    var found = _.find($scope.project.ownershipData, function (org) {
      return org.organization._id === data._id;
    });
    if (found) {
      // We already added this to the list, error.
      AlertService.error('The selected organization has been added already.');
    } else {
      $scope.project.ownershipData.push({ organization: data, sharePercent: 100 });
    }
  };

  $scope.deleteOwnership = function (data) {
    // Make sure they really want to do this
    var modalDocView = $modal.open({
      animation: true,
      templateUrl: 'modules/utils/client/views/partials/modal-confirm-generic.html',
      controller: function($scope, $state, $modalInstance, _) {
        var self = this;
        self.title = 'Remove '+ data.organization.name;
        self.question = 'Are you want to remove the ownership from this project?';
        self.actionOK = 'Ok';
        self.actionCancel = 'Cancel';
        self.ok = function() {
          $modalInstance.close();
        };
        self.cancel = function() {
          $modalInstance.dismiss('cancel');
        };
      },
      controllerAs: 'self',
      scope: $scope,
      size: 'md',
      windowClass: 'modal-alert',
      backdropClass: 'modal-alert-backdrop'
    });
    modalDocView.result.then(function (res) {
      var index = null;
      var found = _.find($scope.project.ownershipData, function (org, idx) {
          if (org.organization._id === data.organization._id) {
            index = idx; return true;
          }
      });
      if (!found) {
        // We already added this to the list, error.
        AlertService.error('Could not delete the organization.');
      } else {
        _.remove($scope.project.ownershipData, {
            organization: data.organization
        });
      }
    });
  };

  $scope.onChangeType = function() {
    var found = _.find($scope.commodities, function(list) {
      return list.type === $scope.project.type;
    });
    $scope.commoditiesList = found ? found.commodities : [];
    // Should we wipe out $scope.project.commodities if the type changes?
  };

  $scope.onChangePhase = function () {
    // The user decided to change the current phase.  Until we have a specific tiemline
    // graphic, lets just set the phase code/name appropriately. Do not attempt to start/stop/complete
    // various phases.
    project.currentPhaseName = $scope.allPhases[project.currentPhaseCode];
  };

  $scope.clearOrganization = function() {
    $scope.project.proponent = null;
  };

  $scope.clearPrimaryContact = function() {
    $scope.project.primaryContact = null;
  };

  // Save Project
  $scope.saveProject = function(isValid, currTab) {
    // Make sure the math works on ownership properties.
    var percentTotal = 0;
    _.each($scope.project.ownershipData, function (o) {
      percentTotal += o.sharePercent;
    });

    if (percentTotal !== 100) {
      AlertService.error("Can't save project until ownership on project amounts to 100%.");
      return false;
    }

    if (!isValid) {
      $scope.$broadcast('show-errors-check-validity', 'projectForm');
      $scope.$broadcast('show-errors-check-validity', 'detailsForm');
      $scope.$broadcast('show-errors-check-validity', 'contactsForm');
      return false;
    }

    // Save new project
    if (ProjectModel.modelIsNew) {
      ProjectModel.add ($scope.project)
      .then( function(data) {
        $state.go('p.detail', {projectid: data.code}, {reload: true});
      })
      .catch (function (err) {
        console.error ('error = ', err);
      });

    // Save existing project
    } else {
      ProjectModel.saveModel($scope.project)
      .then( function(data) {
        AlertService.success('Public content was saved.');
        $state.go('p.edit', {projectid: data.code}, {reload: true});
        return Promise.resolve();
      })
      .catch (function(err) {
        AlertService.error('An error occurred.');
        console.error ('error = ', err);
      });
    }
  };

  $scope.onChangeProjectName = function () {
    // Calculate the new shortname
    project.shortName = codeFromTitle(project.name);
    project.code = codeFromTitle(project.name);
  };

  $scope.cancelChanges = function (title, msg, okTitle, cancel) {
    //Are you sure you would like to exit and discard all changes
    var modalDocView = $modal.open({
      animation: true,
      templateUrl: 'modules/utils/client/views/partials/modal-confirm-generic.html',
      controller: function($scope, $state, $modalInstance, _) {
        var self = this;
        self.title = title || "thetitle";
        self.question = msg || "the message?";
        self.actionOK = okTitle || "theOK title";
        self.actionCancel = cancel || "cancel title";
        self.ok = function() {
          $modalInstance.close($scope.project);
        };
        self.cancel = function() {
          $modalInstance.dismiss('cancel');
        };
      },
      controllerAs: 'self',
      scope: $scope,
      size: 'md',
      windowClass: 'modal-alert',
      backdropClass: 'modal-alert-backdrop'
    });
    // do not care how this modal is closed, just go to the desired location...
    modalDocView.result.then(function (res) {
      $state.go('p.detail', {}, {reload: true});
    });
  };

  // Submit the project for stream assignment.
  $scope.submitProject = function(isValid, title, msg, okTitle, cancel) {
    // First, check for errors
    if (!isValid) {
      $scope.$broadcast('show-errors-check-validity', 'detailsForm');
      return false;
    }

    // Pop confirmation dialog, after OK, publish immediately.
    var modalDocView = $modal.open({
      animation: true,
      templateUrl: 'modules/utils/client/views/partials/modal-confirm-generic.html',
      controller: function($scope, $state, $modalInstance, _) {
        var self = this;
        self.title = title || "thetitle";
        self.question = msg || "the message?";
        self.actionOK = okTitle || "theOK title";
        self.actionCancel = cancel || "cancel title";
        self.ok = function() {
          $modalInstance.close($scope.project);
        };
        self.cancel = function() {
          $modalInstance.dismiss('cancel');
        };
      },
      controllerAs: 'self',
      scope: $scope,
      size: 'md',
      windowClass: 'modal-alert',
      backdropClass: 'modal-alert-backdrop'
    });
    // do not care how this modal is closed, just go to the desired location...
    modalDocView.result.then(function (res) {
      // add some default fields
      $scope.project.subtitle = $scope.project.name ? $scope.project.name + ' Overview' : 'Overview';
      $scope.project.content = PROJECT_CONTENT_DEFAULTS;
      setContentHtml($scope.project.content, 'Mines', 'Intro', $scope.project.description);

      // console.log("Submitting project.");
      ProjectModel.add ($scope.project)
      .then (function (data) {
        return ProjectModel.submit(data);
      })
      .then( function (p) {
        $scope.project = p;
        return ProjectModel.publishProject(p);
        // $state.go('p.detail', {projectid: p.code});
      })
      .then( function (p) {
        $scope.project = p;
        $state.go('p.detail', {projectid: p.code}, {reload: true});
      })
      .catch (function (err) {
        console.error ('error = ', err);
      });
    });
  };

  $scope.showSuccess = function(msg, transitionCallback, title) {
    var modalDocView = $modal.open({
      animation: true,
      templateUrl: 'modules/utils/client/views/partials/modal-success.html',
      controller: function($scope, $state, $modalInstance, _) {
        var self = this;
        self.title = title || 'Success';
        self.msg = msg;
        self.ok = function() {
          $modalInstance.close($scope.project);
        };
        self.cancel = function() {
          $modalInstance.dismiss('cancel');
        };
      },
      controllerAs: 'self',
      scope: $scope,
      size: 'md',
      windowClass: 'modal-alert',
      backdropClass: 'modal-alert-backdrop'
    });
    // do not care how this modal is closed, just go to the desired location...
    modalDocView.result.then(function (res) {transitionCallback(); }, function (err) { transitionCallback(); });
  };

  $scope.showError = function(msg, errorList, transitionCallback, title) {
    var modalDocView = $modal.open({
      animation: true,
      templateUrl: 'modules/utils/client/views/partials/modal-error.html',
      controller: function($scope, $state, $modalInstance, _) {
        var self = this;
        self.title = title || 'An error has occurred';
        self.msg = msg;
        self.ok = function() {
          $modalInstance.close($scope.project);
        };
        self.cancel = function() {
          $modalInstance.dismiss('cancel');
        };
      },
      controllerAs: 'self',
      scope: $scope,
      size: 'md',
      windowClass: 'modal-alert',
      backdropClass: 'modal-alert-backdrop'
    });
    // do not care how this modal is closed, just go to the desired location...
    modalDocView.result.then(function (res) {transitionCallback(); }, function (err) { transitionCallback(); });
  };

  var goToList = function() {
    $state.transitionTo('activities', {}, {
      reload: true, inherit: false, notify: true
    });
  };

  var reloadEdit = function() {
    $state.reload();
  };

  $scope.deleteProject = function() {
    var modalDocView = $modal.open({
      animation: true,
      templateUrl: 'modules/utils/client/views/partials/modal-confirm-delete.html',
      controller: function($scope, $state, $modalInstance, _) {
        var self = this;
        self.dialogTitle = "Delete Project";
        self.name = $scope.project.name;
        self.ok = function() {
          $modalInstance.close($scope.project);
        };
        self.cancel = function() {
          $modalInstance.dismiss('cancel');
        };
      },
      controllerAs: 'self',
      scope: $scope,
      size: 'md'
    });
    modalDocView.result.then(function (res) {
      ProjectModel.removeProject($scope.project)
        .then(function (res) {
          // deleted show the message, and go to list...
          $scope.showSuccess('"'+ $scope.project.name +'"' + ' was deleted successfully.', goToList, 'Delete Success');
        })
        .catch(function (res) {
          console.log("res:", res);
          // could have errors from a delete check...
          var failure = _.has(res, 'message') ? res.message : undefined;
          $scope.showError('"'+ $scope.project.name +'"' + ' was not deleted.', [], reloadEdit, 'Delete Error');
        });
    }, function () {
      //console.log('delete modalDocView error');
    });
  };
}

controllerProjectPublicContent.$inject = ['$scope', '$state', '$stateParams', '$modal', 'project', 'ProjectModel', 'AlertService', 'ConfirmService', '_'];
/* @ngInject */
function controllerProjectPublicContent ($scope, $state, $stateParams, $modal, project, ProjectModel, AlertService, ConfirmService, _) {
  $scope.project = project;

  ProjectModel.setModel($scope.project);

  $scope.currTab = $stateParams.currTab;

  // PROJECT PUBLIC CONTENT DESCRIPTIONS
  $scope.tinymceOptions = {
    inline: false,
    plugins: 'autolink link paste',
    menubar: false,
    toolbar: 'undo redo | bold italic | link',
    statusbar: false,
    height: 200,
    content_css: '/modules/core/client/css/core.css'
  };

  $scope.mineIntro  = getContentHtml($scope.project.content, 'Mines', 'Intro');
  $scope.authIntro  = getContentHtml($scope.project.content, 'Auth',  'Intro');
  $scope.compIntro  = getContentHtml($scope.project.content, 'Comp',  'Intro');
  $scope.otherIntro = getContentHtml($scope.project.content, 'Other', 'Intro');

  // Convert years to numbers
  $scope.morePermitsLinkYear     = parseInt($scope.project.morePermitsLinkYear, 10)     || null;
  $scope.moreInspectionsLinkYear = parseInt($scope.project.moreInspectionsLinkYear, 10) || null;

  $scope.saveProject = function(isValid, currTab) {
    // Validate if public content has been promoted.
    if ($scope.project.isMajorMine && !isValid) {
      $scope.$broadcast('show-errors-check-validity', 'publicContentForm');
      return false;
    }

    setContentHtml($scope.project.content, 'Mines', 'Intro', $scope.mineIntro);
    setContentHtml($scope.project.content, 'Auth',  'Intro', $scope.authIntro);
    setContentHtml($scope.project.content, 'Comp',  'Intro', $scope.compIntro);
    setContentHtml($scope.project.content, 'Other', 'Intro', $scope.otherIntro);

    $scope.project.morePermitsLinkYear     = $scope.morePermitsLinkYear;
    $scope.project.moreInspectionsLinkYear = $scope.moreInspectionsLinkYear;

    ProjectModel.saveModel($scope.project)
    .then(function() {
      AlertService.success('Public content was saved.');
      $scope.goToPublicContent(currTab);
    })
    .catch (function (err) {
      AlertService.error('Public content could not be saved.');
      console.error ('error = ', err);
    });
  };

  $scope.cancelChanges = function(currTab) {
    // Are you sure you would like to exit and discard all changes?
    ConfirmService.confirmDialog({
      titleText    : 'Cancel Changes',
      confirmText  : 'Are you sure you would like to exit and discard all changes?',
      okText       : 'Cancel Changes',
      cancelText   : 'Go Back',
      onOk         : $scope.goToPublicContent,
      okArgs       : currTab
    });
  };

  $scope.promote = function(isValid) {
    // Validate before promoting public content.
    if (!isValid) {
      $scope.$broadcast('show-errors-check-validity', 'publicContentForm');
      return false;
    }

    var promote = function() {
      return ProjectModel.promote($scope.project)
        .then(function() {
          AlertService.success('Public content was displayed on mines.nrs.');
          $scope.goToPublicContent();
        })
        .catch(function(res) {
          AlertService.error('Public content could not be displayed on mines.nrs.');
          console.error("res:", res);
        });
    };

    // Are you sure you would like to promote public content?
    ConfirmService.confirmDialog({
      titleText    : 'Promote Public Content',
      confirmText  : 'Are you sure you would like to display public content on mines.nrs?',
      okText       : 'Yes',
      cancelText   : 'No',
      onOk         : promote,
    });
  };

  $scope.demote = function() {
    var demote = function() {
      return ProjectModel.demote($scope.project)
        .then(function() {
          AlertService.success('Public content was removed from mines.nrs.');
          $scope.goToPublicContent();
        })
        .catch(function(res) {
          AlertService.error('Public content could not be removed from mines.nrs.');
          console.error("res:", res);
        });
    };

    // Are you sure you would like to demote public content?
    ConfirmService.confirmDialog({
      titleText    : 'Remove Public Content',
      confirmText  : 'Are you sure you would like to remove public content from mines.nrs?',
      okText       : 'Yes',
      cancelText   : 'No',
      onOk         : demote,
    });
 };

  // Reload public content page
  $scope.goToPublicContent = function(currTab) {
    $state.go('p.publiccontent', { currTab: currTab }, { reload: true });
    return Promise.resolve();
  };

  // Update project model when external links are reordered
  $scope.onLinksReordered = function (sortedList) {
    $scope.project.externalLinks = sortedList;
  };

  $scope.addLink = function () {
    // New
    $scope.openLinkDialog().then(function (link) {
      // Add this to the list if it's not already added.
      var found = _.find($scope.project.externalLinks, function (l) { return l.link === link.link; });
      if (found) {
        // We already added this to the list, error.
        AlertService.error('The external link has been added already.');
      } else {
        $scope.project.externalLinks.push(link);
        _.each($scope.project.externalLinks, function (item, i) { item.order = i + 1; });
      }
    });
  };

  $scope.editLink = function (link) {
    $scope.openLinkDialog(link).then(function (newValue) {
      var i = _.findIndex($scope.project.externalLinks, function (l) { return l.link === link.link; });
      if (i < 0) {
        // Error
        AlertService.error('Could not update the external link.');
      } else {
        $scope.project.externalLinks[i] = newValue;
      }
    });
  };

  // Prompt for confirmation before deleting an external link
  $scope.deleteLink = function (link) {
    $scope.confirmDeleteLink(link).then(function () {
      var found = _.find($scope.project.externalLinks, function (l) { return l.link === link.link; });
      if (!found) {
        // Error
        AlertService.error('Could not delete the external link.');
      } else {
        _.remove($scope.project.externalLinks, found);
        _.each($scope.project.externalLinks, function (item, i) { item.order = i + 1; });
      }
    });
  };

  // Delete External Link Confirmation Modal
  $scope.confirmDeleteLink = function (link) {
    var modalView = $modal.open({
      animation: true,
      templateUrl: 'modules/utils/client/views/partials/modal-confirm-delete.html',
      controller: function ($scope, $modalInstance) {
        var self = this;
        self.dialogTitle = "Delete Link";
        self.name = link.link;
        self.ok = function () {
          $modalInstance.close(link);
        };
        self.cancel = function () {
          $modalInstance.dismiss('cancel');
        };
      },
      controllerAs: 'self',
      scope: $scope,
      size: 'md'
    });
    return modalView.result;
  };

  // Manage External Link Modal
  $scope.openLinkDialog = function (link) {
    var modalView = $modal.open({
      animation: true,
      controllerAs: 'self',
      scope: $scope,
      size: 'md',
      backdropClass: 'modal-alert-backdrop',
      templateUrl: 'modules/projects/client/views/project-partials/edit-external-links-modal.html',
      controller: function ($scope, $modalInstance, _) {
        var self = this;
        var isNew = !link;
        self.title = isNew ? "Add External Link" : "Edit External Link";
        self.link = isNew ? { title: "", link: "", order: 0 } : _.clone(link);

        // Validate before saving
        self.save = function (isValid) {
          if (!isValid) {
            $scope.$broadcast('show-errors-check-validity', 'linkForm');
            return false;
          }
          self.onSave(self.link);
        };

        self.onSave = function (newValue) {
          $modalInstance.close(newValue);
        };

        self.onClose = function () {
          $modalInstance.dismiss('cancel');
        };
      }
    });
    return modalView.result;
  };

}
