$(function () {

    const
        os = require('os'),
        {shell} = require('electron'),
        {dialog} = require('electron').remote,
        Conf = require('conf'),
        config = new Conf(),
        fs = require('fs'),
        path = require('path')
        ejs = require('ejs');

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

    /**
     * Load a ejs template.
     *
     * @param name
     * @param object
     *
     * @returns {String}
     */
    function loadTemplate(name, object) {
        var tpl = fs.readFileSync(__dirname + '/partials/' + name + '.ejs');
        return ejs.render(tpl.toString(), object);
    }

    /**
     * Reload the whole story.
     */
    function reload() {
        var workDir = config.get('workDir');
        var dirs = getDirectories(workDir);
        var container = $('#navigation ul');

        container.empty();

        for (let dir of dirs) {

            var li = $('<li>' + dir + '<div class="gitStatus text-right"></div></li>');

            li.attr('id', dir);

            if (!fs.existsSync(workDir + '/' + dir + '/.git')) {
                li.addClass('noGitDir');
            }
            else {
                li.addClass('gitDir');
                li.find('.gitStatus').html('<img src="img/ajax-loader.gif" />.');
                li.on('click', function () {
                    $(this).parent().find('li').removeClass('active');
                    $(this).addClass('active');
                    scanRepository(workDir + '/' + dir);
                })
            }

            li.appendTo(container);
        }

        // Update status
        $('#navigation li.gitDir').each(function () {
            var dir = $(this).attr('id');
            var result = $(this).find('.gitStatus');
            if (result.text()) {
                require('simple-git')(workDir + '/' + dir).status(function (err, status) {
                    result.html(loadTemplate('statusRow', {o:status}));
                })
            }
        });
    }

    /**
     * Scan the repository.
     *
     * @param repoPath
     */
    function scanRepository(repoPath) {
        var result = $('#gitContent');

        result.html('Loading info <img src="img/ajax-loader.gif" />');
        $('#gitRepoConsole').html('');

        var o = {};

        o.repoPath = repoPath;

        require('simple-git')(repoPath)
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

                result.html(loadTemplate('status', {o:o}));

                $('ul.gitRemotes a').each(function (idx, a) {
                    $(a).on('click', function () {
                        var link = $(this).text();

                        if (0 == link.indexOf('git@')) {
                            link = link
                                .replace(':', '/')
                                .replace('git@', 'https://');
                        }

                        shell.openExternal(link);

                        return false;
                    });
                });

                $('span.gitFileOptions').each(function () {
                    var parent = $(this).parent();
                    var file = parent.text().trim();

                    var dataOptions = $(this).attr('data-options');
                    var options = dataOptions ? dataOptions.split(',') : [];
                    var hideDefaults = $(this).attr('data-hide-defaults') ? true : false;

                    $(this).html(loadTemplate('fileOptions', {options:options, hideDefaults:hideDefaults}));

                    $(this).parent().find('a').on('click', function () {
                        handleFileOptions($(this).text(), repoPath, file, $(parent.find('.codemirror')));
                    });
                });

                $('#btnFetchRepo').on('click', function () {
                    displayGitResponse('Processing', $('#gitRepoConsole'), null, null);
                    require('simple-git')(repoPath).fetch(function(err, data){
                        displayGitResponse('Fetch', $('#gitRepoConsole'), err, data);
                    });
                });

                $('#btnPullRepo').on('click', function () {
                    displayGitResponse('Processing', $('#gitRepoConsole'), null, null);
                    require('simple-git')(repoPath).pull(function(err, data){
                        displayGitResponse('Pull', $('#gitRepoConsole'), err, data);
                    });
                });
            })
    }

    /**
     * Handle file options.
     *
     * @param command
     * @param path
     * @param file
     * @param cmContainer
     */
    function handleFileOptions(command, path, file, cmContainer) {
        var fullPath = path + '/' + file;
        CodeMirror.modeURL = './bower_components/codemirror/mode/%N/%N.js';
        switch (command) {
            case 'Diff':
                require('simple-git')(path)
                    .diff([file], function (err, data) {
                        $(document).find('.CodeMirror').remove();
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
                fs.readFile(fullPath, 'utf8', function (err, contents) {
                    $(document).find('.CodeMirror').remove();
                    cmContainer.text(contents);
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
            case 'Revert':
                require('simple-git')(path)
                    .checkout(file, function (err, data) {
                        scanRepository(path);
                        displayGitResponse('Revert', $('#gitRepoConsole'), err, data);
                    });
                break;
            case 'File Manager':
                shell.showItemInFolder(fullPath);
                break;
            case 'Open':
                shell.openItem(fullPath);
                break;
        }
    }

    /**
     * Display an alert.
     *
     * @param action
     * @param container
     * @param err
     * @param data
     */
    function displayGitResponse(action, container, err, data) {

        var type = 'info',
            message = action + ' completed.';

        if(err) {
            type = 'danger';
            message = '<strong>Error</strong><pre>' + err + '</pre>';
        } else if(data) {
            message = JSON.stringify(data);
        } else if('Processing' == action) {
            message = '<strong>Processing</strong> <img src="img/ajax-loader.gif" />';
        }

        container.html(loadTemplate('gitResponse', {type:type, message:message}));
    }

    /**
     * Show the configuration.
     */
    function showConfig() {
        $('#gitContent').html(loadTemplate('config', {o:config}));

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

    /**
     * Save the configuration.
     */
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

    /**
     * Get a list of directories.
     *
     * @param {string} srcPath The source path
     * @returns array
     */
    function getDirectories(srcPath) {
        return fs.readdirSync(srcPath).filter(function (file) {
            return fs.statSync(path.join(srcPath, file)).isDirectory();
        });
    }
});
