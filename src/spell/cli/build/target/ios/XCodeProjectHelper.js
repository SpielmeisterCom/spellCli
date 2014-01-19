define(
	'spell/cli/build/target/ios/XCodeProjectHelper',
	[
		'plist',
		'fs',
		'ff'
	],
	function(
		plist,
		fs,
	    ff
	)
	{
		var NAMES_TO_REPLACE = /(PRODUCT_NAME)|(name = )|(productName = )/;

        var removeKeysForObjects = function(parentObject, objects, keys) {
            for (var ii = 0; ii < objects.length; ++ii) {
                var objectName = objects[ii];
                var obj = parentObject[objectName];

                for (var jj = 0; jj < keys.length; ++jj) {
                    var key = keys[jj];

                    var index = obj.indexOf(key);

                    if (index !== -1) {
                        obj.splice(index, 1);
                    }
                }
            }
        }

		var updateIOSProjectFile = function( projectFile, bundleID , next ) {

			fs.readFile( projectFile, 'utf8', function(err, data) {

				if (err) {
					next(err)

				} else {

					var contents = data.split('\n')

					contents = contents.map(function(line) {

						if (line.match(NAMES_TO_REPLACE)) {
							line = line.replace('Ejecta', bundleID)
                            line = line.replace('iOSImpact', bundleID)

						}

						return line
					})

					// Run it through the plugin system before writing
					/*installAddonsProject(builder, {
						addonConfig: opts.addonConfig,
						contents: contents,
						destDir: opts.destDir,
						manifest: opts.manifest
					}, function() {*/
						contents = contents.join('\n')

						fs.writeFile( projectFile, contents, 'utf8', function(err) {
							next(err)
						})

					/*});*/
				}
			})
		}

		var updatePListFile = function( plistFilePath, bundleID, title, version, supportedOrientation, next ) {

            fs.readFile( plistFilePath, 'utf8', function(err, data) {

                if (err) {
                    next(err)

                } else {

                    var contents = plist.parseStringSync( data )

	                var supportedInterfaceOrientations = [
		                'UIInterfaceOrientationLandscapeRight', 'UIInterfaceOrientationLandscapeLeft',
		                'UIInterfaceOrientationPortrait', 'UIInterfaceOrientationPortraitUpsideDown'
	                ]

                    if( supportedOrientation == 'landscape' ) {
	                    supportedInterfaceOrientations = [
		                    'UIInterfaceOrientationLandscapeRight', 'UIInterfaceOrientationLandscapeLeft'
	                    ]

	                    contents[ 'UIInterfaceOrientation' ]          = 'UIInterfaceOrientationLandscapeRight'


                    } else if ( supportedOrientation == 'portrait' ) {
	                    supportedInterfaceOrientations = [
		                    'UIInterfaceOrientationPortrait', 'UIInterfaceOrientationPortraitUpsideDown'
	                    ]

	                    contents[ 'UIInterfaceOrientation' ]          = 'UIInterfaceOrientationPortrait'

                    }

	                contents[ 'UISupportedInterfaceOrientations' ]      = supportedInterfaceOrientations
	                contents[ 'UISupportedInterfaceOrientations~ipad' ] = supportedInterfaceOrientations
                    contents[ 'CFBundleShortVersionString' ]            = version

                    // If RenderGloss enabled,
                    /*if (manifest.ios.icons && manifest.ios.icons.renderGloss) {
                        // Note: Default is for Xcode to render it for you
                        logger.log("RenderGloss: Removing pre-rendered icon flag");
                        delete contents.UIPrerenderedIcon;
                        //delete contents.CFBundleIcons.CFBundlePrimaryIcon.UIPrerenderedIcon;
                    }*/

                    contents.CFBundleDisplayName    = title
                    contents.CFBundleIdentifier     = bundleID
                    contents.CFBundleName           = bundleID
                    contents.CFBundleURLTypes       = [{
			                CFBundleURLName     : bundleID,
			                CFBundleURLSchemes  : [ bundleID ]
		            }]


                    /*installAddonsPList(builder, {
                        contents: contents,
                        addonConfig: opts.addonConfig,
                        manifest: opts.manifest
                    }, f())
                    */


                    fs.writeFile( plistFilePath, plist.build(contents).toString(), 'utf8', function(err) {
                        next(err)
                    })
                }
            })
        }

        var createConfigFile = function( configPath, configOptions, next ) {
            fs.writeFile(
                configPath,
                plist.build( configOptions ).toString(),
                next
            )
        }

		return {
			updateIOSProjectFile:   updateIOSProjectFile,
			updatePListFile:        updatePListFile,
            createConfigFile:       createConfigFile
		}

	}

)