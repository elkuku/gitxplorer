$(function () {

    const
        tmpl = require('./bower_components/JavaScript-Templates/js/tmpl'),
        os = require('os'),
        {shell} = require('electron'),
        {dialog} = require('electron').remote,
        Conf = require('conf'),
        config = new Conf(),
        fs = require('fs'),
        path = require('path');

    // Check if "Wheit" (Light) theme is selected
    if ('Wheit' == config.get('theme')) {
        $('head link#styleSheet').attr('href', 'css/gitxplorer_light.css');
    }

    $('.stats')
        .append('Number of cpu cores: <span>' + os.cpus().length + '</span>')
        .append(' - Free memory: <span>' + os.freemem() + '</span>');

    if (!config.get('workDir')) {
        showConfig();
    }
    else {
        if (fs.existsSync(config.get('workDir'))) {
            reload();
        }
        else {
            dialog.showErrorBox('Invalid Path', 'The working directory path set in configuration is invalid');
            showConfig();
        }
    }

    function getDirectories(srcpath) {
        return fs.readdirSync(srcpath).filter(function (file) {
            return fs.statSync(path.join(srcpath, file)).isDirectory();
        });
    }

    function showConfig() {
        $('#gitContent').html(tmpl('gitXplorerConfig', config));
        $('#btnSaveConfig').on('click', function () {
            saveConfig();
        });
        $('#cfgTheme').on('change', function () {
            var e = $('head link#styleSheet');

            if ('Bläk' == $(this).val()) {
                e.attr('href', 'css/gitxplorer.css');
            } else {
                e.attr('href', 'css/gitxplorer_light.css');
            }
        });
    }

    function saveConfig() {
        var workDir = $('#cfgWorkDir').val();
        var theme = $('#cfgTheme').val();
        var debug = $('#cfgDebug').is(':checked') ? true : false;

        if (false == fs.existsSync(workDir)) {
            dialog.showErrorBox('Invalid Path', 'The working directory path is invalid');
            return;
        }

        config.set('workDir', workDir);
        config.set('debug', debug);
        config.set('theme', theme);

        $('#gitContent').html('Config saved.<br />Select a repo...');

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
                    $(this).parent().find('li').removeClass('active');
                    $(this).addClass('active');
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

                            $('ul.gitRemotes a').each(function (idx, a) {
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
                                var parent = $(this).parent();
                                var file = parent.text().trim();
                                $(this).html(tmpl('gitFileOptions'));

                                $(this).parent().find('a').on('click', function () {
                                    var fullPath = workDir + '/' + dir + '/' + file;
                                    CodeMirror.modeURL = './bower_components/codemirror/mode/%N/%N.js';
                                    switch ($(this).text()) {
                                        case 'Diff':
                                            require('simple-git')(workDir + '/' + dir)
                                                .diff([file], function (err, data) {
                                                    $(document).find('.CodeMirror').remove();
                                                    var cmContainer = $(parent.find('.codemirror'));
                                                    cmContainer.text(data);
                                                    var info = CodeMirror.findModeByExtension('diff');
                                                    var editor = CodeMirror.fromTextArea(cmContainer[0],
                                                        {
                                                            readOnly: true,
                                                            autofocus: true,
                                                            mode: info.mime
                                                        }
                                                    );
                                                    CodeMirror.autoLoadMode(editor, info.mode);
                                                });
                                            break;
                                        case 'Show':
                                            var cmContainer = $(parent.find('.codemirror'));
                                            fs.readFile(fullPath, 'utf8', function (err, contents) {
                                                cmContainer.text(contents);
                                                $(document).find('.CodeMirror').remove();
                                                var m, mode, spec, info;
                                                if (m = /.+\.([^.]+)$/.exec(file)) {
                                                    info = CodeMirror.findModeByExtension(m[1]);
                                                    if (info) {
                                                        spec = info.mime;
                                                        mode = info.mode;
                                                    }
                                                    else {
                                                        if ($.inArray(m[1], ['dist', 'iml', 'svg']) > -1) {
                                                            mode = 'xml';
                                                            spec = 'application/xml';
                                                        } else {
                                                            mode = spec = m[1];
                                                        }
                                                    }
                                                }
                                                else {
                                                    mode = spec = 'txt';
                                                }

                                                var editor = CodeMirror.fromTextArea(cmContainer[0],
                                                    {
                                                        lineNumbers: true,
                                                        readOnly: true,
                                                        autofocus: true,
                                                        mode: spec
                                                    }
                                                );

                                                CodeMirror.autoLoadMode(editor, mode);
                                            });
                                            break;
                                        case 'File Manager':
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

    cmdBox.find('[data-toggle=config]').on('click', function () {
        showConfig();
    });

    cmdBox.find('[data-toggle=reload]').on('click', function () {
        reload();
        $('#gitContent').text('Select a repo...');
    });

    cmdBox.find('[data-toggle=theme]').on('click', function () {
        var e = $('head link#styleSheet');

        if (e.attr('href').indexOf('light') > 0) {
            e.attr('href', 'css/gitxplorer.css');
        } else {
            e.attr('href', 'css/gitxplorer_light.css');
        }
    });
});
