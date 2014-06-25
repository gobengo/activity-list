module.exports = ActivityList;

var ActivityElement = require('activity-element');
var PassThrough = require('readable-stream/passthrough');
var Transform = require('readable-stream/transform');
var extend = require('util-extend');
var inherits = require('inherits');
var isArray = require('is-array');
var through = require('through2');
var map = require('through2-map');

/**
 * Render an activity stream in an HTMLElement
 * @param el {HTMLElement}
 */
function ActivityList(el) {
    this.el = el || document.createElement('li');
    this.pageSize = 2;
    this._renderer = null;
    // activities that have been read
    this.activities = [];
    // future elements (streamed)
    this._future = null;
    // more elements (usually from the past)
    this._more = through.obj({ highWaterMark: 0, lowWaterMark: 0 });
    this.showMore(this.pageSize);
}

ActivityList.prototype.renderActivity = function (activity) {
    if (activity && activity.nodeType === 1) {
        // if already an HTMLElement, let through as is
        return activity;
    }
    return ActivityElement(activity);
};

/**
 * Read from a Stream of activity objects or HTMLElements
 * These streams will be read from quite aggressively, so don't
 * pass a very very long one to it. This is meant for real-time updates
 */
ActivityList.prototype.stream = function (readable) {
    console.log('_stream', readable);
};

/**
 * Read from a Stream, but only when explicitly requested like
 * * on page load
 * * when 'show more' is clicked
 * This is useful for infinite archive streams
 */
ActivityList.prototype.streamMore = function (archive) {
    archive
        .pipe(map.obj(this.renderActivity))
        .pipe(this._more);
};

ActivityList.prototype.showMore = function(amount) {
    amount = amount || this.pageSize;
    var listEl = this.el;
    this._more
        .pipe(limit(amount))
        .on('data', function (el) {
            listEl.appendChild(el);
        });
};

/**
 * Create a Duplex that only passes through N written items, then ends
 */
function limit(remaining) {
    return through.obj(function (chunk, encoding, done) {
        this.push(chunk);
        remaining = remaining - 1;
        if (! remaining) {
            return this.push(null);
        }
        done();
    });
}
