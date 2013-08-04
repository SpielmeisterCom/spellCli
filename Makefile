SPELL_CLI_BUILD_DIR = build
TMP_DIR             = $(SPELL_CLI_BUILD_DIR)/tmp
SPELL_CLI_LIB       = $(TMP_DIR)/spellcli.js
NODE                = modules/nodejs/node
NODE_SRC            = modules/node
NODE_PATH           = $$(modules/nodejs/node --which)

UNAME_S := $(shell uname -s)
NODEJS_CONFIGURE_OPTS = 

ifeq ($(UNAME_S),Darwin)
	SED = sed -i "" -e
	SPELL_CLI_OUT_DIR = $(SPELL_CLI_BUILD_DIR)/osx-ia32
	WINDOWS_ENV = false
	NODEJS_CONFIGURE_OPTS = "--dest-cpu=ia32"

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
	rm -rf $(TMP_DIR) || true
	cd $(NODE_SRC) && make clean && rm lib/_third_party_main.js || true

$(SPELL_CLI_LIB):
	# creating the javascript includes for the command line tool
	test -d $(TMP_DIR) || mkdir -p $(TMP_DIR)

	echo 'var RELEASE = true' > $(SPELL_CLI_LIB)
	cat src/spell/cli/spellcli.js >> $(SPELL_CLI_LIB)
	$(NODE) tools/n.js -s src -m spell/cli/developmentTool -i "fs,path,uglify-js,amd-helper,child_process,xmlbuilder,os,underscore,underscore.string,zipstream,util,commander,ff,spell-license,wrench,pathUtil" >> $(SPELL_CLI_LIB)

$(NODE_SRC)/lib/_third_party_main.js: $(SPELL_CLI_LIB)
	cp $(SPELL_CLI_LIB) $(NODE_SRC)/lib/_third_party_main.js
	$(SED) 's/uglify-js/uglifyjs/g' $(NODE_SRC)/lib/_third_party_main.js
	$(SED) 's/amd-helper/amdhelper/g' $(NODE_SRC)/lib/_third_party_main.js
	$(SED) 's/underscore.string/underscorestring/g' $(NODE_SRC)/lib/_third_party_main.js
	$(SED) 's/spell-license/spelllicense/g' $(NODE_SRC)/lib/_third_party_main.js

cli: $(NODE_SRC)/lib/_third_party_main.js 
	mkdir -p $(SPELL_CLI_OUT_DIR) || true

ifeq ($(WINDOWS_ENV),true)
	cd $(NODE_SRC) && patch -p1 < ../../../$(VISUAL_STUDIO_PATCH_FILE)

	cd $(NODE_SRC) && chmod +x vcbuild.bat && ./vcbuild.bat
	cp $(NODE_SRC)/Release/node.exe $(SPELL_CLI_OUT_DIR)/spellcli.exe
	modules/upx/upx -9 $(SPELL_CLI_OUT_DIR)/spellcli.exe
else
	cd $(NODE_SRC) && ./configure $(NODEJS_CONFIGURE_OPTS) && make -j4
	cp $(NODE_SRC)/out/Release/node $(SPELL_CLI_OUT_DIR)/spellcli
	modules/upx/upx -9 $(SPELL_CLI_OUT_DIR)/spellcli
endif

