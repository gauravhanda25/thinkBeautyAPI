'use strict';
const ThumbnailGenerator = require('video-thumbnail-generator').default;
module.exports = function(Filestorage) {
	Filestorage.observe('before save', function(ctx, next) {
	  if (ctx.instance) {
	  	var data = ctx.instance;
	  	if(data.fileType ==  "video") {
	  		const tg = new ThumbnailGenerator({
			  sourcePath: '/var/www/html/thinkBeautyAPI/server/storage/'+data.memberId+'/'+data.fileName,
			  thumbnailPath: '/var/www/html/thinkBeautyAPI/server/storage/'+data.memberId+'/',
			  tmpDir: '/var/www/html/' //only required if you can't write to /tmp/ and you need to generate gifs
			});
			console.log({
			  sourcePath: '/var/www/html/thinkBeautyAPI/server/storage/'+data.memberId+'/'+data.fileName,
			  thumbnailPath: '/var/www/html/thinkBeautyAPI/server/storage/',
			  tmpDir: '/var/www/html/' //only required if you can't write to /tmp/ and you need to generate gifs
			})
	  		tg.generateCb({count:1},(err, res) => {
	  			console.log(res);
	  			ctx.instance.thumbNail = res[0];
	  			next();
	  		})				

	  	} else {
	  		next();
	  	}
	  	
	  } else {
	  	next();
	  }
	  
	});
};
