'use strict';

module.exports = ActivityList;

var ActivityElement = require('activity-element');
var extend = require('util-extend');
var through = require('through2');
var map = require('through2-map');
var filter = require('through2-filter');

/**
 * Render an activity stream in an HTMLElement
 * @param el {HTMLElement}
 */
function ActivityList(el) {
    this.el = el || document.createElement('li');
    this.pageSize = 10;
    // activities that have been read
    this.activities = [];
    // future elements (streamed)
    this._future = through.obj({ highWaterMark: 0, lowWaterMark: 0 })
        .on('data', function (newEl) {
            // prepend
            el.insertBefore(newEl, el.firstChild);
        });
    // more elements (usually from the past)
    this._more = through.obj({ highWaterMark: 0, lowWaterMark: 0 });
    this.showMore(this.pageSize);
}

/**
 * Render an Activity object into an HTMLElement
 */
ActivityList.prototype.renderActivity = function (activity) {
    // if already an HTMLElement, let through as is
    if (activity && activity.nodeType === 1) {
        console.error('HTMLElement passed to renderActivity');
        return activity;
    }
    var el = ActivityElement(activity);
    return el;
};

/**
 * Read from a Stream of activity objects or HTMLElements
 * These streams will be read from quite aggressively, so don't
 * pass a very very long one to it. This is meant for real-time updates
 */
ActivityList.prototype.stream = function (stream) {
    stream
        .pipe(map.obj(this.renderActivity))
        .pipe(this._future);
};

/**
 * Read from a Stream, but only when explicitly requested like
 * * on page load
 * * when 'show more' is clicked
 * This is useful for infinite archive streams
 */
ActivityList.prototype.streamMore = function (archive) {
    archive
        .pipe(this._createRenderer())
        .pipe(this._more, { end: false });
};

ActivityList.prototype._createRenderer = function () {
    var opts = { highWaterMark: 0, lowWaterMark: 0 };
    var renderer = map.obj(opts, this.renderActivity);
    return renderer;
};

ActivityList.prototype.showMore = function(amount) {
    amount = amount || this.pageSize;
    var listEl = this.el;
    var more = this._more;
    readN(more, amount, function (el) {
        listEl.appendChild(el);
    });
    // TODO: refactor this. It's disgusting but
    // piping to limit(amount) wasn't working so good
    function readN(stream, n, cbEach) {
        var thing;
        while (n && (thing = more.read())) {
            n = n - 1;
            cbEach(thing);
        }
        if (n) {
            more.once('readable', function () {
                readN(stream, n, cbEach);
            });
        }
    }
};

/**
 * Create a Duplex that only passes through N written items, then ends
 */
function limit(remaining) {
    var opts = {highWaterMark: 0, lowWaterMark: 0};
    return through.obj(opts, function (chunk, encoding, done) {
        console.log('chunk through limit. remaining=',remaining);
        this.push(chunk);
        remaining = remaining - 1;
        if (! remaining) {
            return this.push(null);
        }
        done();
    });
}

function logStream(msg) {
    var opts = {highWaterMark: 0, lowWaterMark: 0};
    return through.obj(opts, function (chunk, e, done) {
        console.log('logStream', msg);
        setTimeout(function () {
            done(null, chunk);
        }, 50);
    });
}
