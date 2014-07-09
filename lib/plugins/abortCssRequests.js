module.exports = {
    beforeEngineInit: function (renderer, engine, next) {
        if (engine.phantom !== undefined) {
            engine.phantom.page.onResourceRequested(function (requestData, networkRequest) {
                var regex = /.+\.css$/i;
                if (regex.test(requestData.url)) {
                    networkRequest.abort();
                }
            });
        }

        next();
    }
};
