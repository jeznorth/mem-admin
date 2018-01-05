'use strict';

var MongoClient = require('mongodb').MongoClient;
var Promise     = require('promise');
var _           = require('lodash');

var defaultConnectionString = 'mongodb://localhost:27017/mem-dev';
var username                = '';
var password                = '';
var host                    = '';
var db                      = '';
var url                     = '';

var args = process.argv.slice(2);
if (args.length !== 4) {
  console.log('Using default localhost connection:', defaultConnectionString);
  url = defaultConnectionString;
} else {
  username = args[0];
  password = args[1];
  host     = args[2];
  db       = args[3];
  url      = 'mongodb://' + username + ':' + password + '@' + host + ':27017/' + db;
}

var find = function(collectionName, query, fields) {
  return new Promise(function(resolve, reject) {
    MongoClient.connect(url, function(err, db) {

      var collection = db.collection(collectionName);

      collection.find(query, fields).toArray(function(err, docs) {
        if (err) reject(err);
        db.close();
        resolve(docs);
      });

    });
  });
};

var findOne = function(collectionName, query) {
  return new Promise(function(resolve, reject) {
    MongoClient.connect(url, function(err, db) {

      var collection = db.collection(collectionName);

      collection.findOne(query, function(err, docs) {
        if (err) reject(err);
        db.close();
        resolve(docs);
      });

    });
  });
};

var insertAll = function(collectionName, docs) {
  return new Promise(function(resolve, reject) {
    MongoClient.connect(url, function(err, db) {

      var collection = db.collection(collectionName);

      collection.insertMany(docs, {}, function(err, result) {
        db.close();
        if (err) {
          reject(err);
        } else {
          console.log('inserted ' + result.insertedCount + ' document(s) into ' + collectionName);
          resolve(result);
        }
      });

    });
  });
};

var update = function(collectionName, query, doc) {
  return new Promise(function(resolve, reject) {
    MongoClient.connect(url, function(err, db) {

      var collection = db.collection(collectionName);

      collection.updateOne(query, { $set: doc } , { }, function(err, result) {
        db.close();
        if (err) {
          reject(err);
        } else {
          console.log('updated document in ' + collectionName);
          resolve(result);
        }
      });

    });
  });
};

var run = function() {
  return new Promise(function (resolve, reject) {
    console.log('start');
    Promise.resolve()
      .then(function() {
        console.log('1 - get project default permissions');
        return findOne('_defaults', { context: 'project', resource: 'project', type: 'default-permissions' });
      })
      .then(function(data) {
        console.log('2 - update project default permissions');
        data.defaults.permissions['manageFolders']  = ['sysadmin'];
        data.defaults.permissions['manageDocumentPermissions'] = ['sysadmin'];
        return update('_defaults', { _id: data._id }, data);
      })
      .then(function() {
        console.log('3 - get projects');
        return find('projects', {}, {});;
      })
      .then(function(projects) {
        console.log('  - found ' + _.size(projects) + ' projects');
        console.log('4 - build sysadmin permissions');
        // Add application permissions first.
        var permissions = [{
          resource   : "application",
          permission : "editPublicContent",
          role       : "sysadmin",
          __v        : 0
        }, {
          resource   : "application",
          permission : "listCollections",
          role       : "sysadmin",
          __v        : 0
        }, {
          resource   : "application",
          permission : "createCollection",
          role       : "sysadmin",
          __v        : 0
        }];
        // Then add for each project.
        _.each(projects, function(project) {
          permissions.push({
            resource   : project._id.toString(),
            permission : "editProjectPublicContent",
            role       : "sysadmin",
            __v        : 0
          });
          permissions.push({
            resource   : project._id.toString(),
            permission : "listProjectCollections",
            role       : "sysadmin",
            __v        : 0
          });
          permissions.push({
            resource   : project._id.toString(),
            permission : "createProjectCollection",
            role       : "sysadmin",
            __v        : 0
          });
          permissions.push({
            resource   : project._id.toString(),
            permission : "manageFolders",
            role       : "sysadmin",
            __v        : 0
          });
          permissions.push({
            resource   : project._id.toString(),
            permission : "manageDocumentPermissions",
            role       : "sysadmin",
            __v        : 0
          });
        });
        return permissions;
      })
      .then(function(permissions) {
        console.log('  - built ' + _.size(permissions) + ' permissions');
        console.log('5 - add sysadmin permissions');
        return insertAll('_permissions', permissions);
      })
     .then(function(data) {
        console.log('end');
        resolve(':)');
      }, function(err) {
        console.log('ERROR: end');
        console.log('ERROR: end err = ', JSON.stringify(err));
        reject(err);
      });
  });
};

run().then(function(success) {
  console.log('success ', success);
  process.exit();
}).catch(function(error) {
  console.error('error ', error);
  process.exit();
});
