'use strict';

angular.module('organizations')
  .directive('orgSearchChooser', function ($filter, $uibModal, NgTableParams, ProjectGroupModel, OrganizationModel) {
    return {
      restrict: 'A',
      scope: {
        project: '=',
        destination: '=',
        title: '=',
        callback: '&'
      },
      link: function (scope, element) {
        element.on('click', function () {
          $uibModal.open({
            animation: true,
            templateUrl: 'modules/organizations/client/views/org-search-chooser.html',
            size: 'lg',
            controllerAs: 's',
            controller: function ($filter, $scope, $uibModalInstance, _) {
              var s = this;
              s.title = scope.title;
              $scope.cur = scope.destination;

              OrganizationModel.getCollection()
                .then( function (data) {
                  if ($scope.cur) {
                    _.each(data, function (i) {
                      if (i._id === $scope.cur._id) {
                        i.Selected = true;
                      }
                    });
                  }
                  $scope.orgList = data;
                  $scope.tableParams = new NgTableParams ({count:10}, {dataset: $scope.orgList});
                  $scope.$apply();
                });

              $scope.toggleItem = function (item) {
                $scope.cur = item;
              };

              $scope.isChecked = function (i) {
                if ($scope.cur && $scope.cur._id === i._id) {
                  return true;
                }
              };

              s.cancel = function () {
                $uibModalInstance.dismiss('cancel');
              };

              s.ok = function () {
                $uibModalInstance.close($scope.cur);
              };
            }
          }).result.then(function (data) {
            scope.destination = data;
            // Event this back to the caller
            if (scope.callback) {
              scope.callback({org: data});
            }
          }).catch(function (/* err */) {
            // swallow rejected promise error
          });
        });
      }
    };
  })
  .directive('tmplOrganizationsDisplayEdit', directiveOrganizationsDisplayEdit);

// -----------------------------------------------------------------------------------
//
// DIRECTIVE: Activity Listing
//
// -----------------------------------------------------------------------------------
function directiveOrganizationsDisplayEdit() {
  var directive = {
    restrict: 'E',
    replace: true,
    templateUrl: 'modules/organizations/client/views/organizations-partials/organization-display-edit-form.html',
    controller: 'controllerOrganizationsDisplayEdit',
    controllerAs: 'displayEdit',
    scope: {
      organizationId: '@'
    }
  };
  return directive;
}
