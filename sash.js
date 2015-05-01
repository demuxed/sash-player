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

    // TODO: This is a bad implementation of a SASH manifest reader.
    $.getJSON( "manifest.json", function( manifest ) {
        for (i = 0; i < manifest.adaptation_sets.length; i++) {
            for (j = 0; j < Object.keys(manifest.adaptation_sets[i].representations).length; j++) {
                repid = Object.keys(manifest.adaptation_sets[i].representations)[j];
                var codecString = manifest.adaptation_sets[i].mime_type + '; codecs="' + manifest.adaptation_sets[i].representations[repid].codecs + '"';
                var segments = [manifest.adaptation_sets[i].segment_template.init.replace('$representation$', repid)];
                for (k = manifest.adaptation_sets[i].segment_template.start_number; k <= manifest.adaptation_sets[i].segment_template.end_number; k++) {
                    console.log(manifest.adaptation_sets[i].segment_template.media.replace('$representation$', repid).replace('$number$', k));
                    segments.push(manifest.adaptation_sets[i].segment_template.media.replace('$representation$', repid).replace('$number$', k));
                }
                new Track(mediaSource, codecString, segments);
            }
        }

        // Only init MSE once the manifest is loaded.
        player.src = window.URL.createObjectURL(mediaSource);

    });



}())
