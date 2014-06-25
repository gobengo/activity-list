var assert = require('chai').assert;
var sinon = require('sinon');

var ActivityList = require('activity-list');
var activityMocks = require('activity-mocks');

describe('activity-list', function () {
    it('can be constructed', function (done) {
        var n = 5;
        var activities = nActivities(n);
        var aList = new ActivityList();
        assert.ok(aList.activities);
    });
});

function createActivity(id) {
    var a = activityMocks.create('livefyre.sitePostCollection');
    a.id = id;
    return a;
}

// create an array of N activities
function nActivities(n) {
    var i = 0;
    var activities = [];
    while (i < n) {
        activities.push(createActivity(i));
        i++;
    }
    return activities;
}
