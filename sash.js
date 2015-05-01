(function(undefined) {

    function get(url, callback, ctx) {
        var request = new XMLHttpRequest();
        request.responseType = 'arraybuffer';

        request.onreadystatechange = function() {
            if (request.readyState == 4 && (request.status == 200 || request.status == 304)) {
                callback.call(ctx, null, request.response);
            }
        };

        request.open('GET', url , true);
        request.send();
    }

    // Track prototype
    function Track(mediaSource, codecString, segments) {
        this.mediaBuffer = [];
        this.sourceBuffer;
        this.segments = segments;
        this.codecString = codecString;
        this.currentSegment = 0;
        this.mediaSource = mediaSource;

        mediaSource.addEventListener('sourceopen', this.sourceOpenCallback.bind(this), false);
    }

    Track.prototype.getNextSegment = function() {
        get(this.segments[this.currentSegment], function(err, result) {

            // Cache the buffer
            this.mediaBuffer.push(result);

            if (!this.sourceBuffer.updating) {
                this.loadBufferIntoMSE();
            }

            this.currentSegment++;
            if (this.currentSegment < this.segments.length) {
                this.getNextSegment();
            }

        }, this);
    }

    Track.prototype.loadBufferIntoMSE = function() {
        if (this.mediaBuffer.length) {
            this.sourceBuffer.appendBuffer(this.mediaBuffer.shift());
        }
    }

    Track.prototype.sourceOpenCallback = function() {
        this.sourceBuffer = this.mediaSource.addSourceBuffer(this.codecString);
        this.sourceBuffer.addEventListener('updateend', this.loadBufferIntoMSE.bind(this), false);
        this.getNextSegment();
    }

    // Setup MSE
    var mediaSource = new MediaSource();
    var player = document.querySelector('#player');

    // Instantiate each track and addd it to MSE
    var audioTrack = new Track(mediaSource, 'audio/mp4; codecs="mp4a.40.2"', [
        'http://s3-us-west-2.amazonaws.com/mpag-sash/media/tos/dash/audio-64k/init.m4f',
        'http://s3-us-west-2.amazonaws.com/mpag-sash/media/tos/dash/audio-64k/segment1.m4f',
        'http://s3-us-west-2.amazonaws.com/mpag-sash/media/tos/dash/audio-64k/segment2.m4f',
        'http://s3-us-west-2.amazonaws.com/mpag-sash/media/tos/dash/audio-64k/segment3.m4f',
        'http://s3-us-west-2.amazonaws.com/mpag-sash/media/tos/dash/audio-64k/segment4.m4f',
        'http://s3-us-west-2.amazonaws.com/mpag-sash/media/tos/dash/audio-64k/segment5.m4f']);

    var videoTrack = new Track(mediaSource, 'video/mp4; codecs="avc1.4d401e"', [
        'http://s3-us-west-2.amazonaws.com/mpag-sash/media/tos/dash/video-480p/init.m4f',
        'http://s3-us-west-2.amazonaws.com/mpag-sash/media/tos/dash/video-480p/segment1.m4f',
        'http://s3-us-west-2.amazonaws.com/mpag-sash/media/tos/dash/video-480p/segment2.m4f',
        'http://s3-us-west-2.amazonaws.com/mpag-sash/media/tos/dash/video-480p/segment3.m4f',
        'http://s3-us-west-2.amazonaws.com/mpag-sash/media/tos/dash/video-480p/segment4.m4f',
        'http://s3-us-west-2.amazonaws.com/mpag-sash/media/tos/dash/video-480p/segment5.m4f']);

    player.src = window.URL.createObjectURL(mediaSource);

}())
