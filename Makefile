SPELL_CLI_BUILD_DIR = build
SPELL_CLI_LIB_DIR   = tmp
SPELL_CLI_LIB       = $(SPELL_CLI_LIB_DIR)/spellcli.js
NODE                = modules/nodejs/node
NODE_SRC            = modules/nodejs/src
NODE_PATH           = $$(modules/nodejs/node --which)

UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Darwin)
	SED = sed -i "" -e
	SPELL_CLI_OUT_DIR = $(SPELL_CLI_BUILD_DIR)/osx-x64
	WINDOWS_ENV = false

else ifeq ($(UNAME_S),Linux)
	SED = sed -i
	SPELL_CLI_OUT_DIR = $(SPELL_CLI_BUILD_DIR)/linux-x64
	WINDOWS_ENV = false

else ifeq ($(UNAME_S),CYGWIN_NT-6.1-WOW64)
	SED = sed -i
	WINDOWS_ENV = true
	SPELL_CLI_OUT_DIR = $(SPELL_CLI_BUILD_DIR)/win-ia32
	VISUAL_STUDIO_PATCH_FILE = patches/nodejs_vs10.patch

else ifeq ($(UNAME_S),CYGWIN_NT-6.2-WOW64)
	SED = sed -i
	WINDOWS_ENV = true
	SPELL_CLI_OUT_DIR = $(SPELL_CLI_BUILD_DIR)/win-ia32
	VISUAL_STUDIO_PATCH_FILE = patches/nodejs_vs11.patch
endif


.PHONY: all clean cli-js cli

all: cli

clean:
	rm -rf $(SPELL_CLI_BUILD_DIR) || true
	rm -rf $(SPELL_CLI_LIB_DIR) || true

cli-js:
	# creating the javascript includes for the command line tool
	test -d $(SPELL_CLI_LIB_DIR) || mkdir -p $(SPELL_CLI_LIB_DIR)

	echo 'var RELEASE = true' > $(SPELL_CLI_LIB)
	cat src/spell/cli/spellcli.js >> $(SPELL_CLI_LIB)
	$(NODE) tools/n.js -s src -m spell/cli/developmentTool -i "fs,mkdirp,path,uglify-js,amd-helper,flob,child_process,xmlbuilder,os,underscore.string,rimraf,zipstream,util,commander,ff,spell-license,wrench" >> $(SPELL_CLI_LIB)


cli: cli-js
	# reseting node src directory
	cd $(NODE_SRC) && git reset --hard master

	# patching nodejs src
	cd $(NODE_SRC) && patch -p1 <../../../patches/nodejs_spellCore_integration.patch

	# creating cli executable
	cp $(SPELL_CLI_LIB) $(NODE_SRC)/lib/_third_party_main.js

	# patch includes in _third_party_main.js
	$(SED) 's/uglify-js/uglifyjs/g' $(NODE_SRC)/lib/_third_party_main.js

	# integrate requirejs
	tail -n +2 node_modules/requirejs/bin/r.js >$(NODE_SRC)/lib/requirejs.js

	# integrate mkdirp
	cp node_modules/mkdirp/index.js $(NODE_SRC)/lib/mkdirp.js

	# integrate uglify-js
	cp node_modules/uglify-js/uglify-js.js $(NODE_SRC)/lib/uglifyjs.js
	cp node_modules/uglify-js/lib/process.js $(NODE_SRC)/lib/uglifyjs_process.js
	cp node_modules/uglify-js/lib/parse-js.js $(NODE_SRC)/lib/uglifyjs_parsejs.js
	cp node_modules/uglify-js/lib/squeeze-more.js $(NODE_SRC)/lib/uglifyjs_squeezemore.js
	cp node_modules/uglify-js/lib/consolidator.js $(NODE_SRC)/lib/uglifyjs_consolidator.js
	$(SED) 's/\.\/lib\/parse-js/uglifyjs_parsejs/g' $(NODE_SRC)/lib/*.js
	$(SED) 's/\.\/parse-js/uglifyjs_parsejs/g' $(NODE_SRC)/lib/*.js
	$(SED) 's/\.\/lib\/process/uglifyjs_process/g' $(NODE_SRC)/lib/*.js
	$(SED) 's/\.\/process/uglifyjs_process/g' $(NODE_SRC)/lib/*.js
	$(SED) 's/\.\/lib\/squeeze-more/uglifyjs_squeezemore/g' $(NODE_SRC)/lib/*.js
	$(SED) 's/\.\/squeeze-more/uglifyjs_squeezemore/g' $(NODE_SRC)/lib/*.js
	$(SED) 's/\.\/lib\/consolidator/uglifyjs_consolidator/g' $(NODE_SRC)/lib/*.js
	$(SED) 's/\.\/consolidator/uglifyjs_consolidator/g' $(NODE_SRC)/lib/*.js

	# integrate underscore
	cp node_modules/underscore/underscore.js $(NODE_SRC)/lib/underscore.js

	# integrate ff
	cp node_modules/ff/lib/ff.js $(NODE_SRC)/lib/ff.js

	# integrate amd-helper
	cp node_modules/amd-helper/lib/index.js $(NODE_SRC)/lib/amdhelper.js
	cp node_modules/amd-helper/lib/createModuleHeader.js $(NODE_SRC)/lib/amdhelper_createModuleHeader.js
	cp node_modules/amd-helper/lib/extractModuleHeader.js $(NODE_SRC)/lib/amdhelper_extractModuleHeader.js
	cp node_modules/amd-helper/lib/loadModule.js $(NODE_SRC)/lib/amdhelper_loadModule.js
	cp node_modules/amd-helper/lib/loadModules.js $(NODE_SRC)/lib/amdhelper_loadModules.js
	cp node_modules/amd-helper/lib/traceDependencies.js $(NODE_SRC)/lib/amdhelper_traceDependencies.js
	$(SED) 's/amd-helper/amdhelper/g' $(NODE_SRC)/lib/*.js
	$(SED) 's/.\/extractModuleHeader/amdhelper_extractModuleHeader/g' $(NODE_SRC)/lib/*.js
	$(SED) 's/.\/loadModule/amdhelper_loadModule/g' $(NODE_SRC)/lib/*.js
	$(SED) 's/.\/createModuleHeader/amdhelper_createModuleHeader/g' $(NODE_SRC)/lib/*.js
	$(SED) 's/.\/traceDependencies/amdhelper_traceDependencies/g' $(NODE_SRC)/lib/*.js
	$(SED) 's/uglify-js/uglifyjs/g' $(NODE_SRC)/lib/*.js

	# integrate flob
	cp node_modules/flob/lib/index.js $(NODE_SRC)/lib/flob.js
	cp node_modules/flob/lib/byTypes.js $(NODE_SRC)/lib/flob_byTypes.js
	cp node_modules/flob/lib/sync.js $(NODE_SRC)/lib/flob_sync.js
	$(SED) 's/.\/byTypes/flob_byTypes/g' $(NODE_SRC)/lib/flob.js
	$(SED) 's/.\/sync/flob_sync/g' $(NODE_SRC)/lib/flob.js

	# integrate glob
	cp node_modules/glob/glob.js $(NODE_SRC)/lib/glob.js

	# integrate graceful-fs (dependency of glob)
	cp node_modules/glob/node_modules/graceful-fs/graceful-fs.js $(NODE_SRC)/lib/gracefulfs.js
	$(SED) 's/graceful-fs/gracefulfs/g' $(NODE_SRC)/lib/*.js

	# integrate minimatch (dependency of glob)
	cp node_modules/glob/node_modules/minimatch/minimatch.js $(NODE_SRC)/lib/minimatch.js

	# integrate lru-cache (dependency of minimatch)
	cp node_modules/glob/node_modules/minimatch/node_modules/lru-cache/lib/lru-cache.js $(NODE_SRC)/lib/lrucache.js
	$(SED) 's/lru-cache/lrucache/g' $(NODE_SRC)/lib/*.js

	# integrate sigmund (dependency of minimatch)
	cp node_modules/glob/node_modules/minimatch/node_modules/sigmund/sigmund.js $(NODE_SRC)/lib/sigmund.js

	# integrate inherits
	cp node_modules/glob/node_modules/inherits/inherits.js $(NODE_SRC)/lib/inherits.js

	# integrate underscore.string
	cp node_modules/underscore.string/lib/underscore.string.js $(NODE_SRC)/lib/underscorestring.js
	$(SED) 's/underscore.string/underscorestring/g' $(NODE_SRC)/lib/*.js

	# integrate xmlbuilder
	cp node_modules/xmlbuilder/lib/index.js $(NODE_SRC)/lib/xmlbuilder.js
	cp node_modules/xmlbuilder/lib/XMLBuilder.js $(NODE_SRC)/lib/xmlbuilder_XMLBuilder.js
	cp node_modules/xmlbuilder/lib/XMLFragment.js $(NODE_SRC)/lib/xmlbuilder_XMLFragment.js
	$(SED) 's/.\/XMLBuilder/xmlbuilder_XMLBuilder/g' $(NODE_SRC)/lib/xmlbuilder*.js
	$(SED) 's/.\/XMLFragment/xmlbuilder_XMLFragment/g' $(NODE_SRC)/lib/xmlbuilder*.js

	# integrate rimraf
	cp node_modules/rimraf/rimraf.js $(NODE_SRC)/lib/rimraf.js

	# integrate zipstream
	cp node_modules/zipstream/zipstream.js $(NODE_SRC)/lib/zipstream.js
	cp node_modules/zipstream/crc32.js $(NODE_SRC)/lib/zipstream_crc32.js
	$(SED) 's/.\/crc32/zipstream_crc32/g' $(NODE_SRC)/lib/zipstream.js

	# integrate commander
	cp node_modules/commander/lib/commander.js $(NODE_SRC)/lib/commander.js

	# integrate spell-license
	cp node_modules/spell-license/lib/index.js $(NODE_SRC)/lib/spelllicense.js
	$(SED) 's/spell-license/spelllicense/g' $(NODE_SRC)/lib/*.js

	# integrate wrench
	cp node_modules/wrench/lib/wrench.js $(NODE_SRC)/lib/wrench.js

	# compile nodejs
	mkdir -p $(SPELL_CLI_OUT_DIR) || true

ifeq ($(WINDOWS_ENV),true)
	cd $(NODE_SRC) && patch -p1 <../../../modules/spellCore/$(VISUAL_STUDIO_PATCH_FILE)

	cd $(NODE_SRC) && ./vcbuild.bat
	cp $(NODE_SRC)/Release/node.exe $(SPELL_CLI_OUT_DIR)/spellcli.exe
	modules/upx/upx -9 $(SPELL_CLI_OUT_DIR)/spellcli.exe
else
	cd $(NODE_SRC) && make clean && ./configure && make -j4
	cp $(NODE_SRC)/out/Release/node $(SPELL_CLI_OUT_DIR)/spellcli
	modules/upx/upx -9 $(SPELL_CLI_OUT_DIR)/spellcli
endif

