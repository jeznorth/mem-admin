'use strict';

angular.module('collections').config(['$stateProvider', function($stateProvider) {
  $stateProvider

    .state('p.collection', {
      abstract: true,
      url: '/collection',
      template: '<ui-view></ui-view>',
      data: { permissions: ['listCollections'] },
      resolve: {
        collections: function($stateParams, CollectionModel, project) {
          return CollectionModel.lookupProject(project.code);
        },
        types: function(COLLECTION_TYPES) {
          var types = COLLECTION_TYPES;
          return types.map(function(t) {
            return { id: t, title: t };
          });
        },
      }
    })

    .state('p.collection.list', {
      url: '/list',
      templateUrl: 'modules/collections/client/views/collections-list.html',
      controller: 'CollectionListCtrl'
    })

    .state('p.collection.create', {
      url: '/create',
      templateUrl: 'modules/collections/client/views/collection-edit.html',
      data: { permissions: ['createCollection'] },
      resolve: {
        collection: function(CollectionModel) {
          return CollectionModel.getNew();
        }
      },
      controller: 'CollectionCreateCtrl'
    })

    .state('p.collection.edit', {
      url: '/:collectionId/edit',
      templateUrl: 'modules/collections/client/views/collection-edit.html',
      data: { permissions: ['createCollection'] },
      resolve: {
        collection: function($stateParams, CollectionModel) {
          return CollectionModel.getModel($stateParams.collectionId);
        }
      },
      controller: 'CollectionEditCtrl'
    });
}]);
