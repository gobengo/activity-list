'use strict';

module.exports = ActivityList;

var through = require('through2');
var More = require('stream-more');
var mapStream = require('through2-map');
var noBufferOpts = { highWaterMark: 0, lowWaterMark: 0, objectMode: true };


/**
 * Render an activity stream in an HTMLElement
 * @param el {HTMLElement}
 */
function ActivityList(el) {
    var self = this;
    el = this.el = el || document.createElement('li');
    // activities that have been rendered
    this.activities = []
    this.moreAmount = 10;

    // write { el: el, activity: activity } -> append to this.el sorted
    (this._adder = through.obj(noBufferOpts, function (rendered, e, next) {
        var newEl = rendered.el;
        var activity = rendered.activity;

        self.activities.push(activity);
        // determine index
        self.activities.sort(self.comparator);
        var index = rendered.index = self.activities.indexOf(activity);

        el.insertBefore(newEl, el.children[index]);
        this.push(rendered);
        next();
    }))
        // make it hot so we dont wait for someone to pull from adds
        .on('data', function () {});

    // gatekeep anything piped into .more
    // only let stuff through when .showMore() is called
    (this.more = through.obj(noBufferOpts))
        .pipe(this._createRenderer())
        .pipe(this._moreRendered = new More(noBufferOpts))
            // proxy hold events so outsiders can listen for them
            .on('hold', function () {
                self.more.emit('hold');
            })
        .pipe(this._adder, { end: false });
    
    // render and add any updates
    (this._updates = through.obj(noBufferOpts))
        .pipe(this._createRenderer())
        .pipe(this._adder, { end: false });

    // show an initial amount
    this.showMore();
}

ActivityList.prototype.showMore = function (amount) {
    this._moreRendered.setGoal(amount || this.moreAmount);
};

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
    // published date descending
    var aPublished = Date.parse(a.published);
    var bPublished = Date.parse(b.published);
    return bPublished - aPublished;
};

/**
 * Read from a Stream of activity objects or HTMLElements
 * These streams will be read from quite aggressively, so don't
 * pass a very very long one to it. This is meant for real-time updates
 */
ActivityList.prototype.stream = function (stream) {
    stream.pipe(this._updates);
};

/**
 * Create a transform that accepts activities
 * it should read out objects like
 * { el: this.renderActivity(activity), activity: activity }
 */
ActivityList.prototype._createRenderer = function () {
    var self = this;
    return through.obj(noBufferOpts, function (activity, enc, next) {
        var stream = this;
        var el = self.renderActivity(activity);
        if (el && el.nodeType === 1) {
            stream.push({
                el: el,
                activity: activity
            });
        }
        next();
    });
};
