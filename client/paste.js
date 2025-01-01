(function() {

    function paste_ema(e) {
        if (options.get("pasteImage")) return;
        let items = (e.clipboardData || e.originalEvent.clipboardData).items;
        let blob = null;
        let file = null;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') === 0) {
                blob = items[i].getAsFile();
                break;
            }
        }

        if (blob) {
            let filename = "pasted_image";
            let extension = blob.type.split('/')[1];
            if (!extension || extension === 'octet-stream') {
                return;
            }
            filename += "." + extension;

            file = new File([blob], filename, {
                type: blob.type
            });
        }

        if (!postForm) {
            with_dom(function() {
                if (THREAD)
                    open_post_box(THREAD);
                else {
                    var $s = $(e.target).closest('section');
                    if (!$s.length)
                        return;
                    open_post_box($s.attr('id'));
                }
            });
        } else {
            var attrs = postForm.model.attributes;
            if (attrs.uploading || attrs.uploaded)
                return;
            var err = this.responseText;
            postForm.upload_error(err);
        }

        var extra = postForm.prep_upload();
        var fd = new FormData();
        fd.append('image', file);
        for (var k in extra)
            fd.append(k, extra[k]);
        /* Can't seem to jQuery this shit */
        var xhr = new XMLHttpRequest();
        xhr.open('POST', image_upload_url());
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.onreadystatechange = upload_ema;
        xhr.send(fd);

        postForm.notify_uploading();
    }

    function upload_ema() {
        if (this.readyState != 4 || this.status == 202)
            return;
        var err = this.responseText;
        if (this.status != 500 || !err || err.length > 100)
            err = "Couldn't get response.";
        postForm.upload_error(err)
    }

    $(function() {
        document.body.addEventListener('paste', paste_ema, false);
    });

})();
