(function() {
  var helper, path, pkg;

  path = require('path');

  pkg = require('../lib/main');

  helper = require('./helper');

  describe('Atom-LaTeX', function() {
    beforeEach(function() {
      return waitsForPromise(function() {
        return helper.activatePackages();
      });
    });
    describe('Package', function() {
      return describe('when package initialized', function() {
        return it('has Atom-LaTeX main object', function() {
          expect(pkg.latex).toBeDefined();
          expect(pkg.latex.builder).toBeDefined();
          expect(pkg.latex.manager).toBeDefined();
          expect(pkg.latex.viewer).toBeDefined();
          expect(pkg.latex.server).toBeDefined();
          expect(pkg.latex.panel).toBeDefined();
          expect(pkg.latex.parser).toBeDefined();
          expect(pkg.latex.locator).toBeDefined();
          expect(pkg.latex.logger).toBeDefined();
          return expect(pkg.latex.cleaner).toBeDefined();
        });
      });
    });
    describe('Builder', function() {
      beforeEach(function() {
        var project;
        project = "" + (path.dirname(__filename)) + path.sep + "latex_project";
        atom.project.setPaths([project]);
        return pkg.latex.mainFile = "" + project + path.sep + "main.tex";
      });
      describe('build-after-save feature', function() {
        var builder, builder_;
        builder = builder_ = void 0;
        beforeEach(function() {
          builder = jasmine.createSpyObj('Builder', ['build']);
          builder_ = pkg.latex.builder;
          return pkg.latex.builder = builder;
        });
        afterEach(function() {
          pkg.latex.builder = builder_;
          return helper.restoreConfigs();
        });
        it('compile if current file is a .tex file', function() {
          var project;
          helper.setConfig('atom-latex.build_after_save', true);
          project = "" + (path.dirname(__filename)) + path.sep + "latex_project";
          return waitsForPromise(function() {
            return atom.workspace.open("" + project + path.sep + "input.tex").then(function(editor) {
              return Promise.resolve(editor.save());
            });
          }).then(function() {
            return expect(builder.build).toHaveBeenCalled();
          });
        });
        it('does nothing if config disabled', function() {
          var project;
          helper.setConfig('atom-latex.build_after_save', false);
          project = "" + (path.dirname(__filename)) + path.sep + "latex_project";
          return waitsForPromise(function() {
            return atom.workspace.open("" + project + path.sep + "input.tex").then(function(editor) {
              return Promise.resolve(editor.save());
            });
          }).then(function() {
            return expect(builder.build).not.toHaveBeenCalled();
          });
        });
        return it('does nothing if current file is not a .tex file', function() {
          var project;
          helper.setConfig('atom-latex.build_after_save', true);
          project = "" + (path.dirname(__filename)) + path.sep + "latex_project";
          return waitsForPromise(function() {
            return atom.workspace.open("" + project + path.sep + "dummy.file").then(function(editor) {
              return Promise.resolve(editor.save());
            });
          }).then(function() {
            return expect(builder.build).not.toHaveBeenCalled();
          });
        });
      });
      describe('toolchain feature', function() {
        var binCheck, binCheck_;
        binCheck = binCheck_ = void 0;
        beforeEach(function() {
          binCheck_ = pkg.latex.builder.binCheck;
          return spyOn(pkg.latex.builder, 'binCheck');
        });
        afterEach(function() {
          pkg.latex.builder.binCheck = binCheck_;
          return helper.restoreConfigs();
        });
        it('generates latexmk command when enabled auto', function() {
          helper.setConfig('atom-latex.toolchain', 'auto');
          helper.unsetConfig('atom-latex.latexmk_param');
          pkg.latex.builder.binCheck.andReturn(true);
          pkg.latex.builder.setCmds();
          return expect(pkg.latex.builder.cmds[0]).toBe('latexmk -synctex=1 -interaction=nonstopmode -file-line-error -pdf main');
        });
        it('generates custom command when enabled auto but without binary', function() {
          helper.setConfig('atom-latex.toolchain', 'auto');
          helper.unsetConfig('atom-latex.compiler');
          helper.unsetConfig('atom-latex.bibtex');
          helper.unsetConfig('atom-latex.compiler_param');
          helper.unsetConfig('atom-latex.custom_toolchain');
          pkg.latex.builder.binCheck.andReturn(false);
          pkg.latex.builder.setCmds();
          expect(pkg.latex.builder.cmds[0]).toBe('pdflatex -synctex=1 -interaction=nonstopmode -file-line-error main');
          return expect(pkg.latex.builder.cmds[1]).toBe('bibtex main');
        });
        it('generates latexmk command when enabled latexmk toolchain', function() {
          helper.setConfig('atom-latex.toolchain', 'latexmk toolchain');
          helper.unsetConfig('atom-latex.latexmk_param');
          pkg.latex.builder.binCheck.andReturn(true);
          pkg.latex.builder.setCmds();
          return expect(pkg.latex.builder.cmds[0]).toBe('latexmk -synctex=1 -interaction=nonstopmode -file-line-error -pdf main');
        });
        return it('generates custom command when enabled custom toolchain', function() {
          helper.setConfig('atom-latex.toolchain', 'custom toolchain');
          helper.unsetConfig('atom-latex.compiler');
          helper.unsetConfig('atom-latex.bibtex');
          helper.unsetConfig('atom-latex.compiler_param');
          helper.unsetConfig('atom-latex.custom_toolchain');
          pkg.latex.builder.binCheck.andReturn(false);
          pkg.latex.builder.setCmds();
          expect(pkg.latex.builder.cmds[0]).toBe('pdflatex -synctex=1 -interaction=nonstopmode -file-line-error main');
          return expect(pkg.latex.builder.cmds[1]).toBe('bibtex main');
        });
      });
      return describe('::build', function() {
        var execCmd, execCmd_, open, open_;
        execCmd = execCmd_ = open = open_ = void 0;
        beforeEach(function() {
          var stdout;
          waitsForPromise(function() {
            return atom.packages.activatePackage('status-bar');
          });
          open = jasmine.createSpy('open');
          stdout = jasmine.createSpy('stdout');
          execCmd = jasmine.createSpy('execCmd').andCallFake(function(cmd, cwd, fn) {
            fn();
            return {
              stdout: {
                on: function(data, fn) {
                  return stdout(data, fn);
                }
              }
            };
          });
          open_ = pkg.latex.viewer.openViewerNewWindow;
          pkg.latex.viewer.openViewerNewWindow = open;
          execCmd_ = pkg.latex.builder.execCmd;
          return pkg.latex.builder.execCmd = execCmd;
        });
        afterEach(function() {
          pkg.latex.viewer.openViewerNewWindow = open_;
          pkg.latex.builder.execCmd = execCmd_;
          return helper.restoreConfigs();
        });
        it('should execute all commands sequentially', function() {
          helper.setConfig('atom-latex.toolchain', 'custom toolchain');
          helper.unsetConfig('atom-latex.compiler');
          helper.unsetConfig('atom-latex.bibtex');
          helper.unsetConfig('atom-latex.compiler_param');
          helper.unsetConfig('atom-latex.custom_toolchain');
          helper.setConfig('atom-latex.preview_after_build', 'Do nothing');
          pkg.latex.builder.build();
          expect(execCmd.callCount).toBe(4);
          return expect(open).not.toHaveBeenCalled();
        });
        return it('should open preview when ready if enabled', function() {
          helper.setConfig('atom-latex.toolchain', 'custom toolchain');
          helper.unsetConfig('atom-latex.compiler');
          helper.unsetConfig('atom-latex.bibtex');
          helper.unsetConfig('atom-latex.compiler_param');
          helper.unsetConfig('atom-latex.custom_toolchain');
          helper.setConfig('atom-latex.preview_after_build', true);
          pkg.latex.builder.build();
          return expect(open).toHaveBeenCalled();
        });
      });
    });
    return describe('Manager', function() {
      describe('::fileMain', function() {
        it('should return false when no main file exists in project root', function() {
          var project, result;
          pkg.latex.mainFile = void 0;
          project = "" + (path.dirname(__filename));
          atom.project.setPaths([project]);
          result = pkg.latex.manager.findMain();
          expect(result).toBe(false);
          return expect(pkg.latex.mainFile).toBe(void 0);
        });
        return it('should set main file full path when it exists in project root', function() {
          var project, relative, result;
          pkg.latex.mainFile = void 0;
          project = "" + (path.dirname(__filename)) + path.sep + "latex_project";
          atom.project.setPaths([project]);
          result = pkg.latex.manager.findMain();
          relative = path.relative(project, pkg.latex.mainFile);
          expect(result).toBe(true);
          return expect(pkg.latex.mainFile).toBe("" + project + path.sep + "main.tex");
        });
      });
      return describe('::findAll', function() {
        return it('should return all input files recursively', function() {
          var project, result;
          project = "" + (path.dirname(__filename)) + path.sep + "latex_project";
          atom.project.setPaths([project]);
          pkg.latex.mainFile = "" + project + path.sep + "main.tex";
          result = pkg.latex.manager.findAll();
          expect(pkg.latex.texFiles.length).toBe(2);
          return expect(pkg.latex.bibFiles.length).toBe(0);
        });
      });
    });
  });

}).call(this);
