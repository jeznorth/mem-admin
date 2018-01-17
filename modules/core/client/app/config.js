'use strict';

// Init the application configuration module for AngularJS application
var ApplicationConfiguration = (function () {
  // Init module configuration options
  var applicationModuleName = 'mean';
  var applicationModuleVendorDependencies = [
    'ngResource',
    'ngAnimate',
    'ngMessages',
    'ui.router',
    'ui.bootstrap',
    'ui.utils',
    'uiGmapgoogle-maps',
    'ngTable',
    'angularMoment',
    'ui.bootstrap.datepicker',
    'ui.bootstrap.timepicker',
    'mwl.confirm',
    'ngFileUpload',
    'duScroll',
    'ui.select',
    'ngSanitize',
    'ngPDFViewer',
    'ngCookies',
    'ngclipboard',
    'dndLists'
  ];

  // Add a new vertical module
  var registerModule = function (moduleName, dependencies) {
    // Create angular module
    angular.module(moduleName, dependencies || []);

    // Add the module to the AngularJS configuration file
    angular.module(applicationModuleName).requires.push(moduleName);
  };

  return {
    applicationModuleName: applicationModuleName,
    applicationModuleVendorDependencies: applicationModuleVendorDependencies,
    registerModule: registerModule
  };
})();
