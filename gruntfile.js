'use strict';

/**
 * Module dependencies.
 */
var _ = require('lodash'),
  defaultAssets = require('./config/assets/default'),
  testAssets = require('./config/assets/test'),
  fs = require('fs'),
  path = require('path');

var childProcess = require('child_process');

var server_proc;
var server_proc_done;

var test_proc;
var test_proc_done;

var drop_database_task_done

module.exports = function (grunt) {

  // handle control c
  var shuttingDown = false;
  var readline = require("readline");

  var stdInterface = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  if (process.platform != 'win32' ) {
    stdInterface.on("SIGINT", function() {
      grunt.task.clearQueue();//don't run any more grunt tasks
      if (shuttingDown) {//allow kill initiated call to exit and not overflow the stack
        return;
      }
      shuttingDown = true;

      console.info("SIGINT handler ...");//eslint-disable-line
      shutdownTests();
      shutdownServer();

      var out = fs.openSync('./gruntOut.log', 'a');
      var err = fs.openSync('./gruntError.log', 'a');

      var cleanupProcess = childProcess.spawn('grunt', ['cleanup'], {//need a child process so that the database can be cleaned up before the process is interupted
        env: process.env,
        detatched: true,
        shell:false,
        stdio: ['ignore', out, err ]
      });

      cleanupProcess.unref();//fully detatch from parent
    });
  }//TODO: determine kill process method in windows and implement

  // Project Configuration
  var LOGO = 'modules/core/client/img/brand/bc_logo_transparent.png'; // BC Logo
  var ENV = "MEM";

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    ngconstant: {
      options: {
        space: ' ',
        dest: 'public/dist/conf.js',
        name: 'conf'
      },
      dist: {
        constants: {
          'ENV': ENV,
          'LOGO': LOGO,
          'ADMIN_FEATURES': {
            enableImportMenu: 'true',
            enableSystemMenu: 'true',
            enableEmailTemplates: 'true',
            enableOrganizations: 'true',
            enableNews: 'true',
            enableTemplates: 'true',
            enableVcs: 'true',
            enableContacts: 'true',
            enablePrototype: 'false'
          },
          'FEATURES': {
            enableTimeline: 'true',
            enableDocuments: 'true',
            enableCollections: 'true',
            enablePublicContent: 'true',
            enableInvitations: 'true',
            enableGroups: 'true',
            enableUpdates: 'true',
            enableComplaints: 'true',
            enableConditions: 'true',
            enableCompliance: 'true',
            enableVcs: 'true',
            enableSchedule: 'true',
            enablePcp: 'true'
          }
        }
      }
    },
    env: {
      functional: {
        NODE_ENV: 'functional'
      },
      test: {
        NODE_ENV: 'test'
      },
      dev: {
        NODE_ENV: 'development'
      },
      prod: {
        NODE_ENV: 'production'
      }
    },
    watch: {
      serverViews: {
        files: defaultAssets.server.views,
        options: {
          livereload: true
        }
      },
      serverJS: {
        files: _.union(defaultAssets.server.gruntConfig, defaultAssets.server.allJS),
        tasks: ['eslint'],
        options: {
          livereload: true
        }
      },
      clientViews: {
        files: defaultAssets.client.views,
        options: {
          livereload: true
        }
      },
      clientJS: {
        files: defaultAssets.client.js,
        tasks: ['eslint'],
        options: {
          livereload: true
        }
      },
      clientCSS: {
        files: defaultAssets.client.css,
        tasks: ['csslint'],
        options: {
          livereload: true
        }
      },
      clientSCSS: {
        files: defaultAssets.client.sass,
        tasks: ['sass', 'csslint'],
        options: {
          livereload: true
        }
      },
      clientLESS: {
        files: defaultAssets.client.less,
        tasks: ['less', 'csslint'],
        options: {
          livereload: true
        }
      }
    },
    eslint: {
      target: 'modules/**/*.js',
      options: {
        configFile: '.eslintrc'
      }
    },
    csslint: {
      options: {
        csslintrc: '.csslintrc',
        'outline-none': false,
        'fallback-colors': false,
        'bulletproof-font-face' : false,
        'shorthand' : false
      },
      all: {
        src: defaultAssets.client.css
      }
    },
    ngAnnotate: {
      production: {
        files: {
          'public/dist/application.js': defaultAssets.client.js
        }
      }
    },
    uglify: {
      production: {
        options: {
          mangle: false
        },
        files: {
          'public/dist/application.min.js': 'public/dist/application.js'
        }
      }
    },
    cssmin: {
      combine: {
        files: {
          'public/dist/application.min.css': defaultAssets.client.css
        }
      }
    },
    sass: {
      dist: {
        files: [{
          expand: true,
          src: defaultAssets.client.sass,
          ext: '.css',
          rename: function (base, src) {
            return src.replace('/scss/', '/css/');
          }
        }]
      }
    },
    less: {
      dist: {
        files: [{
          expand: true,
          src: defaultAssets.client.less,
          ext: '.css',
          rename: function (base, src) {
            return src.replace('/less/', '/css/');
          }
        }]
      }
    },
    'node-inspector': {
      custom: {
        options: {
          'web-port': 1337,
          'web-host': 'localhost',
          'debug-port': 5858,
          'save-live-edit': true,
          'no-preload': true,
          'stack-trace-limit': 50,
          'hidden': []
        }
      }
    },
    mochaTest: {
      src: testAssets.tests.server,
      options: {
        reporter: 'spec'
      }
    },
    mocha_istanbul: {
      coverage: {
        src: testAssets.tests.server,
        options: {
          print: 'detail',
          coverage: true,
          require: 'test.js',
          coverageFolder: 'coverage',
          reportFormats: ['cobertura','lcovonly'],
          check: {
            lines: 40,
            statements: 40
          }
        }
      }
    },
    karma: {
      unit: {
        configFile: 'karma.conf.js'
      }
    },
    copy: {
      localConfig: {
        src: 'config/env/local.example.js',
        dest: 'config/env/local.js',
        filter: function () {
          return !fs.existsSync('config/env/local.js');
        }
      },
      tinyjson: {
        expand: true,
        cwd: 'node_modules/tiny-jsonrpc',
        src: '*',
        dest: 'node_modules/spooky/node_modules/tiny-jsonrpc',
      }
    }
  });

  grunt.event.on('coverage', function(lcovFileContents, done) {
    require('coveralls').handleInput(lcovFileContents, function(err) {
      if (err) {
        return done(err);
      }
      done();
    });
  });

  // Load NPM tasks
  require('load-grunt-tasks')(grunt);

  grunt.loadNpmTasks('grunt-ng-constant');

  grunt.task.registerTask('buildconstants',
    'Builds all the environment information and bakes it into a conf.js file.', function () {
      grunt.task.run('ngconstant');
    });

  // Make sure upload directory exists
  grunt.task.registerTask('mkdir:upload',
    'Task that makes sure upload directory exists.', function () {
      // Get the callback
      var done = this.async();

      grunt.file.mkdir(path.normalize(__dirname + '/modules/users/client/img/profile/uploads'));

      done();
    });

  // Connect to the MongoDB instance and load the models
  grunt.task.registerTask('mongoose',
    'Task that connects to the MongoDB instance and loads the application models.', function () {
      // Get the callback
      var done = this.async();

      // Use mongoose configuration
      var mongoose = require('./config/lib/mongoose.js');

      // Connect to database
      mongoose.connect(function () {
        done();
      });
    });

  grunt.task.registerTask('server',
    'Starting server...', function() {
      server_proc_done = this.async();

      server_proc = childProcess.spawn('node', ['server.js'], {
        env: process.env,
        detached: true,
        shell: false,
        stdio: 'ignore'
      });

      server_proc_done();
    });

  grunt.task.registerTask('functional',
    'Starting functional tests...', function() {
      test_proc_done = this.async();

      //'-DchromeTest.single=AddEditProjectSpec', --before chromeTest
      //'--info' --- after chromeTest
      //'--
      test_proc = childProcess.spawn(
        process.platform == 'win32' ? 'gradlew.bat' : './gradlew',
        ['chromeHeadlessTest'],
        {
          env: process.env,
          cwd: path.join(process.cwd(), 'functional-tests'),
          stdio: 'inherit'
        }
      );

      test_proc.on('exit', test_proc_done);
    }
  );

  grunt.task.registerTask('drop_database',
    'Dropping database...', function() {
      drop_database_task_done = this.async();

      var mongoose = require('./config/lib/mongoose.js');
      mongoose.dropDatabase(function() {
        drop_database_task_done();
      });
    });

  grunt.task.registerTask('shutdown_server',
    'Shutting down server...',
    shutdownServer
  );

  // Lint CSS and JavaScript files.
  grunt.registerTask('lint',
    ['sass', 'less', 'eslint', 'csslint']);

  // Lint project files and minify them into two production files.
  grunt.registerTask('build',
    ['env:dev', 'lint', 'ngAnnotate', 'uglify', 'cssmin', 'buildconstants']);

  grunt.registerTask('buildprod',
    ['env:prod', 'lint', 'ngAnnotate', 'uglify', 'cssmin', 'buildconstants']);

  grunt.registerTask('buildtest',
    ['env:test', 'lint', 'ngAnnotate', 'uglify', 'cssmin', 'buildconstants']);

  grunt.registerTask('buildfunctional',
    ['env:functional', 'lint', 'ngAnnotate', 'uglify', 'cssmin', 'buildconstants']);

  grunt.registerTask('runfunctional',
    ['buildfunctional', 'server', 'functional', 'drop_database', 'shutdown_server']);

  // Run the project tests - NB: These are not maintained at the moment.
  grunt.registerTask('test',
    'env:test')

  // Run project coverage
  grunt.registerTask('coverage',
    ['env:test', 'lint', 'mocha_istanbul:coverage']);

  // Run the project in development mode
  grunt.registerTask('default',
    ['env:dev', 'lint', 'mkdir:upload', 'copy:localConfig', 'copy:tinyjson', 'buildconstants']);

  // Run the project in debug mode
  grunt.registerTask('debug',
    ['env:dev', 'lint', 'mkdir:upload', 'copy:localConfig', 'copy:tinyjson', 'buildconstants']);

  // Run the project in production mode
  grunt.registerTask('prod',
    ['buildprod', 'env:prod', 'mkdir:upload', 'copy:localConfig', 'copy:tinyjson', 'buildconstants']);

  // Cleanup task
  grunt.registerTask('cleanup', ['env:functional', 'drop_database']);

  function shutdownTests() {
    if(test_proc) {
      console.log("shutting down tests...");//eslint-disable-line
      test_proc.kill('SIGINT');
    }
  }

  function shutdownServer() {
    if(server_proc) {
      console.log("shutting down server...");//eslint-disable-line
      server_proc.kill('SIGINT');
    }
  }
};
