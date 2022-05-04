/*\
title: test-dummy.js
type: application/javascript
tags: [[$:/tags/test-spec]]

A dummy test which always passes to please Jasmine when it runs tests under node.

\*/
(function () {

    /*jslint node: true, browser: true */
    /*global $tw: false */
    "use strict";

    describe("Dummy", function () {

        it("should always pass", function () {
            expect(2).toBe(2);
        });

    });

})();
