$(function() {

    var tmpl = require('./bower_components/JavaScript-Templates/js/tmpl');
    var os = require('os');
    const {shell} = require('electron')
    const {dialog} = require('electron').remote

    const Conf = require('conf');
    const config = new Conf();

    var fs = require('fs'),
        path = require('path');

    $('.stats').append('Number of cpu cores: <span>' + os.cpus().length + '</span>')
        .append(' - Free memory: <span>' + os.freemem() + '</span>');

    if (!config.get('workDir')) {
        showConfig();
    }
    else
    {
        if(fs.existsSync(config.get('workDir'))) {
            reload();
        }
        else {
            dialog.showErrorBox('Invalid Path', 'The working directory path set in configuration is invalid');
            showConfig();
        }
    }

    function getDirectories(srcpath) {
        return fs.readdirSync(srcpath).filter(function(file) {
            return fs.statSync(path.join(srcpath, file)).isDirectory();
        });
    }

    function showConfig() {
        var container = $('#gitXplorerConfig');
        $('#workDir').val(config.get('workDir'));
        container.find('[name=debug]').prop('checked', config.get('debug'));
        container.show();
        //$('#gitContent').html(tmpl('gitXplorerConfig', config));
    }

    function saveConfig() {
        var container = $('#gitXplorerConfig');
        var workDir = $('#workDir').val();
        var debug = false;

        if (false == fs.existsSync(workDir)) {
            dialog.showErrorBox('Invalid Path', 'The working directory path is invalid');
            return;
        }

        if (container.find('[name=debug]').is(":checked")) {
            debug = true;
        }

        config.set('workDir', workDir);
        config.set('debug', debug);

        reload();
    }

    function reload() {
        var workDir = config.get('workDir');
        var dirs = getDirectories(workDir);
        var container = $('#navigation ul');

        container.empty();

        for (let dir of dirs) {

            var li = $('<li>' + dir + '<div class="gitStatus text-right"></div></li>');

            li.attr('id', dir)
                .addClass('gitDir');

            if (fs.existsSync(workDir + '/' + dir + '/.git')) {
                li.find('.gitStatus').text('loading...');
                li.on('click', function () {
                    var result = $('#gitContent');
                    result.text('Loading info...');
                    var o = {};

                    o.repoPath = workDir + '/' + dir;

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
                        .then(function () {

                            result.html(tmpl('gitStatus', o));

                            $('div.gitRemotes a').each(function (idx, a) {
                                $(a).on('click', function () {
                                    var link = $(this).text();

                                    if (0 == link.indexOf('git@')) {
                                        link = link.replace(':', '/')
                                            .replace('git@', 'https://');
                                    }

                                    shell.openExternal(link);
                                    return false;
                                });
                            });

                            $('span.gitFileOptions').each(function () {
                                var file = $(this).parent().text().trim();
                                $(this).html(tmpl('gitFileOptions'));

                                $(this).parent().find('a').on('click', function () {
                                    var fullPath = workDir + '/' + dir + '/' + file;
                                    switch ($(this).text()) {
                                        case 'Diff':
                                            $('#gitDiffModal').find('#gitDiffModalLabel').text(file);
                                            require('simple-git')(workDir + '/' + dir)
                                                .diff([file], function (err, data) {
                                                    var modal = $('#gitDiffModal');
                                                    modal.find('.gitDiff').text(data);
                                                    modal.modal();
                                                });
                                            break;
                                        case 'Show':
                                            shell.showItemInFolder(fullPath);
                                            break;
                                        case 'Open':
                                            shell.openItem(fullPath);
                                            break;
                                    }
                                });
                            });
                        })
                })
            }
            else {
                li.addClass('noGitDir').removeClass('gitDir');
            }

            li.appendTo(container);
        }

        // Update status
        $('#navigation li.gitDir').each(function () {
            var dir = $(this).attr('id');
            var result = $(this).find('.gitStatus');
            if (result.text()) {
                require('simple-git')(workDir + '/' + dir).status(function (err, status) {
                    result.html(tmpl('gitStatusRow', status));
                })
            }
        });
    }

    // Setup buttons
    var cmdBox = $('.cmdBoxNavi');

    cmdBox.find('[data-toggle=config]').on('click', function() {
        showConfig();
    });

    cmdBox.find('[data-toggle=reload]').on('click', function() {
        reload();
    });

    $('#btnSaveConfig').on('click', function() {
        saveConfig();
    });
});
