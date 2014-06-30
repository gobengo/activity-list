'use strict';

module.exports = ActivityList;

var through = require('through2');

/**
 * Render an activity stream in an HTMLElement
 * @param el {HTMLElement}
 */
function ActivityList(el) {
    var self = this;
    el = this.el = el || document.createElement('li');
    this.pageSize = 10;
    // activities that have been read
    var activities = this.activities = [];
    // future elements (streamed)
    this._future = through.obj({
        highWaterMark: 0,
        lowWaterMark: 0
    }, function (activity, encoding, next) {
        activities.push(activity);
        activities.sort(self.comparator);
        next(null, activity);
    }).on('data', function (activity) {
        var newEl = self.renderActivity(activity)
        if ( ! newEl) {
            console.log("couldn't render activity to HTMLElement", activity);
            return;
        }
        var index = activities.indexOf(activity);
        el.insertBefore(newEl, el.children[index]);
    });
}

/**
 * Render an Activity object into an HTMLElement
 */
ActivityList.prototype.renderActivity = function (activity) {
    throw new Error("Please specify the .renderActivity function");
};

/**
 * A comparator by which newly added activities
 * will be sorted. Works like fn in `[].sort(fn)`
 */
ActivityList.prototype.comparator = function (a, b) {
    var aPublished = Date.parse(a);
    var bPublished = Date.parse(b);
    return aPublished - bPublished;
};

/**
 * Read from a Stream of activity objects or HTMLElements
 * These streams will be read from quite aggressively, so don't
 * pass a very very long one to it. This is meant for real-time updates
 */
ActivityList.prototype.stream = function (stream) {
    stream.pipe(this._future);
};
