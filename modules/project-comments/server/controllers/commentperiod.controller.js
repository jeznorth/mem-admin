'use strict';
// =========================================================================
//
// Controller for comments
//
// =========================================================================
var path = require('path');
var DBModel = require (path.resolve('./modules/core/server/controllers/core.dbmodel.controller'));
var _ = require ('lodash');

module.exports = DBModel.extend ({
  name : 'CommentPeriod',
  plural : 'commentperiods',
  populate: 'artifact',
  bind: ['setArtifactStage', 'addActivities', 'setRolesPermissions'],
  preprocessAdd: function (period) {
    var self=this;
    return Promise.resolve (period)
      .then (self.setArtifactStage)
      .then (self.addActivities)
      .then (self.setRolesPermissions);
  },
  preprocessUpdate: function (period) {
    var self=this;
    return Promise.resolve(period)
      .then(self.setRolesPermissions);
  },
  // -------------------------------------------------------------------------
  //
  // TBD
  // Let the artifact know tha it should now be moving in to comment period
  // stage
  //
  // -------------------------------------------------------------------------
  setArtifactStage: function (period) {
    return new Promise (function (resolve/* , reject */) {
      resolve (period);
    });
  },
  // -------------------------------------------------------------------------
  //
  // add the appropriate activities with the correct roles
  //
  // -------------------------------------------------------------------------
  addActivities: function (period) {
    return new Promise (function (resolve/* , reject */) {
      resolve (period);
    });
  },
  // -------------------------------------------------------------------------
  //
  // set the read / write / etc roles based on the input
  //
  // -------------------------------------------------------------------------
  setRolesPermissions: function (period) {
    // jsherman - 20160729
    // do not like this, we've got defaults that add in permissions but are completely divorced from these roles
    // that we add.  Should all be in one place when we get a chance.

    /*
		 'read' : ['proponent-lead', 'proponent-team', 'assessment-admin', 'project-eao-staff', 'assessment-lead', 'assessment-team', 'assistant-dm', 'project-epd', 'assistant-dmo', 'associate-dm', 'associate-dmo', 'compliance-lead', 'compliance-officer', 'project-working-group', 'project-technical-working-group', 'project-system-admin'],
		 'write' : ['assessment-lead', 'assessment-team', 'project-epd', 'project-system-admin'],
		 'delete' : ['assessment-lead', 'assessment-team', 'project-epd', 'project-system-admin'],
		 'publish' : ['assessment-lead', 'assessment-team', 'project-epd', 'project-system-admin'],
		 'unPublish' : ['assessment-lead', 'assessment-team', 'project-epd', 'project-system-admin']

		 */
    var allroles = _.uniq(period.commenterRoles.concat (
      period.classificationRoles,
      period.vettingRoles,
      ['proponent-lead', 'proponent-team', 'assessment-admin', 'project-eao-staff', 'assessment-lead', 'assessment-team', 'assistant-dm', 'project-epd', 'assistant-dmo', 'associate-dm', 'associate-dmo', 'compliance-lead', 'compliance-officer', 'project-working-group', 'project-technical-working-group', 'project-system-admin']
    ));
    var dataObj = {
      vetComments      : period.vettingRoles,
      classifyComments : period.classificationRoles,
      listComments     : period.commenterRoles,
      addComment       : _.uniq(_.concat(period.commenterRoles, ['assessment-lead', 'assessment-team', 'project-epd', 'project-system-admin'])),
      read             : allroles,
      write            : _.uniq(_.concat(period.vettingRoles, period.classificationRoles, ['assessment-lead', 'assessment-team', 'project-epd', 'project-system-admin'])),
      delete           : ['assessment-lead', 'assessment-team', 'project-epd', 'project-system-admin'],
    };
    return this.setModelPermissions (period, dataObj)
      .then (function () {
        return period;
      });
  },
  // -------------------------------------------------------------------------
  //
  // get all comment periods for a project
  //
  // -------------------------------------------------------------------------
  getForProject: function(projectId) {
    return this.list ({project:projectId});
  },
  getForProjectWithStats: function (projectId) {
    var self = this;
    var Comment = this.mongoose.model('Comment');
    return new Promise (function (resolve, reject) {
      self.getForProject(projectId)
        .then(function(res) {
          return new Promise(function (resolve/* , reject */) {
            Comment
              .find ({period: {$in: _.map(res, '_id') }})
              .exec()
              .then(function(docs) {
                resolve({periods: res, comments: docs});
              });
          });
        })
        .then (function (data) {
          // get stats for each period.
          var periodsWithStats = [];
          _.forEach(data.periods, function(period) {
            var mycomments = _.filter(data.comments, function(o) { return o.period.toString() === period._id.toString(); });
            var periodWithStat = JSON.parse(JSON.stringify(period));
            periodWithStat.stats = {
              totalPending  : 0,
              totalDeferred : 0,
              totalPublic   : 0,
              totalRejected : 0,
              totalAssigned : 0,
              totalUnassigned : 0,
              totalPublicAssigned: 0
            };
            mycomments.reduce (function (prev, next) {
              periodWithStat.stats.totalPending += (next.eaoStatus === 'Unvetted' ? 1 : 0);
              periodWithStat.stats.totalDeferred += (next.eaoStatus === 'Deferred' ? 1 : 0);
              periodWithStat.stats.totalPublic += (next.eaoStatus === 'Published' ? 1 : 0);
              periodWithStat.stats.totalRejected += (next.eaoStatus === 'Rejected' ? 1 : 0);
              periodWithStat.stats.totalAssigned += (next.proponentStatus === 'Classified' ? 1 : 0);
              periodWithStat.stats.totalUnassigned += (next.proponentStatus !== 'Classified' ? 1 : 0);
              periodWithStat.stats.totalPublicAssigned += (next.proponentStatus === 'Classified' && next.eaoStatus === 'Published' ? 1 : 0);
            }, periodWithStat.stats);
            periodsWithStats.push(periodWithStat);
          });
          return periodsWithStats;
        })
        .then(function(res) {
          return res;
        })
        .then (resolve, reject);
    });
  },
  // -------------------------------------------------------------------------
  //
  // resolve an ENTIRE period, all comment chains at once. returns the period
  //
  // -------------------------------------------------------------------------
  resolveCommentPeriod: function (commentPeriod) {
    var self = this;
    var Comment = this.mongoose.model('Comment');
    var update = { resolved: true };
    var query = { period: commentPeriod._id };
    return new Promise (function (resolve, reject) {
      Comment.update (query, update, {multi: true}).exec()
        .then (function () {
          commentPeriod.set ({resolved:true});
          return self.saveDocument (commentPeriod);
        })
        .then (resolve, reject);
    });
  },
  // -------------------------------------------------------------------------
  //
  // publish an ENTIRE period, all comment chains at once. returns the period
  //
  // -------------------------------------------------------------------------
  publishCommentPeriod: function (commentPeriod, value) {
    var self = this;
    var Comment = this.mongoose.model('Comment');
    var query = { period: commentPeriod._id };
    var update;
    if (value) {
      update = {
        isPublished: true,
        $addToSet: {read: 'public'}
      };
    } else {
      update = {
        isPublished: false,
        $pull: {read: 'public'}
      };
    }
    return new Promise (function (resolve, reject) {
      Comment.update (query, update, {multi: true}).exec()
        .then (function () {
          commentPeriod.set ({ isPublished: value });
          return self.saveDocument (commentPeriod);
        })
        .then (resolve, reject);
    });
  }
});

