define(
	'spell/shared/build/target/ios/XCodeProjectHelper',
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
		var DEFAULT_IOS_PRODUCT = 'TeaLeafIOS';
		var NAMES_TO_REPLACE = /(PRODUCT_NAME)|(name = )|(productName = )/;

		var updateIOSProjectFile = function( projectFile, supportedOrientations, next ) {

			fs.readFile( projectFile, 'utf8', function(err, data) {

				if (err) {
					next(err)

				} else {

					var contents = data.split('\n')

					contents = contents.map(function(line) {

						if (line.match(NAMES_TO_REPLACE)) {
							line = line.replace(DEFAULT_IOS_PRODUCT, bundleID)
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

		var updatePListFile = function( plistFilePath, bundleID, title, version, supportedOrientations, next ) {

			var f = ff(this, function() {
				fs.readFile( plistFilePath, 'utf8', f() )

			}, function( data ) {

				var contents = plist.parseStringSync( data )

				// Remove unsupported modes
				if( supportedOrientations.indexOf("landscape") == -1 ) {
					removeKeysForObjects(contents, ["UISupportedInterfaceOrientations", "UISupportedInterfaceOrientations~ipad"],
						["UIInterfaceOrientationLandscapeRight", "UIInterfaceOrientationLandscapeLeft"]);
				}

				if ( supportedOrientations.indexOf("portrait") == -1 ) {
					removeKeysForObjects(contents, ["UISupportedInterfaceOrientations", "UISupportedInterfaceOrientations~ipad"],
						["UIInterfaceOrientationPortrait", "UIInterfaceOrientationPortraitUpsideDown"]);
				}

				contents.CFBundleShortVersionString = version

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

				// For each URLTypes array entry,
				var found = 0;
				for (var ii = 0; ii < contents.CFBundleURLTypes.length; ++ii) {
					var obj = contents.CFBundleURLTypes[ii];

					// If it's the URLName one,
					if (obj.CFBundleURLName) {
						obj.CFBundleURLName = bundleID
						++found
					}

					// If it's the URLSchemes one,
					if (obj.CFBundleURLSchemes) {
						// Note this blows away all the array entries
						obj.CFBundleURLSchemes = [bundleID]
						++found
					}
				}

				if( found != 2 ) {
					throw new Error("Unable to update URLTypes")
				}

				/*installAddonsPList(builder, {
					contents: contents,
					addonConfig: opts.addonConfig,
					manifest: opts.manifest
				}, f())
				*/

			}, function(contents) {

				fs.writeFile(plistFilePath, plist.build(contents).toString(), f());

			}).error(function(err) {

					console.log("[spellcli] Failure while updating PList file:", err, err.stack);
					process.exit(1)

			}).cb(next)
		}


		return {
			updateIOSProjectFile: updateIOSProjectFile,
			updatePListFile: updatePListFile
		}

	}

)