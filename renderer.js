$(function() {

    var tmpl = require('./bower_components/JavaScript-Templates/js/tmpl');
    var os = require('os');

    $('.stats').append('Number of cpu cores: <span>' + os.cpus().length + '</span>')
        .append(' - Free memory: <span>' + os.freemem() + '</span>');

    var fs = require('fs'),
        path = require('path');

    function getDirectories(srcpath) {
        return fs.readdirSync(srcpath).filter(function(file) {
            return fs.statSync(path.join(srcpath, file)).isDirectory();
        });
    }

    var workDir = '/home/elkuku/repos';
    var dirs = getDirectories(workDir);
    var container = $('.folderList');

    for (let dir of dirs) {

        var li = $('<div class="row">'
            + '<div class="row gitRepo"><div class="col-xs-6">' + dir + '</div><div class="gitStatus col-xs-6 text-right"></div></div>'
            + '<div class="row gitRepoInfo"><div class="result col-md-12"></div></div>'
            + '</div>'
        );

        li.attr('id', dir)
            .addClass('gitDir');

        if (fs.existsSync(workDir + '/' + dir + '/.git')){
            li.find('.gitStatus').text('loading...');
            li.find('.gitRepo').on('click', function() {
                $(document).find('.result').text('');
                var result = $(this).next().find('.result');
                result.text('Loading info...');
                var o = {};
                require('simple-git')(workDir + '/' + dir)
                    .status(function (err, data) {
                        o.status = data;
                    })
                    .getRemotes(true, function (err, data) {
                        o.remotes = data;
                    })
                    .tags(function (err, data) {
                        o.tags = data;
                    })
                    .branch(function (err, data) {
                        o.branchesInfo = data;
                    })
                    .diffSummary(function (err, data) {
                        o.diffSummary = data;
                    })
                    .then(function(){
                        console.log(o);
                        result.html(tmpl('gitStatus', o));
                    })
            })
        }
        else
        {
            li.addClass('noGitDir').removeClass('gitDir');
        }

        li.appendTo(container);

        /*
        li.find('a')
            .attr('href', item.find('link').text())
            .text(item.find("title").text());

        li.find('img').attr('src', imageSource);
        */

    }

    $('.folderList div.gitDir').each(function(){
        var dir = $(this).attr('id');
        var result = $(this).find('.gitStatus');
        if (result.text()) {
            require('simple-git')(workDir + '/' + dir).status(function (err, status) {
                result.html(tmpl('gitStatusRow', status));
            })
        }
    });
});
