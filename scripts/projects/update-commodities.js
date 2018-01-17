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
  url  = defaultConnectionString;
} else {
  username = args[0];
  password = args[1];
  host     = args[2];
  db       = args[3];
  url      = 'mongodb://' + username + ':' + password + '@' + host + ':27017/' + db;
}

var getProjects = function(db) {
  return new Promise(function(resolve, reject) {
    // Find all of the projects
    db.collection('projects').find({}).toArray(function(err, object) {
      if (err) {
        console.log('x failed to find projects');
        reject(err);
      } else {
        console.log(': found ' + object.length + ' projects');
        resolve(object);
      }
    });
  });
};

var commodityList = [
  { old: 'coal',            new: 'Coal'             },
  { old: 'mercury',         new: 'Mercury (Hg)'     },
  { old: 'gold',            new: 'Gold (Au)'        },
  { old: 'silver',          new: 'Silver (Ag)'      },
  { old: 'asbestos',        new: 'Asbestos'         },
  { old: 'zinc',            new: 'Zinc (Zn)'        },
  { old: 'lead',            new: 'Lead (Pb)'        },
  { old: 'copper',          new: 'Copper (Cu)'      },
  { old: 'molybdenum',      new: 'Molybdenum (Mo)'  },
  { old: 'iron',            new: 'Iron (Fe)'        },
  { old: 'silica',          new: 'Silica'           },
  { old: 'thermal coal',    new: 'Thermal Coal'     },
  { old: 'magnetite',       new: 'Magnetite'        },
  { old: 'muscovite(mica)', new: 'Muscovite (Mica)' },
  { old: 'cadmium',         new: 'Cadmium (Cd)'     },
  { old: 'sand & gravel',   new: 'Sand & Gravel'    },
  { old: 'nickel',          new: 'Nickel (Ni)'      },
];

var updateProject = function(db, project) {
  return new Promise(function(resolve, reject) {
    console.log(': updating project ' + project.code);

    var newCommodities = [];

    var commodities = project.commodity ? project.commodity.split(',') : [];

    _.each(commodities, function(commodity) {
      var found = _.find(commodityList, function(c) {
        return commodity.trim().toUpperCase() === c.old.toUpperCase();
      });
      if (found) {
        newCommodities.push(found.new);
      }
    });

    db.collection('projects').updateOne({ code: project.code }, { $set: {
      commodities : newCommodities
    }}, {}, function(err, obj) {
      if (err) {
        console.log('x Failed to update project ' + project.code);
        reject(err);
      } else if (obj.result.n === 0) {
        console.log('x Failed to find project ' + project.code);
        resolve(obj);
      } else {
        console.log(': Successfully updated project ' + project.code);
        resolve(obj);
      }
    });
  });
}

var run = function () {
  var database = null;

  return new Promise(function (resolve, reject) {
    console.log('start');
    MongoClient.connect(url)
      .then(function(db) {
        console.log(': db connected');
        database = db;
      })
      .then(function() {
        console.log(': getting projects');
        return getProjects(database);
      })
      .then(function(projects) {
        console.log(': updating projects...');
        var projectPromises = []
        _.each(projects, function(project) {
          projectPromises.push(updateProject(database, project));
        });
        return Promise.all(projectPromises);
      })
      .then(function() {
        database.close();
        console.log('end');
        resolve(':)');
      }, function (err) {
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
