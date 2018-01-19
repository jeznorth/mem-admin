'use strict';
angular.module('documents')

	.directive('documentMgrAddKeyword', ['$rootScope', '$uibModal', '$log', '_', 'DocumentMgrService', 'AlertService', 'TreeModel', function ($rootScope, $uibModal, $log, _, DocumentMgrService, AlertService, TreeModel) {
		return {
			restrict: 'A',
			scope: {
				project: '=',
				doc: '='
			},
			link: function (scope, element, attrs) {
				element.on('click', function () {
					$uibModal.open({
						animation: true,
						templateUrl: 'modules/documents/client/views/document-manager-add-keyword.html',
						resolve: {},
						controllerAs: 'addKeyword',
						controller: function ($scope, $uibModalInstance) {
							var self = this;

							$scope.doc = scope.doc;

							self.entryText = null;
							self.title = "Add Keyword to document:";
							self.documentDisplayName = $scope.doc.displayName;

							self.cancel = function () {
								$uibModalInstance.dismiss('cancel');
							};

							self.ok = function () {
								$uibModalInstance.close(self.entryText);
							};

						}
					}).result.then(function (data) {
						// $rootScope.$broadcast('documentMgrRefreshNode', { directoryStructure: data });
						scope.doc.keywords.push(data);
					})
					.catch(function (err) {
						//$log.error(err);
					});
				});
			}
		};
	}])
;
