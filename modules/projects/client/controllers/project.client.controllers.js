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

  $scope.resetValidity = function() {
    $scope.newNameInvalid = false;
    $scope.detailsTabInvalid = false;
    $scope.proponentsTabInvalid = false;
    $scope.activitiesTabInvalid = false;
    $scope.publicContentTabInvalid = false;
  };

  $scope.resetValidity();

  ProjectModel.setModel($scope.project);

  $scope.goToList = function() {
    $state.transitionTo('activities', {}, {
      reload: true, inherit: false, notify: true
    });
  };

  $scope.reloadEdit = function() {
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
      .catch (function (/* err */) {
        // swallow rejected promise error
      });
  }

  if ($stateParams.projectid === 'new') {
    ProjectModel.modelIsNew = true;
  }

  if (ProjectModel.modelIsNew) {
    $scope.project.activities = PROJECT_ACTIVITIES_DEFAULTS;
    $scope.project.content = PROJECT_CONTENT_DEFAULTS;
    $scope.project.subtitle = 'Overview';
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
    $state.go('p.detail', { currTab: currTab }, { reload: true });
    return Promise.resolve();
  };

  // Commodities
  $scope.getCommodities = function() {
    var found = _.find($scope.commodities, function(list) {
      return list.type === $scope.project.type;
    });
    $scope.commoditiesList = found ? found.commodities : [];
    $scope.commodityMessage = $scope.project.type ? 'Enter a commodity' : 'Select a project type to view commodity list'
  }
  // Want this to fire once on load, then every time the field is clicked.
  $scope.getCommodities();

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
    if (!data) {return;}

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
      controller: function($scope, $state, $uibModalInstance) {
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
    modalDocView.result.then(function (/* res */) {
      var found = _.find($scope.project.ownershipData, function (org) {
        return (org.organization._id === data.organization._id);
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

  $scope.onChangeProjectName = function() {
    // Calculate the new shortname
    project.shortName = codeFromTitle(project.name);
    project.code = codeFromTitle(project.name);
    project.subtitle = project.name ? project.name + ' Overview' : 'Overview';
  };

  $scope.onChangeProjectDesc = function() {
    if (!$scope.mineIntro) {
      $scope.mineIntro = $scope.project.description;
    }
  };

  $scope.validateProject = function(isValidDetails, isValidProponents, isValidActivities, isValidPublicContent) {
    $scope.resetValidity();

    if (!$scope.project.isPublished) {
      // Only validate project name for new projects
      if (!$scope.project.name) {
        $scope.newNameInvalid = true;
        return false;
      }
      return true;
    }

    var isValid = true;

    if (!isValidDetails) {
      $scope.$broadcast('show-errors-check-validity', 'detailsForm');
      $scope.detailsTabInvalid = true;
      isValid = false;
    }

    if (!isValidProponents) {
      $scope.$broadcast('show-errors-check-validity', 'proponentsForm');
      $scope.proponentsTabInvalid = true;
      isValid = false;
    }

    if (!isValidActivities) {
      $scope.$broadcast('show-errors-check-validity', 'activitesForm');
      $scope.activitiesTabInvalid = true;
      isValid = false;
    }

    if ($scope.project.isMajorMine && !isValidPublicContent) {
      $scope.$broadcast('show-errors-check-validity', 'publicContentForm');
      $scope.publicContentTabInvalid = true;
      isValid = false;
    }

    // Make sure the math works on ownership properties.
    var percentTotal = 0;
    _.each($scope.project.ownershipData, function (o) {
      percentTotal += o.sharePercent;
    });

    if (percentTotal !== 100) {
      $scope.proponentsTabInvalid = true;
      isValid = false;
    }

    return isValid;
  };

  $scope.saveProject = function(isValidDetails, isValidProponents, isValidActivities, isValidPublicContent, currTab) {
    if ($scope.validateProject(isValidDetails, isValidProponents, isValidActivities, isValidPublicContent)) {
      setContentHtml($scope.project.content, 'Mines', 'Intro', $scope.mineIntro);
      setContentHtml($scope.project.content, 'Auth', 'Intro', $scope.authIntro);
      setContentHtml($scope.project.content, 'Comp', 'Intro', $scope.compIntro);
      setContentHtml($scope.project.content, 'Other', 'Intro', $scope.otherIntro);

      $scope.project.morePermitsLinkYear = $scope.morePermitsLinkYear;
      $scope.project.moreInspectionsLinkYear = $scope.moreInspectionsLinkYear;
      $scope.project.tailingsImpoundments = $scope.tailingsImpoundments;

      if (ProjectModel.modelIsNew) {
        ProjectModel.add($scope.project)
          .then(function(data) {
            return ProjectModel.submit(data);
          })
          .then(function(data) {
            $scope.project = data;
            AlertService.success('Project was added.', 4000);
            $state.go('p.edit', { projectid:  $scope.project.code, currTab: currTab }, { reload: true });
          })
          .catch(function(/* err */) {
            AlertService.error('Project could not be added.', 4000);
          });
      } else {
        ProjectModel.saveModel($scope.project)
          .then(function() {
            AlertService.success('Project was saved.', 4000);
            $scope.goToEdit(currTab);
          })
          .catch(function(/* err */) {
            AlertService.error('Project could not be saved.', 4000);
          });
      }
    }
  };

  $scope.publishProject = function(isValidDetails, isValidProponents, isValidActivities, isValidPublicContent, currTab) {
    if ($scope.validateProject(isValidDetails, isValidProponents, isValidActivities, isValidPublicContent)) {
      // Pop confirmation dialog, after OK, publish immediately.
      var modalDocView = $uibModal.open({
        animation: true,
        templateUrl: 'modules/utils/client/views/partials/modal-confirm-generic.html',
        controller: function($scope, $state, $uibModalInstance) {
          var self = this;
          self.title = 'Publish Project';
          self.question = 'Are you sure? Publishing this project will make its content available to the public.';
          self.actionOK = 'Publish Project';
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
      modalDocView.result.then(function() {
        ProjectModel.publishProject($scope.project)
          .then(function(){
            AlertService.success('Project was published successfully.', 4000);
            $scope.goToEdit(currTab);
          })
          .catch (function (/* err */) {
            AlertService.error('Project could not be published.', 4000);
          });
      });
    }
  };

  $scope.unpublishProject = function(currTab) {
    // Pop confirmation dialog, after OK, publish immediately.
    var modalDocView = $uibModal.open({
      animation: true,
      templateUrl: 'modules/utils/client/views/partials/modal-confirm-generic.html',
      controller: function($scope, $state, $uibModalInstance) {
        var self = this;
        self.title = 'Unpublish Project';
        self.question = 'All published content and information associated with this project will no longer be visible to the public. Are you sure you want to unpublish this project?';
        self.actionOK = 'Unpublish Project';
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
    modalDocView.result.then(function() {
      ProjectModel.unpublishProject($scope.project)
        .then(function(){
          AlertService.success('Project was unpublished successfully.', 4000);
          $scope.goToEdit(currTab);
        })
        .catch (function (/* err */) {
          AlertService.error('Project could not be unpublished.', 4000);
        });
    });
  };

  $scope.deleteProject = function() {
    var modalDocView = $uibModal.open({
      animation: true,
      templateUrl: 'modules/utils/client/views/partials/modal-confirm-delete.html',
      controller: function($scope, $state, $uibModalInstance) {
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
    modalDocView.result.then(function () {
      ProjectModel.removeProject($scope.project)
        .then(function () {
          AlertService.success('Project was deleted successfully.', 4000);
          $scope.goToList();
        })
        .catch(function (/* res */) {
          // could have errors from a delete check...
          AlertService.success('Project could not be deleted.', 4000);
          $scope.reloadEdit();
        });
    }, function () {
      // swallow rejected promise error
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
  $scope.mineIntro = getContentHtml($scope.project.content, 'Mines', 'Intro');
  $scope.authIntro = getContentHtml($scope.project.content, 'Auth', 'Intro');
  $scope.compIntro = getContentHtml($scope.project.content, 'Comp', 'Intro');
  $scope.otherIntro = getContentHtml($scope.project.content, 'Other', 'Intro');

  // Convert years to numbers
  $scope.morePermitsLinkYear = parseInt($scope.project.morePermitsLinkYear, 10) || null;
  $scope.moreInspectionsLinkYear = parseInt($scope.project.moreInspectionsLinkYear, 10) || null;

  // Convert tailingsImpoundments to number
  $scope.tailingsImpoundments = parseInt($scope.project.tailingsImpoundments, 10) || 0;

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
        .catch(function(/* err */) {
          AlertService.error('Public content could not be displayed on mines.nrs.', 4000);
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
        .catch(function(/* err */) {
          AlertService.error('Public content could not be removed from mines.nrs.', 4000);
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
