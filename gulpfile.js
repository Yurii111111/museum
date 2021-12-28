"use strict";

const distPath = "dist";
const srcPath = "src";
const fs = require("fs");

const path = {
  build: {
    html: distPath + "/",
    css: distPath + "/assets/css/",
    js: distPath + "/assets/js/",
    img: distPath + "/assets/images/",
    fonts: distPath + "/assets/fonts/",
    assets: distPath + "/assets/",
  },
  src: {
    html: [srcPath + "/*.html", "!" + srcPath + "/html/_*.html"],
    css: srcPath + "/assets/scss/style.scss",
    js: srcPath + "/assets/js/script.js",
    img: srcPath + "/assets/images/**/*",
    fonts: srcPath + "/assets/fonts/*.ttf",
    assets: srcPath + "/assets/*",
  },
  watch: {
    html: srcPath + "/**/*.html",
    css: srcPath + "/assets/**/*.scss",
    js: srcPath + "/assets/**/**/*.js",
    img: srcPath + "/assets/images/**/*",
    assets: srcPath + "/assets/*",
  },
  clean: "./" + distPath + "/",
}

const { src, dest } = require("gulp");
const gulp = require("gulp");
const browsersync = require("browser-sync").create();
const fileinclude = require("gulp-file-include");
const del = require("del");
const sass = require('gulp-sass')(require('sass'));
const rename = require("gulp-rename");
const autoprefixer = require('gulp-autoprefixer');
const gcmq = require('gulp-group-css-media-queries');
const cleanCSS = require('gulp-clean-css');
const webpack = require("webpack-stream");
const terser = require('gulp-terser');
const stripCssComments = require('gulp-strip-css-comments');
const imagemin = require('gulp-imagemin');
const ttf2woff = require('gulp-ttf2woff');
const ttf2woff2 = require('gulp-ttf2woff2');

function browserSync() {
  browsersync.init({
    server: {
      baseDir: "./" + distPath + "/"
    },
    port: 3000,
  });
}

function html() {
  return src(path.src.html)
    .pipe(fileinclude())
    .pipe(dest(path.build.html))
    .pipe(browsersync.stream())
}

function css() {
  return src(path.src.css)
    .pipe(sass({
      outputStyle: "expanded"
    }).on('error', sass.logError))
    .pipe(gcmq())
    .pipe(autoprefixer({
      cascade: true
    }))
    .pipe(dest(path.build.css))
    .pipe(cleanCSS({ level: { 1: { specialComments: 0 } } }))
    .pipe(rename({
      suffix: ".min",
      extname: ".css"
    }))
    .pipe(dest(path.build.css))
    .pipe(browsersync.stream())
}

function js() {
  return src(path.src.js)
    .pipe(webpack({
      mode: 'development',
      output: {
        filename: 'script.js'
      },
      watch: false,
      module: {
        rules: [
          {
            test: /\.m?js$/,
            exclude: /(node_modules|bower_components)/,
            use: {
              loader: 'babel-loader',
              options: {
                presets: [['@babel/preset-env', {
                  debug: true,
                  corejs: 3,
                  useBuiltIns: "usage"
                }]]
              }
            }
          }
        ]
      }
    }))
    .pipe(dest(path.build.js))
    .pipe(stripCssComments(
      { preserve: false }
    ))
    .pipe(terser())
    .pipe(rename({
      suffix: ".min",
      extname: ".js"
    }))
    .pipe(dest(path.build.js))
    .pipe(browsersync.stream())
}

function images() {
  return src(path.src.img)
    .pipe(imagemin([
      imagemin.gifsicle({ interlaced: true }),
      imagemin.mozjpeg({ quality: 95, progressive: true }),
      imagemin.optipng({ optimizationLevel: 5 }),
      imagemin.svgo({
        plugins: [
          { removeViewBox: true },
          { cleanupIDs: false }
        ]
      })
    ]))
    .pipe(dest(path.build.img))
    .pipe(browsersync.stream())
}

function assetsCopy() {
  return src(path.src.assets)
    .pipe(dest(path.build.assets))
    .pipe(browsersync.stream())
}

function fonts() {
  src(path.src.fonts)
    .pipe(ttf2woff())
    .pipe(dest(path.build.fonts));
  return src(path.src.fonts)
    .pipe(ttf2woff2())
    .pipe(dest(path.build.fonts))
    .pipe(browsersync.stream())
}

function fontsStyle() {
  let file_content = fs.readFileSync(srcPath + '/assets/scss/_fonts.scss');
  if (file_content == '') {
    fs.writeFile(srcPath + '/assets/scss/_fonts.scss', '', cb);
    return fs.readdir(path.build.fonts, function (err, items) {
      if (items) {
        let c_fontname;
        for (let i = 0; i < items.length; i++) {
          let fontname = items[i].split('.');
          fontname = fontname[0];
          if (c_fontname != fontname) {
            fs.appendFile(srcPath + '/assets/scss/_fonts.scss', '@include font("' + fontname + '", "' + fontname + '", "400", "normal");\r\n', cb);
          }
          c_fontname = fontname;
        }
      }
    })
  }
}

function cb() { }

function watchFiles() {
  gulp.watch([path.watch.html], html);
  gulp.watch([path.watch.css], css);
  gulp.watch([path.watch.js], js);
  gulp.watch([path.watch.img], images);
  gulp.watch([path.watch.assets], assetsCopy);
}

function clean() {
  return del(path.clean)
}

let build = gulp.series(clean, gulp.parallel(html, css, js, images, assetsCopy, fonts), gulp.parallel(fontsStyle, browserSync));
let watch = gulp.parallel(build, watchFiles);

exports.assetsCopy = assetsCopy;
exports.fontsStyle = fontsStyle;
exports.fonts = fonts;
exports.images = images;
exports.js = js;
exports.css = css;
exports.html = html;
exports.build = build;
exports.watch = watch;
exports.default = watch;
