var gulp = require('gulp');
var imageop = require('gulp-image-optimization');

gulp.task('images', function(cb) {
    gulp.src(['./server/**/*.png','./server/**/*.jpg','./server/**/*.gif','./server/**/*.jpeg']).pipe(imageop({
        optimizationLevel: 5,
        progressive: true,
        interlaced: true
    })).pipe(gulp.dest('./server/')).on('end', cb).on('error', cb);
});