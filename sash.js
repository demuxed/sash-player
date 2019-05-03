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

    // TODO: 1) Limit the number of the buffers we hold in memory if MSE is slow to consume them
    //       2) Stop downloading segments when we've got a sensible number buffered (Or even better a configurable duration...)
    //       3) Support scrubbing to un-buffered points in the content

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

            this.mediaBuffer.push(result);
            this.loadBufferIntoMSE();

            this.currentSegment++;
            if (this.currentSegment < this.segments.length) {
                this.getNextSegment();
            }

        }, this);
    }

    Track.prototype.loadBufferIntoMSE = function() {
        if (this.mediaBuffer.length) {
            try {
                if (!this.sourceBuffer.updating) {
                    this.sourceBuffer.appendBuffer(this.mediaBuffer.shift());
                }
                else {
                    console.log("MSE buffer currently updating.")
                }
            }
            catch (err) {
                console.log('Error when loading buffer into MSE.')
            }
        }
        else {
            console.log('No buffers ready to load into MSE.')
        }
    }

    Track.prototype.sourceOpenCallback = function() {
        this.sourceBuffer = this.mediaSource.addSourceBuffer(this.codecString);
        this.sourceBuffer.addEventListener('update', this.loadBufferIntoMSE.bind(this), false);
        this.getNextSegment();
    }

    // Setup MSE
    var mediaSource = new MediaSource();
    var player = document.querySelector('#player');

    $.getJSON( "0.2.json", function( manifest ) {

        // Grab the first Audio and Video renditions we find, and push them onto MSE
        ['video', 'audio'].forEach(function(element) {
            firstRenditionName = Object.keys(manifest[element][0].renditions)[0];
            firstRendition = manifest[element][0].renditions[firstRenditionName];
            var codecString = manifest[element][0].mime_type + '; codecs="' + firstRendition.codecs + '"';
            var segments = [manifest[element][0].segment_template.init.replace('$rendition$', firstRenditionName)];
            for (k = manifest[element][0].segment_template.start_number; k <= manifest[element][0].segment_template.end_number; k++) {
                segments.push(manifest[element][0].segment_template.media.replace('$rendition$', firstRenditionName).replace('$number$', k));
            }
            new Track(mediaSource, codecString, segments);
        });

        // Only init MSE once the manifest is loaded.
        player.src = window.URL.createObjectURL(mediaSource);
        setTimeout(function(){ player.play() }, 1000);

    });

}())
