'use strict';

angular.module('project')
  // General
  .controller('controllerProjectEntry', controllerProjectEntry);

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

// EDIT PROJECT DETAILS
controllerProjectEntry.$inject = ['$scope', '$state', '$stateParams', '$uibModal', 'project', 'REGIONS', 'PROJECT_TYPES', 'PROJECT_COMMODITIES', 'PROJECT_ACTIVITIES_DEFAULTS', 'PROJECT_ACTIVITY_STATUS', 'PROJECT_CONTENT_DEFAULTS', 'CEAA_TYPES', '_', 'UserModel', 'ProjectModel', 'OrganizationModel', 'Authentication', 'codeFromTitle', 'PhaseBaseModel', 'AlertService', 'ConfirmService', 'Utils'];
/* @ngInject */
function controllerProjectEntry ($scope, $state, $stateParams, $uibModal, project, REGIONS, PROJECT_TYPES, PROJECT_COMMODITIES, PROJECT_ACTIVITIES_DEFAULTS, PROJECT_ACTIVITY_STATUS, PROJECT_CONTENT_DEFAULTS, CEAA_TYPES, _, UserModel, ProjectModel, OrganizationModel, Authentication, codeFromTitle, PhaseBaseModel, AlertService, ConfirmService, Utils) {
  
  $scope.project = project;
  $scope.currTab = $stateParams.currTab;
  $scope.questions = ProjectModel.getProjectIntakeQuestions();
  $scope.regions = REGIONS;
  $scope.types = PROJECT_TYPES;
  $scope.commodities = PROJECT_COMMODITIES;
  $scope.activityStatusItems = PROJECT_ACTIVITY_STATUS;
  $scope._ = _;
  $scope.CEAA = CEAA_TYPES;

  ProjectModel.setModel($scope.project);

  var goToList = function() {
    $state.transitionTo('activities', {}, {
      reload: true, inherit: false, notify: true
    });
  };

  var reloadEdit = function() {
    $state.reload();
  };

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

  if (ProjectModel.modelIsNew) {
    $scope.project.activities = PROJECT_ACTIVITIES_DEFAULTS;
  }

  // Get EPIC projects
  Utils.getEpicProjects().then(function(res) {
    $scope.epicProjectsList = res.data;
  });

  PhaseBaseModel.getCollection().then( function (data) {
    var obj = {};
    _.each(data, function (item) {
      obj[item.code] = item.name;
    });
    $scope.allPhases = obj;
    $scope.$apply();
  });

  // Reload Project Edit Page
  $scope.goToEdit = function(currTab) {
    $state.go('p.edit', { currTab: currTab }, { reload: true });
    return Promise.resolve();
  };

  // Go to Project Details Page
  $scope.goToDetails = function(currTab) {
    $state.go('p.detail', { reload: true });
    return Promise.resolve();
  };

  // Commodities
  var found = _.find($scope.commodities, function(list) {
    return list.type === $scope.project.type;
  });
  $scope.commoditiesList = found ? found.commodities : [];

  // Project Description
  $scope.tinymceOptions = {
    inline: false,
    plugins: 'autolink link paste',
    menubar: false,
    toolbar: 'undo redo | bold italic | link',
    statusbar: false,
    height: 100,
    content_css: '/modules/core/client/css/core.css'
  };

  // Ownership
  $scope.addOwnershipOrganization = function (data) {
    if (!data) return;

    // Add this to the list if it's not already added.
    var found = _.find($scope.project.ownershipData, function (org) {
      return org.organization._id === data._id;
    });
    if (found) {
      // We already added this to the list, error.
      AlertService.error('The selected organization has been added already.', 4000);
    } else {
      $scope.project.ownershipData.push({ organization: data, sharePercent: 100 });
    }
  };
  // Remove Owners
  $scope.deleteOwnership = function (data) {
    // Make sure they really want to do this
    var modalDocView = $uibModal.open({
      animation: true,
      templateUrl: 'modules/utils/client/views/partials/modal-confirm-generic.html',
      controller: function($scope, $state, $uibModalInstance, _) {
        var self = this;
        self.title = 'Remove '+ data.organization.name;
        self.question = 'Are you want to remove the ownership from this project?';
        self.actionOK = 'Ok';
        self.actionCancel = 'Cancel';
        self.ok = function() {
          $uibModalInstance.close();
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
    modalDocView.result.then(function (res) {
      var index = null;
      var found = _.find($scope.project.ownershipData, function (org, idx) {
          if (org.organization._id === data.organization._id) {
            index = idx; return true;
          }
      });
      if (!found) {
        // We already added this to the list, error.
        AlertService.error('Could not delete the organization.', 4000);
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

  $scope.saveProject = function(isValid, currTab) {
    // Make sure the math works on ownership properties.
    var percentTotal = 0;
    _.each($scope.project.ownershipData, function (o) {
      percentTotal += o.sharePercent;
    });

    if (percentTotal !== 100) {
      AlertService.error("Can't save project until ownership on project amounts to 100%.", 4000);
      return false;
    }

    if (!isValid) {
      $scope.$broadcast('show-errors-check-validity', 'projectForm');
      $scope.$broadcast('show-errors-check-validity', 'detailsForm');
      $scope.$broadcast('show-errors-check-validity', 'contactsForm');
      return false;
    }

    if ($scope.project.isMajorMine && !isValid) {
      $scope.$broadcast('show-errors-check-validity', 'publicContentForm');
      return false;
    }

    setContentHtml($scope.project.content, 'Mines', 'Intro', $scope.mineIntro);
    setContentHtml($scope.project.content, 'Auth',  'Intro', $scope.authIntro);
    setContentHtml($scope.project.content, 'Comp',  'Intro', $scope.compIntro);
    setContentHtml($scope.project.content, 'Other', 'Intro', $scope.otherIntro);

    if (ProjectModel.modelIsNew) {
      ProjectModel.add ($scope.project)
      .then( function(data) {
        AlertService.success('Public content was saved.', 4000);
        $scope.goToEdit(currTab);
      })
      .catch (function (err) {
        AlertService.error('An error has occurred.', 4000);
        console.error ('error = ', err);
      });
    } else {
      ProjectModel.saveModel($scope.project)
      .then( function(data) {
        AlertService.success('Public content was saved.', 4000);
        $scope.goToEdit(currTab);
      })
      .catch (function (err) {
        AlertService.error('An error has occurred.', 4000);
        console.error ('error = ', err);
      });
    }   
  };

  $scope.onChangeProjectName = function () {
    // Calculate the new shortname
    project.shortName = codeFromTitle(project.name);
    project.code = codeFromTitle(project.name);
  };

  $scope.deleteProject = function() {
    var modalDocView = $uibModal.open({
      animation: true,
      templateUrl: 'modules/utils/client/views/partials/modal-confirm-delete.html',
      controller: function($scope, $state, $uibModalInstance, _) {
        var self = this;
        self.dialogTitle = "Delete Project";
        self.name = $scope.project.name;
        self.ok = function() {
          $uibModalInstance.close($scope.project);
        };
        self.cancel = function() {
          $uibModalInstance.dismiss('cancel');
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

  $scope.cancelChanges = function(currTab) {
    // Are you sure you would like to exit and discard all changes?
    ConfirmService.confirmDialog({
      titleText    : 'Unsaved Changes',
      confirmText  : 'You have unsaved changes to this project. Are you sure you would like exit without saving?',
      okText       : 'Yes',
      cancelText   : 'No',
      onOk         : $scope.goToDetails,
      okArgs       : currTab
    });
  };

  $scope.submitProject = function(isValid, title, msg, okTitle, cancel) {
    // First, check for errors
    if (!isValid) {
      $scope.$broadcast('show-errors-check-validity', 'detailsForm');
      return false;
    }

    // Pop confirmation dialog, after OK, publish immediately.
    var modalDocView = $uibModal.open({
      animation: true,
      templateUrl: 'modules/utils/client/views/partials/modal-confirm-generic.html',
      controller: function($scope, $state, $uibModalInstance, _) {
        var self = this;
        self.title = title || "thetitle";
        self.question = msg || "the message?";
        self.actionOK = okTitle || "theOK title";
        self.actionCancel = cancel || "cancel title";
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

  // EXTERNAL LINKS INTERFACE
  $scope.onLinksReordered = function (sortedList) {
    $scope.project.externalLinks = sortedList;
  };

  // Add New External Link
  $scope.addLink = function () {
    // New
    $scope.openLinkDialog().then(function (link) {
      // Add this to the list if it's not already added.
      var found = _.find($scope.project.externalLinks, function (l) { return l.link === link.link; });
      if (found) {
        // We already added this to the list, error.
        AlertService.error('The external link has been added already.', 4000);
      } else {
        $scope.project.externalLinks.push(link);
        _.each($scope.project.externalLinks, function (item, i) { item.order = i + 1; });
      }
    });
  };

  // Delete External Link
  $scope.deleteLink = function (link) {
    $scope.confirmDeleteLink(link).then(function () {
      var found = _.find($scope.project.externalLinks, function (l) { return l.link === link.link; });
      if (!found) {
        // Error
        AlertService.error('Could not delete the external link.', 4000);
      } else {
        _.remove($scope.project.externalLinks, found);
        _.each($scope.project.externalLinks, function (item, i) { item.order = i + 1; });
      }
    });
  };

  // Delete External Link Confirmation Modal
  $scope.confirmDeleteLink = function (link) {
    var modalView = $uibModal.open({
      animation: true,
      templateUrl: 'modules/utils/client/views/partials/modal-confirm-delete.html',
      controller: function ($scope, $uibModalInstance) {
        var self = this;
        self.dialogTitle = "Delete Link";
        self.name = link.link;
        self.ok = function () {
          $uibModalInstance.close(link);
        };
        self.cancel = function () {
          $uibModalInstance.dismiss('cancel');
        };
      },
      controllerAs: 'self',
      scope: $scope,
      size: 'md'
    });
    return modalView.result;
  };

  // Edit External Link
  $scope.editLink = function (link) {
    $scope.openLinkDialog(link).then(function (newValue) {
      var i = _.findIndex($scope.project.externalLinks, function (l) { return l.link === link.link; });
      if (i < 0) {
        // Error
        AlertService.error('Could not update the external link.', 4000);
      } else {
        $scope.project.externalLinks[i] = newValue;
      }
    });
  };

  // Edit External Link Modal
  $scope.openLinkDialog = function (link) {
    var modalView = $uibModal.open({
      animation: true,
      controllerAs: 'self',
      scope: $scope,
      size: 'md',
      templateUrl: 'modules/projects/client/views/project-partials/edit-external-links-modal.html',
      controller: function ($scope, $uibModalInstance, _) {
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
          $uibModalInstance.close(newValue);
        };

        self.onClose = function () {
          $uibModalInstance.dismiss('cancel');
        };
      }
    });
    return modalView.result;
  };

  // BC MINE INFORMATION CONTENT
  $scope.mineIntro  = getContentHtml($scope.project.content, 'Mines', 'Intro');
  $scope.authIntro  = getContentHtml($scope.project.content, 'Auth',  'Intro');
  $scope.compIntro  = getContentHtml($scope.project.content, 'Comp',  'Intro');
  $scope.otherIntro = getContentHtml($scope.project.content, 'Other', 'Intro');

  // Convert years to numbers
  $scope.morePermitsLinkYear     = parseInt($scope.project.morePermitsLinkYear, 10)     || null;
  $scope.moreInspectionsLinkYear = parseInt($scope.project.moreInspectionsLinkYear, 10) || null;

  // Show on the Public Website
  $scope.promote = function(isValid) {
    // Validate before promoting public content.
    if (!isValid) {
      $scope.$broadcast('show-errors-check-validity', 'projectForm');
      return false;
    }

    var promote = function() {
      return ProjectModel.promote($scope.project)
        .then(function() {
          AlertService.success('Public content was displayed on mines.nrs.', 4000);
          $scope.goToEdit();
        })
        .catch(function(res) {
          AlertService.error('Public content could not be displayed on mines.nrs.', 4000);
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

  // Remove from Public Website
  $scope.demote = function() {
    var demote = function() {
      return ProjectModel.demote($scope.project)
        .then(function() {
          AlertService.success('Public content was removed from mines.nrs.', 4000);
          $scope.goToEdit();
        })
        .catch(function(res) {
          AlertService.error('Public content could not be removed from mines.nrs.', 4000);
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
}
