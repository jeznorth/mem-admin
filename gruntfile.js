'use strict';

var defaultAssets = require('./config/assets/default');
var testAssets = require('./config/assets/test');
var fs = require('fs');
var path = require('path');
var childProcess = require('child_process');

var server_proc;
var server_proc_done;

var test_proc;
var test_proc_done;

var drop_database_task_done;

module.exports = function(grunt) {
  // handle ctrl-c
  var shuttingDown = false;
  var readline = require('readline');

  var stdInterface = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  if (process.platform != 'win32') {
    stdInterface.on('SIGINT', function() {
      grunt.task.clearQueue(); //don't run any more grunt tasks
      if (shuttingDown) {
        //allow kill initiated call to exit and not overflow the stack
        return;
      }
      shuttingDown = true;

      console.info('SIGINT handler ...'); //eslint-disable-line
      shutdownTests();
      shutdownServer();

      var out = fs.openSync('./gruntOut.log', 'a');
      var err = fs.openSync('./gruntError.log', 'a');

      var cleanupProcess = childProcess.spawn('grunt', ['cleanup'], {
        //need a child process so that the database can be cleaned up before the process is interupted
        env: process.env,
        detatched: true,
        shell: false,
        stdio: ['ignore', out, err]
      });

      cleanupProcess.unref(); //fully detatch from parent
    });
  } //TODO: determine kill process method in windows and implement

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
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
    eslint: {
      target: 'modules/**/*.js',
      options: {
        configFile: '.eslintrc',
        fix: true
      }
    },
    csslint: {
      options: {
        csslintrc: '.csslintrc',
        'outline-none': false,
        'fallback-colors': false,
        'bulletproof-font-face': false,
        shorthand: false
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
        files: [
          {
            expand: true,
            src: defaultAssets.client.sass,
            ext: '.css',
            rename: function(base, src) {
              return src.replace('/scss/', '/css/');
            }
          }
        ]
      }
    },
    less: {
      dist: {
        files: [
          {
            expand: true,
            src: defaultAssets.client.less,
            ext: '.css',
            rename: function(base, src) {
              return src.replace('/less/', '/css/');
            }
          }
        ]
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
          hidden: []
        }
      }
    },
    mocha_istanbul: {
      coverage: {
        src: testAssets.tests.server,
        options: {
          require: ['test.js'],
          coverageFolder: 'build/coverage/server',
          reportFormats: ['html', 'cobertura', 'lcovonly'],
          mochaOptions: ['--exit']
        }
      }
    },
    karma: {
      unit: {
        configFile: 'karma.conf.js'
      }
    },
    clean: {
      'test-client': ['build/coverage/client'],
      'test-server': ['build/coverage/server'],
      'dist':['public/dist']
    }
  });

  // Load NPM tasks
  require('load-grunt-tasks')(grunt);

  grunt.loadNpmTasks('grunt-ng-constant');

  // Make sure upload directory exists
  grunt.task.registerTask(
    'mkdir:upload',
    'Task that makes sure upload directory exists.',
    function() {
      // Get the callback
      var done = this.async();

      grunt.file.mkdir(
        path.normalize(__dirname + '/modules/users/client/img/profile/uploads')
      );

      done();
    }
  );

  // Connect to the MongoDB instance and load the models
  grunt.task.registerTask(
    'mongoose',
    'Task that connects to the MongoDB instance and loads the application models.',
    function() {
      // Get the callback
      var done = this.async();

      // Use mongoose configuration
      var mongoose = require('./config/lib/mongoose.js');

      // Connect to database
      mongoose.connect(function() {
        done();
      });
    }
  );

  grunt.task.registerTask('start_e2e_server', 'Starting server...', function() {
    server_proc_done = this.async();

    // pass command line parameters through to the e2e task, by appending to what is in process.env
    for(var param in grunt.cli.options){
      if( param !== 'tasks' && param !== 'npm' ){
        process.env[param] = grunt.cli.options[param];
      }
    }

    server_proc = childProcess.spawn('node', ['server.js'], {
      env: process.env,
      detached: true,
      shell: false,
      stdio: 'ignore'
    });

    server_proc_done();
  });

  grunt.task.registerTask(
    'run_e2e_tests',
    'Starting functional tests...',
    function() {
      test_proc_done = this.async();

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

  grunt.task.registerTask(
    'drop_e2e_database',
    'Dropping database...',
    function() {
      drop_database_task_done = this.async();

      // pass command line parameters through to the e2e task, by appending to what is in process.env
      for(var param in grunt.cli.options){
        if( param !== 'tasks' && param !== 'npm' ){
          process.env[param] = grunt.cli.options[param];
        }
      }

      var mongoose = require('./config/lib/mongoose.js');
      if(!process.env.NO_DB_DROP){
        mongoose.dropDatabase(function() {
          drop_database_task_done();
        });
      }
    }
  );

  grunt.task.registerTask(
    'shutdown_e2e_server',
    'Shutting down server...',
    shutdownServer
  );

  function shutdownTests() {
    if (test_proc) {
      console.log('shutting down tests...'); //eslint-disable-line
      test_proc.kill('SIGINT');
    }
  }

  function shutdownServer() {
    if (server_proc) {
      console.log('shutting down server...'); //eslint-disable-line
      server_proc.kill('SIGINT');
    }
  }

  // Lint CSS and JavaScript files.
  grunt.registerTask('lint', ['sass', 'less', 'eslint', 'csslint']);

  // Package application files
  grunt.registerTask('build', [
    'clean:dist',
    'env:dev',
    'lint',
    'ngAnnotate',
    'uglify',
    'cssmin'
  ]);
  grunt.registerTask('buildprod', [
    'clean:dist',
    'env:prod',
    'lint',
    'ngAnnotate',
    'uglify',
    'cssmin'
  ]);
  grunt.registerTask('buildtest', [
    'clean:dist',
    'env:test',
    'lint',
    'ngAnnotate',
    'uglify',
    'cssmin'
  ]);

  // Run the client unit tests
  grunt.registerTask('test-client', [
    'clean:test-client',
    'env:test',
    'lint',
    'ngAnnotate',
    'karma:unit'
  ]);
  // Run the server unit tests
  grunt.registerTask('test-server', [
    'clean:test-server',
    'env:test',
    'lint',
    'ngAnnotate',
    'mocha_istanbul:coverage'
  ]);

  // Run the end-to-end functional tests
  grunt.registerTask('e2e', [
    'build-e2e',
    'start_e2e_server',
    'run_e2e_tests',
    'drop_e2e_database',
    'shutdown_e2e_server'
  ]);
  grunt.registerTask('build-e2e', [
    'env:functional',
    'lint',
    'ngAnnotate',
    'uglify',
    'cssmin'
  ]);

  // Cleanup task
  grunt.registerTask('cleanup', ['env:functional', 'drop_e2e_database']);
};
