const config = require('./gulp/config.js');
const gulp = require('gulp');
const browserSync = require('browser-sync').create();
const sass = require('gulp-sass');
const concat = require('gulp-concat');
const minify = require('gulp-minify');
const uglify = require('gulp-uglify');
const cleanCSS = require('gulp-clean-css');
const htmlmin = require('gulp-htmlmin');
const imagemin = require('gulp-imagemin');
const runSequence = require('run-sequence');
const wait = require('gulp-wait');
const sourcemaps = require('gulp-sourcemaps');
const babel = require('gulp-babel');
const plumber = require('gulp-plumber');
const gap = require('gulp-append-prepend');
const rename = require('gulp-rename');

gulp.task('copy', () => 
    gulp.src('path.json')
    .pipe(gulp.dest('./static'))
);

gulp.task('browser-sync', () =>
    browserSync.init({
        server: {
            baseDir: "./static"
        }
    })
);

gulp.task('js', () =>
    gulp.src(config.js.src)
    .pipe(plumber())
    .pipe(wait(500))
    .pipe(sourcemaps.init())
    .pipe(babel({
        presets: ['env']
    }))
    .pipe(concat('main.js'))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(config.js.dest))
);

gulp.task('js:prod', () =>
    gulp.src(config.js.src)
    .pipe(babel({
        presets: ['env', 'es2015', 'stage-0'],
        plugins: [
            'babel-polyfill',
            'transform-runtime'
        ]
    }))
    .pipe(concat('main.js'))
    .pipe(minify({
        ext:{
            min:'.js'
        }
    }))
    .pipe(uglify())
    .pipe(gulp.dest(config.js.prodDest))
);

gulp.task('scss', () =>
    gulp.src(config.scss.src)
    .pipe(wait(500))
    .pipe(sourcemaps.init())
    .pipe(sass().on('error', sass.logError))
    .pipe(gulp.dest(config.scss.dest))
    .pipe(sourcemaps.write())
    .pipe(browserSync.stream())
);

gulp.task('scss:prod', () =>
    gulp.src(config.scss.src)
    .pipe(sass().on('error', sass.logError))
    .pipe(cleanCSS())
    .pipe(gulp.dest(config.scss.prodDest))
    .pipe(browserSync.stream())
);

gulp.task('html:prod', () => 
    gulp.src(config.html.src)
    .pipe(htmlmin({collapseWhitespace: true}))
    .pipe(gulp.dest(config.html.prodDest))
);

gulp.task('watch', () => {
    gulp.watch(config.scss.watch, ['scss']);
    gulp.watch(config.js.watch, ['js', browserSync.reload]);
    gulp.watch(config.html.watch, browserSync.reload);
    gulp.watch('path.json', ['copy']);
});

gulp.task('assets:prod', () => 
    gulp.src(config.assets.src)
    .pipe(gulp.dest(config.assets.prodDest))
);

gulp.task('images:prod', () =>
    gulp.src(config.images.src)
    .pipe(imagemin({
        progressive: true,
        optimizationLevel: 5,
    }))
    .pipe(gulp.dest(file => file.base))
);

gulp.task('prod', (done) => 
    runSequence(['js:prod', 'scss:prod', 'html:prod'], 'assets:prod', 'images:prod', done)
);

gulp.task('default', ['js', 'scss', 'watch', 'browser-sync']);