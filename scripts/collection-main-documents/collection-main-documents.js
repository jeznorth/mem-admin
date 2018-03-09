'use strict';
var argv = require('argv');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var _ = require('lodash');
var ArgumentParser = require('argparse').ArgumentParser;

var parser = new ArgumentParser({
  version: '0.0.1',
  addHelp: true,
  description: "This script changes all of the mainDocument attributes of collections "
  + "into 'mainDocuments', and pushes the existing document (if any) into an array."
});
parser.addArgument(
  ['-u', '--username'],
  {
    nargs: 1,
    help: 'Input the username for the database.'
  }
);
parser.addArgument(
  ['-p', '--password'],
  {
    nargs: 1,
    help: 'Input the password for the database.'
  }
);
parser.addArgument(
  ['-ho', '--host'],
  {
    nargs: 1,
    help: 'Input the hostname (typically "mongodb2" or something similar).'
  }
);
parser.addArgument(
  ['-db', '--database'],
  {
    nargs: 1,
    help: 'Input the database you are accessing (typically "esm" or "mem-dev" or similar).'
  }
);
var url;
new Promise(function(resolve, reject) {
  var args = parser.parseArgs();
  resolve(args);
}).then(function(args) {
  if (args.username && args.password && args.host && args.database) {
    url = "mongodb://" + args.username + ":" + args.password + "@" + args.host + ":27017" + args.database;
  } else {
    url = "mongodb://localhost:27017/mem-dev"
  }
  return url;
}).then(function(url) {
  return new Promise(function(resolve, reject) {
    console.log('attempting to connect to: ' + url);
    MongoClient.connect(url, (err, client) => {
      if (err) {
        return reject(err);
      }
      var collection = client.collection('collections');
      var number_updated = 0;
      var count = collection.find({}).count()
      .then(function(count) {
        collection.find({}).forEach(function(doc) {
          var maindoc = [];
          //This will be true for most collections; edge-cases will have no bearing on functionality.
          var haspublished = doc.isPublished ? true : false;
          if (!doc) {
            console.log('Error: received erroneous data from database');
            return reject();
          }
          if (doc.mainDocument) {
            maindoc.push(doc.mainDocument);
            console.log('Pushed main document in ' + doc.displayName);
          }
          collection.update({
            _id: doc._id
          }, {
            $set: {
              mainDocuments: maindoc,
              hasPublished: haspublished
            }
          }, function(err) {
            if (err) return reject(err);
            number_updated++;
          })
        }, function(err) {
          client.close();
          console.log('Finished updating. Projects updated: ' + number_updated + ' of ' + count);
          return resolve();
        })
      })
    })
  })
})
