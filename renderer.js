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
    //var container = $('.folderList');
    var container = $('#navigation ul');

    for (let dir of dirs) {

        var li = $('<li>' + dir + '<div class="gitStatus text-right"></div></li>');

        li.attr('id', dir)
            .addClass('gitDir');

        if (fs.existsSync(workDir + '/' + dir + '/.git')){
            li.find('.gitStatus').text('loading...');
            li.on('click', function() {
                var result = $('#gitContent');
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
                        //console.log(o);
                        result.html(tmpl('gitStatus', o));
                        $('ul.gitFileModified li').each(function(idx, li) {
                            $(li).on('click', function() {
                                $('#gitDiffModal').find('#gitDiffModalLabel').text($(this).text());
                                require('simple-git')(workDir + '/' + dir)
                                    .diff([$(this).text()], function (err, data) {

                                        var modal = $('#gitDiffModal');
                                        modal.find('.gitDiff').text(data);
                                            modal.modal();
                                    });
                            });
                        });
                    })
            })
        }
        else
        {
            li.addClass('noGitDir').removeClass('gitDir');
        }

        li.appendTo(container);
    }

    $('#navigation li.gitDir').each(function(){
        var dir = $(this).attr('id');
        var result = $(this).find('.gitStatus');
        if (result.text()) {
            require('simple-git')(workDir + '/' + dir).status(function (err, status) {
                result.html(tmpl('gitStatusRow', status));
            })
        }
    });

});
