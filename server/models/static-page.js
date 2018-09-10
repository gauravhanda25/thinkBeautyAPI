'use strict';

module.exports = function(Staticpage) {

	Staticpage.getPagesContent = function(pageType, cb) {
		Staticpage.find({where : {pagetype : pageType}}, function(err, pages){
			cb(null, pages);
		})
	}
	Staticpage.remoteMethod('getPagesContent', {
        http: {
            path: '/getPagesContent',
            verb: 'get'
        },
        accepts: [{
                arg: 'pageType',
                type: 'string'
            }
        ],
        returns: {
            arg: 'data',
            type: 'json'
        }
    });

};
